"use client";

import React from "react";
import {
  Sparkles,
  Bot,
  Mic,
  MicOff,
  Layers,
  Bell,
  Loader2,
  Film,
  Scissors,
  Sliders,
  Play,
  CalendarPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoItem, VideoTimelineData, ShortsPlan, PlannedShort } from "@/types";
import {
  VOICE_OPTIONS,
  DIRECTOR_PRESETS,
} from "./constants";
import { BatchScheduleModal } from "./BatchScheduleModal";

export interface AiDirectorStudioProps {
  activeVideo: VideoItem | null;
  shortsLanguage: "en" | "uk";
  onShortsLanguageChange: (lang: "en" | "uk") => void;
  selectedVoice: string;
  onSelectedVoiceChange: (voice: string) => void;
  targetShortsCount: number;
  onTargetShortsCountChange: (count: number) => void;
  scenarioPreset: string;
  onScenarioPresetChange: (preset: string) => void;
  userPrompt: string;
  onUserPromptChange: (prompt: string) => void;
  isRecordingVoice: boolean;
  onToggleVoiceRecord: () => void;
  withOutro: boolean;
  onWithOutroChange: (val: boolean) => void;
  outroStyle: string;
  onOutroStyleChange: (val: string) => void;
  outroBg: string;
  onOutroBgChange: (val: string) => void;
  isAnalyzing: boolean;
  analysisStatus: string;
  onAnalyzeAndPlan: () => void;
  timelineData: VideoTimelineData | null;
  shortsPlan: ShortsPlan | null;
  onShortsPlanChange: React.Dispatch<React.SetStateAction<ShortsPlan | null>>;
  renderingShortId: string | null;
  isBatchRendering: boolean;
  batchProgress: { current: number; total: number; title: string } | null;
  onRenderPlannedShort: (shortItem: PlannedShort) => void;
  onBatchRenderAll: () => void;
  onTuneInManual: (shortItem: PlannedShort) => void;
  onApplyOutro: (targetVideoPath?: string) => void;
  isApplyingOutro: boolean;
  onOpenPlayer: (path: string) => void;
  onOpenDrawer: (path: string, item?: PlannedShort) => void;
  onSetManualFromEvent: (startSec: number, endSec: number, title: string) => void;
  formatTime: (sec: number) => string;
}

