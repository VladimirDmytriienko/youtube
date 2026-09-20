"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  VideoItem,
  AuthStatus,
  HistoryRecord,
  VideoStatus,
  AppLang,
  AiStatus,
  AiGeneratedMetadata,
  ThumbnailAdvice,
  FrameCandidate,
  AiModelsResponse,
  AiSettingsResponse
} from "@/types";
import { apiFetchJson } from "@/lib/api";
import { toast } from "sonner";

// Keys
export const queryKeys = {
  videos: ["videos"] as const,
  calendar: ["calendar"] as const,
  auth: ["auth"] as const,
  aiStatus: ["aiStatus"] as const,
  aiModels: ["aiModels"] as const,
  aiSettings: ["aiSettings"] as const,
  history: (lang: string) => ["history", lang] as const,
};

// 1. Fetch Videos (auto-syncs on window focus and polls every 30s)
export function useVideos(lang?: AppLang) {
  return useQuery<VideoItem[]>({
    queryKey: queryKeys.videos,
    queryFn: async () => {
      return apiFetchJson<VideoItem[]>("/api/videos", {
        headers: lang ? { "Accept-Language": lang } : {},
      });
    },
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });
}

// 2. Fetch Calendar Map (auto-syncs on window focus and polls every 30s)
export function useCalendar(lang?: AppLang) {
  return useQuery<Record<string, VideoItem[]>>({
    queryKey: queryKeys.calendar,
    queryFn: async () => {
      return apiFetchJson<Record<string, VideoItem[]>>("/api/calendar", {
        headers: lang ? { "Accept-Language": lang } : {},
      });
    },
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });
}

// 3. Fetch Auth Status
export function useAuthStatus() {
  return useQuery<AuthStatus>({
    queryKey: queryKeys.auth,
    queryFn: async () => {
      return apiFetchJson<AuthStatus>("/api/auth/status");
    },
    staleTime: 1000 * 60, // 1 min
  });
}

// 4. Fetch History (auto-syncs on window focus and polls every 30s)
export function useHistory(lang: AppLang = "uk") {
  return useQuery<HistoryRecord[]>({
    queryKey: queryKeys.history(lang),
    queryFn: async () => {
      return apiFetchJson<HistoryRecord[]>("/api/history", {
        headers: { "Accept-Language": lang },
      });
    },
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });
}

// 5. Mutation: Update Video Status
export function useUpdateVideoStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      path,
      status,
      scheduled_for,
      title,
      custom_thumb_path,
    }: {
      path: string;
      status: VideoStatus;
      scheduled_for?: string | null;
      title?: string;
      custom_thumb_path?: string;
    }) => {
      return apiFetchJson("/api/video/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path,
          status,
          scheduled_for,
          title,
          custom_thumb_path,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.videos });
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar });
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });
}

// 6. Mutation: YouTube Schedule & Upload
export function useScheduleUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      video_path: string;
      title: string;
      description: string;
      tags: string[];
      privacy: string;
      publish_at?: string | null;
      is_shorts: boolean;
      default_lang: string;
      localizations?: Record<string, { title: string; description: string }>;
      custom_thumb_path?: string | null;
    }) => {
      return apiFetchJson<{ success: boolean; record: any }>("/api/youtube/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.videos });
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar });
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });
}

// 7. Mutation: Login / Switch Channel via Web OAuth
export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const data = await apiFetchJson<{ url?: string; detail?: string }>("/api/auth/url");
      if (!data?.url) {
        throw new Error(data?.detail || "Не вдалося отримати посилання для входу");
      }
      return data.url as string;
    },
    onSuccess: (authUrl: string) => {
      const width = 560;
      const height = 720;
      const left = typeof window !== "undefined" ? window.screenX + (window.outerWidth - width) / 2 : 100;
      const top = typeof window !== "undefined" ? window.screenY + (window.outerHeight - height) / 2 : 100;

      const popup = window.open(
        authUrl,
        "youtube_oauth_window",
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
      );

      if (!popup || popup.closed || typeof popup.closed === "undefined") {
        window.location.href = authUrl;
        return;
      }

      toast.info("Відкрито вікно Google OAuth. Оберіть свій YouTube канал.");

      // Poll status while authorizing to detect completion without cross-origin COOP violations
      const pollTimer = setInterval(async () => {
        try {
          const status = await apiFetchJson<AuthStatus>("/api/auth/status");
          if (status?.authenticated) {
            clearInterval(pollTimer);
            queryClient.invalidateQueries({ queryKey: queryKeys.auth });
            toast.success("Канал YouTube успішно підключено!");
          }
        } catch {
          // ignore transient poll error
        }
      }, 1500);

      const handleFocus = async () => {
        try {
          const status = await apiFetchJson<AuthStatus>("/api/auth/status");
          if (status?.authenticated) {
            clearInterval(pollTimer);
            window.removeEventListener("focus", handleFocus);
            queryClient.invalidateQueries({ queryKey: queryKeys.auth });
          }
        } catch {}
      };
      window.addEventListener("focus", handleFocus);

      setTimeout(() => {
        clearInterval(pollTimer);
        window.removeEventListener("focus", handleFocus);
      }, 180000);
    },
    onError: (err: any) => {
      toast.error("Помилка входу", { description: err?.message });
    },
  });
}

