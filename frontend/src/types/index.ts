export type VideoStatus = 'planning' | 'scheduled' | 'posted';

export interface VideoLocalization {
  title?: string;
  description?: string;
  tags?: string[];
}

export interface VideoItem {
  filename: string;
  path: string;
  folder: string;
  size_mb: number;
  duration: number;
  duration_formatted: string;
  resolution: string;
  aspect_ratio: string;
  is_shorts: boolean;
  title: string;
  title_options: string[];
  description: string;
  tags: string[];
  status: VideoStatus;
  scheduled_for: string | null;
  youtube_url: string | null;
  default_lang?: string;
  localizations?: Record<string, VideoLocalization>;
  custom_thumb_path?: string;
}

export interface HistoryRecord {
  id: string;
  title: string;
  url?: string;
  is_shorts: boolean;
  status: VideoStatus;
  scheduled_for: string | null;
  updated_at: string;
  uploaded_at?: string;
  filename?: string;
  file?: string;
  file_path?: string;
  path?: string;
  youtube_url?: string;
}

export interface FrameCandidate {
  timestamp: number;
  formatted: string;
  thumb_url: string;
  thumb_path: string;
  is_ai_generated?: boolean;
  prompt_used?: string;
  engine?: string;
}

export interface AuthStatus {
  authenticated: boolean;
  channel_title?: string;
  channel_id?: string;
  channel_handle?: string;
  channel_avatar?: string;
  subscriber_count?: string | number;
  video_count?: string | number;
  custom_url?: string;
  has_secret?: boolean;
}

export type AppLang = 'uk' | 'en';

export interface AiTokenUsage {
  prompt_tokens: number;
  candidates_tokens: number;
  total_tokens: number;
}

export interface AiUsageRecentItem {
  feature: string;
  model: string;
  prompt_tokens: number;
  candidates_tokens: number;
  total_tokens: number;
  created_at: string;
}

export interface AiUsageStats {
  daily_limit?: number;
  today_tokens?: number;
  today_requests?: number;
  remaining_tokens?: number;
  remaining_percent?: number;
  used_percent?: number;
  total_requests: number;
  total_tokens: number;
  prompt_tokens: number;
  candidates_tokens: number;
  recent: AiUsageRecentItem[];
}

export interface AiStatus {
  has_key: boolean;
  masked_key: string;
  usage?: AiUsageStats;
}

export interface AiModelItem {
  id: string;
  name: string;
  badge: string;
  description: string;
  supports_vision: boolean;
  supports_text: boolean;
  context_window: string;
  speed: string;
}

export interface AiModelsResponse {
  models: AiModelItem[];
  active_vision_model: string;
  active_text_model: string;
  raw_vision_setting: string;
  raw_text_setting: string;
  custom_vision_model: string;
  custom_text_model: string;
}

export interface AiSettingsResponse {
  vision_model: string;
  text_model: string;
  raw_vision_setting: string;
  raw_text_setting: string;
  custom_vision_model: string;
  custom_text_model: string;
}

export type SupportedLanguageCode = "en" | "uk" | "es" | "de" | "pt" | "ja" | "pl";

export interface SupportedLanguageItem {
  code: SupportedLanguageCode;
  label: string;
  flag: string;
  name: string;
  highlight: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguageItem[] = [
  { code: "en", label: "EN", flag: "🇺🇸", name: "English", highlight: "Головна • Global Tier-1" },
  { code: "uk", label: "UA", flag: "🇺🇦", name: "Українська", highlight: "Рідна мова" },
  { code: "es", label: "ES", flag: "🇪🇸", name: "Español", highlight: "Топ-2 перегляди" },
  { code: "de", label: "DE", flag: "🇩🇪", name: "Deutsch", highlight: "Топ-1 CPM Європа" },
  { code: "pt", label: "PT", flag: "🇧🇷", name: "Português", highlight: "Топ-3 Shorts Бразилія" },
  { code: "ja", label: "JA", flag: "🇯🇵", name: "日本語", highlight: "Топ-3 Gaming Японія" },
  { code: "pl", label: "PL", flag: "🇵🇱", name: "Polski", highlight: "Геймінг Європи" },
];

export interface LanguageMetadata {
  title: string;
  description: string;
  tags: string[];
}

export interface AiGeneratedMetadata {
  titles: string[];
  category_id?: string;
  languages?: Record<string, LanguageMetadata>;
  uk?: LanguageMetadata;
  en?: LanguageMetadata;
  usage?: AiTokenUsage;
}

export interface ThumbnailAdvice {
  best_frame_index: number;
  reason: string;
  banner_text: string;
  design_tip: string;
  usage?: AiTokenUsage;
}

export interface TimelineEvent {
  start_sec: number;
  end_sec: number;
  title: string;
  intensity: number;
  type: string;
  details: string;
}

export interface VideoTimelineData {
  detected_game: string;
  summary: string;
  duration_sec: number;
  source_video: string;
  timeline_events: TimelineEvent[];
}

export interface ShortSegment {
  segment_index: number;
  start_sec: number;
  end_sec: number;
  duration_sec: number;
  label: string;
  scene_description?: string;
}

export interface PlannedShort {
  id: string;
  title: string;
  badge: string;
  concept_type: string;
  segments?: ShortSegment[];
  start_sec: number;
  end_sec: number;
  duration_sec: number;
  hook: string;
  rationale: string;
  voiceover_script?: string;
  recommended_style: "voice_and_subtitles" | "pure_game_audio";
  with_voiceover?: boolean;
  is_rendering?: boolean;
  rendered_path?: string;
}

export interface ShortsPlan {
  reasoning: string;
  recommended_count: number;
  shorts: PlannedShort[];
}

export interface PostFormData {
  metaLang: string;
  metaData: Record<string, { title: string; desc: string; tags: string }>;
  candidates: FrameCandidate[];
  selectedThumbPath: string | null;
  isMadeForKids: boolean;
  category: string;
  allowShortsRemix: boolean;
  manualStatus: VideoStatus;
  privacy: string;
  dateStr: string;
  timeStr: string;
}

export const createInitialPostFormData = (): PostFormData => ({
  metaLang: "en",
  metaData: {
    en: { title: "", desc: "", tags: "" },
    uk: { title: "", desc: "", tags: "" },
    es: { title: "", desc: "", tags: "" },
    de: { title: "", desc: "", tags: "" },
    pt: { title: "", desc: "", tags: "" },
    ja: { title: "", desc: "", tags: "" },
    pl: { title: "", desc: "", tags: "" },
  },
  candidates: [],
  selectedThumbPath: null,
  isMadeForKids: false,
  category: "20",
  allowShortsRemix: true,
  manualStatus: "planning",
  privacy: "scheduled",
  dateStr: "",
  timeStr: "15:00",
});

export interface OutroStyleDef {
  id: string;
  name: string;
  badge: string;
  lines: string[];
  accent: string;
  lang?: string;
  title: string;
  sub: string;
  btnSub: string;
  btnLike: string;
}

export interface TimelineSegment {
  id: string;
  sourcePath: string;
  sourceTitle: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  label?: string;
  volume?: number;
  speed?: number;
}

export interface ProjectMediaItem {
  id: string;
  filename: string;
  title: string;
  path: string;
  duration: number;
  duration_formatted: string;
  resolution: string;
  is_shorts: boolean;
  thumbnail_url?: string;
  isCustomBlob?: boolean;
}