export function AiDirectorStudio({
  activeVideo,
  shortsLanguage,
  onShortsLanguageChange,
  selectedVoice,
  onSelectedVoiceChange,
  targetShortsCount,
  onTargetShortsCountChange,
  scenarioPreset,
  onScenarioPresetChange,
  userPrompt,
  onUserPromptChange,
  isRecordingVoice,
  onToggleVoiceRecord,
  withOutro,
  onWithOutroChange,
  outroStyle,
  onOutroStyleChange,
  outroBg,
  onOutroBgChange,
  isAnalyzing,
  analysisStatus,
  onAnalyzeAndPlan,
  timelineData,
  shortsPlan,
  onShortsPlanChange,
  renderingShortId,
  isBatchRendering,
  batchProgress,
  onRenderPlannedShort,
  onBatchRenderAll,
  onTuneInManual,
  onApplyOutro,
  isApplyingOutro,
  onOpenPlayer,
  onOpenDrawer,
  onSetManualFromEvent,
  formatTime,
}: AiDirectorStudioProps) {
  const [isBatchScheduleOpen, setIsBatchScheduleOpen] = React.useState(false);
  const selectedPresetObj = DIRECTOR_PRESETS.find((p) => p.id === scenarioPreset) || DIRECTOR_PRESETS[0];
  const renderedShortsCount = shortsPlan?.shorts.filter((s) => !!s.rendered_path).length || 0;

  return (
    <div className="space-y-6">
      {/* Creator Guidance & Prompt Box */}
      <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-foreground">
              Універсальний ШІ-Режисер Shorts (Аналіз + Сценарій):
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Google Gemini + Edge-TTS
          </span>
        </div>

        {/* Language & Voice Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-background/60 border border-border/70">
          {/* Language Picker */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <span>🌍 Мова Shorts:</span>
              <span className="text-[10px] text-muted-foreground font-normal">(заголовки, сценарій, субтитри)</span>
            </label>
            <div className="flex rounded-lg p-1 bg-muted/50 border border-border gap-1">
              <button
                type="button"
                onClick={() => {
                  onShortsLanguageChange("en");
                  if (selectedVoice.startsWith("uk-")) {
                    onSelectedVoiceChange("en-US-GuyNeural");
                  }
                  if (
                    outroStyle === "ukrainian_native" ||
                    outroStyle === "ukrainian_red" ||
                    outroStyle === "minimal_dark_ua"
                  ) {
                    onOutroStyleChange("youtube_classic");
                  }
                }}
                className={`flex-1 py-1 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  shortsLanguage === "en"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>🇬🇧 English</span>
                <span className="text-[10px] opacity-80 font-normal">Global</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onShortsLanguageChange("uk");
                  onSelectedVoiceChange("uk-UA-OstapNeural");
                  if (outroStyle === "youtube_classic") {
                    onOutroStyleChange("ukrainian_native");
                  } else if (outroStyle === "minimal_dark") {
                    onOutroStyleChange("minimal_dark_ua");
                  }
                }}
                className={`flex-1 py-1 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  shortsLanguage === "uk"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>🇺🇦 Українська</span>
              </button>
            </div>
          </div>

          {/* Voice Style Picker */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-purple-400" />
              <span>ШІ-Голос та характер озвучки:</span>
            </label>
            <select
              value={selectedVoice}
              onChange={(e) => {
                const nextVoice = e.target.value;
                onSelectedVoiceChange(nextVoice);
                if (nextVoice.startsWith("uk-") && (outroStyle === "youtube_classic" || outroStyle === "minimal_dark")) {
                  onOutroStyleChange(outroStyle === "minimal_dark" ? "minimal_dark_ua" : "ukrainian_native");
                } else if (
                  nextVoice.startsWith("en-") &&
                  (outroStyle === "ukrainian_native" || outroStyle === "ukrainian_red" || outroStyle === "minimal_dark_ua")
                ) {
                  onOutroStyleChange(outroStyle === "minimal_dark_ua" ? "minimal_dark" : "youtube_classic");
                }
              }}
              className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-medium focus:ring-1 focus:ring-purple-500 outline-none transition cursor-pointer"
            >
              {VOICE_OPTIONS.filter((v) =>
                shortsLanguage === "en" ? v.lang === "en" : true
              ).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Target Shorts Count & Universal Director Scenario Preset */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-background/60 border border-border/70">
          {/* Target Count */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Кількість Shorts у пакеті:</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-normal">
                {targetShortsCount === 5
                  ? "⚡ Пакет на 5 шт."
                  : targetShortsCount === 0
                  ? "Авто (ШІ)"
                  : `${targetShortsCount} од.`}
              </span>
            </label>
            <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-muted/50 border border-border">
              {[
                { label: "1 Short", count: 1 },
                { label: "3 Shorts", count: 3 },
                { label: "⚡ 5 Shorts", count: 5 },
                { label: "Auto", count: 0 },
              ].map((p) => (
                <button
                  key={p.count}
                  type="button"
                  onClick={() => onTargetShortsCountChange(p.count)}
                  className={`py-1 px-1 rounded-md text-[11px] font-bold transition cursor-pointer text-center ${
                    targetShortsCount === p.count
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Universal Scenario Preset */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Режисерський пресет:</span>
              </label>
              <span className="text-[10px] font-semibold text-primary px-1.5 py-0.2 rounded bg-primary/10">
                {selectedPresetObj.badge}
              </span>
            </div>
            <select
              value={scenarioPreset}
              onChange={(e) => onScenarioPresetChange(e.target.value)}
              className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-medium focus:ring-1 focus:ring-indigo-500 outline-none transition cursor-pointer"
            >
              {DIRECTOR_PRESETS.map((dp) => (
                <option key={dp.id} value={dp.id}>
                  {dp.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground leading-tight pt-0.5">
              {selectedPresetObj.desc}
            </p>
          </div>
        </div>

        {/* Prompt input with microphone */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
            <span>Ваш задум / підказка для ШІ:</span>
            <span className="text-[10px] text-muted-foreground">Текст або мікрофон</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={userPrompt}
              onChange={(e) => onUserPromptChange(e.target.value)}
              placeholder={
                shortsLanguage === "en"
                  ? "e.g. Find the most insane tricks, clutch plays, and funny moments, create 5 viral shorts..."
                  : "Наприклад: Знайди найкрутіші трюки, епічні фейли та кульмінацію, зроби 5 вірусних шортсів..."
              }
              className="w-full h-11 rounded-xl border border-border bg-background pl-3.5 pr-12 text-xs focus:ring-1 focus:ring-purple-500 outline-none transition"
            />
            <button
              type="button"
              onClick={onToggleVoiceRecord}
              className={`absolute right-1.5 top-1.5 w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer ${
                isRecordingVoice
                  ? "bg-rose-500 text-white animate-pulse"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
              title="Голосовий ввід через мікрофон"
            >
              {isRecordingVoice ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Quick Prompt Ideas */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] text-muted-foreground font-medium">Швидкі ідеї:</span>
          {(shortsLanguage === "en"
            ? [
                "🔥 Top Viral Highlight",
                "😂 Epic Fail / Blooper",
                "⚡ Pro Skill & Insane Tricks",
                "🏆 Dramatic Climax & Finish",
                "🎯 Create 5 Distinct Shorts",
              ]
            : [
                "🔥 Головний вірусний момент",
                "😂 Епік фейл / курйоз",
                "⚡ Про-скіл та круті трюки",
                "🏆 Кульмінація та фінал",
                "🎯 Пакет з 5 Shorts",
              ]
          ).map((pill) => (
            <button
              key={pill}
              type="button"
              onClick={() => onUserPromptChange(pill)}
              className="px-2.5 py-1 rounded-full bg-background border border-border/80 hover:border-purple-500/50 text-[10px] font-medium text-foreground transition active:scale-95 cursor-pointer"
            >
              {pill}
            </button>
          ))}
        </div>

        {/* Outro CTA Setting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-background/60 border border-border/70">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={withOutro}
              onChange={(e) => onWithOutroChange(e.target.checked)}
              className="w-4 h-4 rounded accent-primary cursor-pointer"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-red-500" />
                  🔴 Живі кнопки YouTube (Like & Subscribe)
                </span>
                {withOutro && (
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Увімкнено
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Анімовані стікери YouTube у безпечній зоні знизу: плавна поява пілюль, потім тексту, пульсація та погойдування
              </p>
            </div>
          </label>

          {withOutro && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-background/80 border border-border/60">
              <span className="text-[10px] text-muted-foreground font-medium">
                📍 Безпечна зона знизу (H-h-200)
              </span>
              <div className="flex items-center gap-1.5 scale-90 origin-right">
                <span className="px-2 py-0.5 rounded-full bg-white text-black font-black text-[10px] shadow-xs">👍 LIKE</span>
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-black text-[10px] shadow-xs">▶ SUBSCRIBE</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Analyze Button */}
        <Button
          size="lg"
          disabled={!activeVideo || isAnalyzing}
          onClick={onAnalyzeAndPlan}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50 mt-2"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{analysisStatus || "ШІ аналізує відео та розробляє план Shorts..."}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>⚡ Проаналізувати та розбити на Shorts (Google Gemini)</span>
            </>
          )}
        </Button>
      </div>

      {/* Results: Timeline Analysis & Shorts Plan */}
      {shortsPlan && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Strategy Banner */}
          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 sm:p-5 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs sm:text-sm font-bold text-foreground">
                  Стратегія Shorts-продюсера ШІ
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                  Рекомендовано: {shortsPlan.recommended_count} Shorts
                </span>
              </div>
              <p className="text-xs text-foreground/90 leading-relaxed pt-1">
                {shortsPlan.reasoning}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {renderedShortsCount > 0 && (
                <Button
                  size="sm"
                  onClick={() => setIsBatchScheduleOpen(true)}
                  className="rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                  title="Запланувати всі готові Shorts на YouTube з індивідуальними датами та часом"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>Запланувати всі ({renderedShortsCount})</span>
                </Button>
              )}

              {shortsPlan.shorts.length > 1 && (
                <Button
                  size="sm"
                  disabled={isBatchRendering}
                  onClick={onBatchRenderAll}
                  className="rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 flex items-center gap-1.5 shadow cursor-pointer"
                >
                  {isBatchRendering ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Генерація...</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-3.5 h-3.5" />
                      <span>Створити всі ({shortsPlan.shorts.length})</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Batch Render Live Progress Banner */}
          {isBatchRendering && batchProgress && (
            <div className="rounded-2xl border border-indigo-500/50 bg-indigo-500/10 p-4 sm:p-5 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold text-indigo-300">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Пакетний рендеринг: [{batchProgress.current} з {batchProgress.total}]</span>
                </div>
                <span className="font-mono font-bold text-indigo-400">
                  {Math.round((batchProgress.current / batchProgress.total) * 100)}%
                </span>
              </div>
              <p className="text-xs text-foreground truncate">
                Створюється: <span className="font-semibold text-white">{batchProgress.title}</span>
              </p>
              <div className="w-full h-2 rounded-full bg-background/80 overflow-hidden border border-border">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 rounded-full"
                  style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Cards Grid for Recommended Shorts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shortsPlan.shorts.map((item) => {
              const isRenderingThis = renderingShortId === item.id;
              const isDone = !!item.rendered_path;

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border transition p-4 sm:p-5 flex flex-col justify-between space-y-4 bg-card ${
                    isDone
                      ? "border-emerald-500/50 bg-emerald-500/5 shadow-sm"
                      : "border-border hover:border-purple-500/40 shadow-sm"
                  }`}
                >
                  {/* Card Header */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                          {item.badge}
                        </span>
                        {item.segments && item.segments.length > 1 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                            🧩 {item.segments.length} сцени
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-secondary text-foreground">
                        {item.segments && item.segments.length > 1
                          ? `Монтаж (${Math.round(item.duration_sec)}с)`
                          : `${formatTime(item.start_sec)} - ${formatTime(item.end_sec)} (${Math.round(item.duration_sec)}с)`}
                      </span>
                    </div>

                    {/* Multi-segment breakdown chips */}
                    {item.segments && item.segments.length > 1 && (
                      <div className="p-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/20 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1">
                            🎬 Драматургія сцен ({item.segments.length}):
                          </span>
                          <span className="text-[9px] text-muted-foreground font-mono">
                            Разом: {Math.round(item.duration_sec)}с
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {item.segments.map((seg) => (
                            <div
                              key={seg.segment_index}
                              className="flex items-center justify-between gap-1.5 px-2 py-1 rounded-md bg-background/80 border border-border text-[10px]"
                              title={seg.scene_description || seg.label}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="font-semibold text-foreground truncate">
                                  {seg.label || `Сцена ${seg.segment_index}`}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 font-mono text-[10px] text-muted-foreground">
                                <span>{formatTime(seg.start_sec)}-{formatTime(seg.end_sec)}</span>
                                <span className="text-[9px] font-bold text-primary">({Math.round(seg.duration_sec)}с)</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Title Input */}
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">
                        Назва ролика:
                      </label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          onShortsPlanChange((prev) => {
                            if (!prev) return prev;
                            return {
                              ...prev,
                              shorts: prev.shorts.map((s) =>
                                s.id === item.id ? { ...s, title: val } : s
                              ),
                            };
                          });
                        }}
                        className="w-full h-9 rounded-lg border border-border bg-background px-2.5 text-xs font-bold text-foreground outline-none focus:border-primary"
                      />
                    </div>

                    {/* Hook & Rationale */}
                    <div className="p-2.5 rounded-lg bg-muted/40 text-[11px] space-y-1">
                      <p className="text-foreground font-medium">
                        <span className="text-amber-400 font-bold">Хук (перші 2с):</span> {item.hook}
                      </p>
                      <p className="text-muted-foreground text-[10px]">
                        {item.rationale}
                      </p>
                    </div>

                    {/* Voiceover Script Section */}
                    {item.voiceover_script && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-semibold text-foreground flex items-center gap-1.5">
                            <Mic className="w-3 h-3 text-purple-400" />
                            <span>
                              Сценарій озвучки ({shortsLanguage === "en" ? "English 🇬🇧" : "Українська 🇺🇦"}):
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 text-[9px] font-medium">
                              {VOICE_OPTIONS.find((v) => v.id === selectedVoice)?.name.split("(")[0].trim() || "ШІ"}
                            </span>
                          </label>
                          <label className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!item.with_voiceover}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                onShortsPlanChange((prev) => {
                                  if (!prev) return prev;
                                  return {
                                    ...prev,
                                    shorts: prev.shorts.map((s) =>
                                      s.id === item.id ? { ...s, with_voiceover: checked } : s
                                    ),
                                  };
                                });
                              }}
                              className="w-3 h-3 rounded accent-primary"
                            />
                            <span className="text-muted-foreground">Озвучити</span>
                          </label>
                        </div>

                        {item.with_voiceover && (
                          <textarea
                            rows={3}
                            value={item.voiceover_script}
                            onChange={(e) => {
                              const text = e.target.value;
                              onShortsPlanChange((prev) => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  shorts: prev.shorts.map((s) =>
                                    s.id === item.id ? { ...s, voiceover_script: text } : s
                                  ),
                                };
                              });
                            }}
                            className="w-full rounded-lg border border-border bg-background p-2 text-xs text-foreground outline-none focus:border-primary resize-none leading-relaxed"
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Actions Footer */}
                  <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onTuneInManual(item)}
                        className="h-8 px-2.5 rounded-lg border border-border hover:bg-muted text-[11px] font-medium text-foreground transition cursor-pointer flex items-center gap-1"
                        title="Відкрити цей відрізок у ручному конвертері"
                      >
                        <Sliders className="w-3 h-3 text-muted-foreground" />
                        <span>Кадрування</span>
                      </button>
                    </div>

                    {isDone ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onApplyOutro(item.rendered_path!)}
                          disabled={isApplyingOutro}
                          className="h-8 px-2.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                          title="Накласти Like & Subscribe аутро на цей Short"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <span>+Аутро</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenPlayer(item.rendered_path!)}
                          className="h-8 px-3 rounded-full bg-secondary hover:bg-accent text-xs font-semibold text-foreground flex items-center gap-1 transition cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Перегляд</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenDrawer(item.rendered_path!, item)}
                          className="h-8 px-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-sm"
                        >
                          <CalendarPlus className="w-3.5 h-3.5" />
                          <span>У розклад</span>
                        </button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        disabled={isRenderingThis || isBatchRendering}
                        onClick={() => onRenderPlannedShort(item)}
                        className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold px-4 h-8 flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
                      >
                        {isRenderingThis ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Створення 9:16...</span>
                          </>
                        ) : (
                          <>
                            <Scissors className="w-3.5 h-3.5" />
                            <span>Створити цей Short</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Breakdown Timeline from AI 1 */}
          {timelineData && timelineData.timeline_events?.length > 0 && (
            <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-sky-400" />
                  <h3 className="text-xs sm:text-sm font-bold text-foreground">
                    Хронологія та розбір відео (Google Gemini Vision):
                  </h3>
                </div>
                {timelineData.detected_game && (
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 text-[10px] font-bold border border-sky-500/20">
                    🎮 {timelineData.detected_game}
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {timelineData.summary}
              </p>

              <div className="space-y-2 pt-2">
                {timelineData.timeline_events.map((ev, i) => (
                  <div
                    key={i}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl bg-muted/20 border border-border/40 gap-2 text-xs"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-secondary shrink-0 text-foreground">
                        {formatTime(ev.start_sec)} - {formatTime(ev.end_sec)}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-foreground block truncate">
                          {ev.title}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {ev.details}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                        ★ {ev.intensity}/10
                      </span>
                      <button
                        type="button"
                        onClick={() => onSetManualFromEvent(ev.start_sec, ev.end_sec, ev.title)}
                        className="text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                      >
                        Обрізати вручну →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Batch Schedule Modal */}
      {shortsPlan && (
        <BatchScheduleModal
          isOpen={isBatchScheduleOpen}
          onClose={() => setIsBatchScheduleOpen(false)}
          shorts={shortsPlan.shorts}
          detectedGame={timelineData?.detected_game}
          shortsLanguage={shortsLanguage}
        />
      )}
    </div>
  );
}
