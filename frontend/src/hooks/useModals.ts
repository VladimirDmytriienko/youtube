"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NavTab } from "@/components/layout/Navigation";

// 1. PostDrawer Modal State in React Query Cache
export interface PostDrawerState {
  isOpen: boolean;
  isMinimized: boolean;
  videoPath: string | null;
  targetDate: string | null;
  initialMeta?: Record<string, { title: string; desc: string; tags: string }>;
  initialLang?: string;
}

const initialDrawerState: PostDrawerState = {
  isOpen: false,
  isMinimized: false,
  videoPath: null,
  targetDate: null,
  initialMeta: undefined,
  initialLang: undefined,
};

export const CLIENT_KEYS = {
  postDrawer: ["clientState", "modal", "postDrawer"] as const,
  videoPlayer: ["clientState", "modal", "videoPlayer"] as const,
  navigationTab: ["clientState", "navigationTab"] as const,
  converter: ["clientState", "converter"] as const,
  aiSettings: ["clientState", "modal", "aiSettings"] as const,
};

export function usePostDrawer() {
  const queryClient = useQueryClient();

  const { data = initialDrawerState } = useQuery<PostDrawerState>({
    queryKey: CLIENT_KEYS.postDrawer,
    queryFn: () => initialDrawerState,
    staleTime: Infinity,
    gcTime: Infinity,
    initialData: initialDrawerState,
  });

  const openDrawer = (
    videoPath: string | null = null,
    targetDate: string | null = null,
    initialMeta?: Record<string, { title: string; desc: string; tags: string }>,
    initialLang?: string
  ) => {
    queryClient.setQueryData<PostDrawerState>(CLIENT_KEYS.postDrawer, {
      isOpen: true,
      isMinimized: false,
      videoPath: videoPath || null,
      targetDate: targetDate || null,
      initialMeta: initialMeta || undefined,
      initialLang: initialLang || undefined,
    });
  };

  const closeDrawer = () => {
    queryClient.setQueryData<PostDrawerState>(CLIENT_KEYS.postDrawer, {
      isOpen: false,
      isMinimized: false,
      videoPath: null,
      targetDate: null,
    });
  };

  const minimizeDrawer = () => {
    queryClient.setQueryData<PostDrawerState>(CLIENT_KEYS.postDrawer, (prev = initialDrawerState) => ({
      ...prev,
      isOpen: true,
      isMinimized: true,
    }));
  };

  const restoreDrawer = () => {
    queryClient.setQueryData<PostDrawerState>(CLIENT_KEYS.postDrawer, (prev = initialDrawerState) => ({
      ...prev,
      isOpen: true,
      isMinimized: false,
    }));
  };

  const toggleMinimize = () => {
    queryClient.setQueryData<PostDrawerState>(CLIENT_KEYS.postDrawer, (prev = initialDrawerState) => ({
      ...prev,
      isMinimized: !prev.isMinimized,
    }));
  };

  return {
    isOpen: data.isOpen,
    isMinimized: !!data.isMinimized,
    videoPath: data.videoPath,
    targetDate: data.targetDate,
    initialMeta: data.initialMeta,
    initialLang: data.initialLang,
    openDrawer,
    closeDrawer,
    minimizeDrawer,
    restoreDrawer,
    toggleMinimize,
  };
}

// 2. Video Player Modal State in React Query Cache
export interface VideoPlayerState {
  isOpen: boolean;
  videoPath: string | null;
}

const initialPlayerState: VideoPlayerState = {
  isOpen: false,
  videoPath: null,
};

export function useVideoPlayer() {
  const queryClient = useQueryClient();

  const { data = initialPlayerState } = useQuery<VideoPlayerState>({
    queryKey: CLIENT_KEYS.videoPlayer,
    queryFn: () => initialPlayerState,
    staleTime: Infinity,
    gcTime: Infinity,
    initialData: initialPlayerState,
  });

  const openPlayer = (videoPath: string) => {
    queryClient.setQueryData<VideoPlayerState>(CLIENT_KEYS.videoPlayer, {
      isOpen: true,
      videoPath,
    });
  };

  const closePlayer = () => {
    queryClient.setQueryData<VideoPlayerState>(CLIENT_KEYS.videoPlayer, {
      isOpen: false,
      videoPath: null,
    });
  };

  return {
    isOpen: data.isOpen,
    videoPath: data.videoPath,
    openPlayer,
    closePlayer,
  };
}

// 3. Navigation Tab Client State
export function useNavigationTab() {
  const queryClient = useQueryClient();

  const { data: currentTab = "library" } = useQuery<NavTab>({
    queryKey: CLIENT_KEYS.navigationTab,
    queryFn: () => "library",
    staleTime: Infinity,
    gcTime: Infinity,
    initialData: "library",
  });

  const setTab = (tab: NavTab) => {
    queryClient.setQueryData<NavTab>(CLIENT_KEYS.navigationTab, tab);
  };

  return {
    currentTab,
    setTab,
  };
}

// 4. Converter Tab Video Selection Client State
export function useConverterState() {
  const queryClient = useQueryClient();

  const { data = { videoPath: null } } = useQuery<{ videoPath: string | null }>({
    queryKey: CLIENT_KEYS.converter,
    queryFn: () => ({ videoPath: null }),
    staleTime: Infinity,
    gcTime: Infinity,
    initialData: { videoPath: null },
  });

  const selectForConversion = (videoPath: string) => {
    queryClient.setQueryData<{ videoPath: string | null }>(CLIENT_KEYS.converter, {
      videoPath,
    });
  };

  return {
    selectedPath: data.videoPath,
    selectForConversion,
  };
}

// 5. AI Settings Modal State
export function useAiSettingsModal() {
  const queryClient = useQueryClient();

  const { data = { isOpen: false } } = useQuery<{ isOpen: boolean }>({
    queryKey: CLIENT_KEYS.aiSettings,
    queryFn: () => ({ isOpen: false }),
    staleTime: Infinity,
    gcTime: Infinity,
    initialData: { isOpen: false },
  });

  const openAiSettings = () => {
    queryClient.setQueryData<{ isOpen: boolean }>(CLIENT_KEYS.aiSettings, { isOpen: true });
  };

  const closeAiSettings = () => {
    queryClient.setQueryData<{ isOpen: boolean }>(CLIENT_KEYS.aiSettings, { isOpen: false });
  };

  return {
    isOpen: data.isOpen,
    openAiSettings,
    closeAiSettings,
  };
}
