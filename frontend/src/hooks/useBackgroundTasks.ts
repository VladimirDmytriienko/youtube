"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetchJson } from "@/lib/api";
import { queryKeys } from "@/hooks/useApi";
import { toast } from "sonner";

export interface BackgroundUploadTask {
  id: string;
  videoPath: string;
  title: string;
  isShorts: boolean;
  privacy: string;
  publishAt?: string | null;
  archiveAfterPost?: boolean;
  status: "uploading" | "success" | "error";
  startedAt: number;
  error?: string;
  youtubeUrl?: string;
  youtubeId?: string;
}

export interface UploadPayload {
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
  archiveAfterPost?: boolean;
}

const BG_TASKS_KEY = ["clientState", "backgroundTasks"] as const;

export function useBackgroundTasks() {
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery<BackgroundUploadTask[]>({
    queryKey: BG_TASKS_KEY,
    queryFn: () => [],
    staleTime: Infinity,
    gcTime: Infinity,
    initialData: [],
  });

  const activeUploadsCount = tasks.filter((t) => t.status === "uploading").length;

  const startUpload = async (payload: UploadPayload) => {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newTask: BackgroundUploadTask = {
      id: taskId,
      videoPath: payload.video_path,
      title: payload.title,
      isShorts: payload.is_shorts,
      privacy: payload.privacy,
      publishAt: payload.publish_at,
      archiveAfterPost: payload.archiveAfterPost,
      status: "uploading",
      startedAt: Date.now(),
    };

    // Add to list
    queryClient.setQueryData<BackgroundUploadTask[]>(BG_TASKS_KEY, (prev = []) => [
      ...prev.filter((t) => t.videoPath !== payload.video_path),
      newTask,
    ]);

    toast.info(`🚀 Завантаження на YouTube розпочато у фоні!`, {
      description: `"${payload.title.slice(0, 45)}" обробляється. Ви можете працювати з іншими шортсами.`,
      duration: 5000,
    });

    try {
      const res = await apiFetchJson<{ success: boolean; record: any }>("/api/youtube/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_path: payload.video_path,
          title: payload.title,
          description: payload.description,
          tags: payload.tags,
          privacy: payload.privacy,
          publish_at: payload.publish_at,
          is_shorts: payload.is_shorts,
          default_lang: payload.default_lang,
          localizations: payload.localizations,
          custom_thumb_path: payload.custom_thumb_path,
        }),
      });

      const ytUrl = res.record?.youtube_url || res.record?.url;
      const ytId = res.record?.youtube_id || res.record?.id;

      // Update task status
      queryClient.setQueryData<BackgroundUploadTask[]>(BG_TASKS_KEY, (prev = []) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: "success", youtubeUrl: ytUrl, youtubeId: ytId }
            : t
        )
      );

      // Invalidate views
      queryClient.invalidateQueries({ queryKey: queryKeys.videos });
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar });
      queryClient.invalidateQueries({ queryKey: ["history"] });

      // Auto-archive if requested
      if (payload.archiveAfterPost) {
        try {
          await apiFetchJson("/api/videos/archive", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: payload.video_path }),
          });
          queryClient.invalidateQueries({ queryKey: queryKeys.videos });
        } catch (e: any) {
          console.warn("Auto-archive after upload error:", e);
        }
      }

      toast.success(`🎉 Відео "${payload.title.slice(0, 35)}" успішно завантажено на YouTube!`, {
        description: payload.publish_at
          ? `Заплановано на ${payload.publish_at.slice(0, 16).replace("T", " ")}`
          : "Відео доступне на каналі.",
        action: ytUrl
          ? {
              label: "Відкрити ↗",
              onClick: () => window.open(ytUrl, "_blank"),
            }
          : undefined,
        duration: 8000,
      });

      return { success: true, record: res.record };
    } catch (err: any) {
      const errorMsg = err?.message || "Помилка завантаження відео на YouTube";

      // Mark task as error
      queryClient.setQueryData<BackgroundUploadTask[]>(BG_TASKS_KEY, (prev = []) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: "error", error: errorMsg } : t))
      );

      toast.error(`Помилка публікації "${payload.title.slice(0, 30)}"`, {
        description: errorMsg,
        duration: 8000,
      });

      throw err;
    }
  };

  const dismissTask = (id: string) => {
    queryClient.setQueryData<BackgroundUploadTask[]>(BG_TASKS_KEY, (prev = []) =>
      prev.filter((t) => t.id !== id)
    );
  };

  const clearCompleted = () => {
    queryClient.setQueryData<BackgroundUploadTask[]>(BG_TASKS_KEY, (prev = []) =>
      prev.filter((t) => t.status === "uploading")
    );
  };

  return {
    tasks,
    activeUploadsCount,
    startUpload,
    dismissTask,
    clearCompleted,
  };
}