// 8. Mutation: Logout
export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return apiFetchJson("/api/auth/logout", { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth });
      toast.info("YouTube акаунт відключено");
    },
  });
}

// 9. Mutation: Delete Local Video File
export function useDeleteVideoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (path: string) => {
      return apiFetchJson<{ message?: string }>("/api/videos/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.videos });
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar });
      queryClient.invalidateQueries({ queryKey: ["history"] });
      toast.success(data?.message || "Файл успішно видалено");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Помилка видалення файлу");
    },
  });
}

// 10. Mutation: Force Status Synchronization
export function useSyncStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return apiFetchJson<{ total_synced: number }>("/api/videos/sync-status", { method: "POST" });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.videos });
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar });
      queryClient.invalidateQueries({ queryKey: ["history"] });
      if (data && data.total_synced > 0) {
        toast.success(`Оновлено статус ${data.total_synced} відео на 'Опубліковано'`);
      }
    },
  });
}

// 11. Fetch Gemini AI Status
export function useAiStatus() {
  return useQuery<AiStatus>({
    queryKey: queryKeys.aiStatus,
    queryFn: async () => {
      return apiFetchJson<AiStatus>("/api/ai/status");
    },
  });
}

// 12. Mutation: Save Gemini API Key
export function useSaveAiKeyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (api_key: string) => {
      return apiFetchJson("/api/ai/save-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiStatus });
      toast.success("Gemini API ключ збережено та перевірено!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Помилка збереження ключа");
    },
  });
}

// 13. Mutation: Test Gemini API Key
export function useTestAiKeyMutation() {
  return useMutation({
    mutationFn: async (api_key?: string) => {
      const data = await apiFetchJson<{ success?: boolean; error?: string; message?: string }>("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key }),
      });
      if (!data?.success) {
        throw new Error(data?.error || "Тест з'єднання не вдався");
      }
      return data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "З'єднання з Gemini успішне!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Помилка перевірки ключа");
    },
  });
}

// 14. Fetch Available AI Models
export function useAiModels() {
  return useQuery<AiModelsResponse>({
    queryKey: queryKeys.aiModels,
    queryFn: async () => {
      return apiFetchJson<AiModelsResponse>("/api/ai/models");
    },
  });
}

// 15. Fetch Current AI Settings
export function useAiSettings() {
  return useQuery<AiSettingsResponse>({
    queryKey: queryKeys.aiSettings,
    queryFn: async () => {
      return apiFetchJson<AiSettingsResponse>("/api/ai/settings");
    },
  });
}

// 16. Mutation: Save AI Settings
export function useSaveAiSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      vision_model?: string;
      text_model?: string;
      custom_vision_model?: string;
      custom_text_model?: string;
    }) => {
      return apiFetchJson<{ success: boolean; vision_model: string; text_model: string }>("/api/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiModels });
      queryClient.invalidateQueries({ queryKey: queryKeys.aiSettings });
      toast.success("Налаштування моделей ШІ успішно збережено!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Помилка збереження налаштувань моделей");
    },
  });
}

// 14. Mutation: Generate Metadata with Gemini
export function useGenerateAiMetadataMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string;
      description?: string;
      user_prompt?: string;
      is_shorts: boolean;
      include_frames?: boolean;
      frame_paths?: string[];
      dual_language?: boolean;
      languages?: string[];
      style?: string;
    }) => {
      const data = await apiFetchJson<{ data: any; usage?: any }>("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return { ...data.data, usage: data.usage } as AiGeneratedMetadata;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiStatus });
    },
  });
}

// 15. Mutation: Get Thumbnail Advice & Best Frame from Gemini
export function useThumbnailAdviceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string;
      user_prompt?: string;
      frame_paths: string[];
    }) => {
      const data = await apiFetchJson<{ data: any; usage?: any }>("/api/ai/thumbnail-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return { ...data.data, usage: data.usage } as ThumbnailAdvice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiStatus });
    },
  });
}

// 16. Mutation: Transcribe Voice Audio Prompt with Gemini
export function useTranscribeAudioMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const formData = new FormData();
      formData.append("file", audioBlob, "voice_prompt.webm");
      return apiFetchJson<{ success: boolean; text: string; model_used: string; usage?: any }>(
        "/api/ai/transcribe-audio",
        {
          method: "POST",
          body: formData,
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiStatus });
    },
  });
}

// 17. Mutation: Generate AI Thumbnail Image
export function useGenerateThumbnailMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string;
      description?: string;
      user_prompt?: string;
      is_shorts?: boolean;
      style?: string;
      video_path?: string;
      frame_paths?: string[];
    }) => {
      return apiFetchJson<{
        success: boolean;
        candidate: FrameCandidate;
        thumb_path: string;
        prompt_used: string;
        engine: string;
      }>("/api/ai/generate-thumbnail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiStatus });
    },
  });
}

