"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Film, Sparkles, Bot, Sliders } from "lucide-react";
import { VideoTimelineData, ShortsPlan, PlannedShort } from "@/types";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { useVideos } from "@/hooks/useApi";
import { usePostDrawer, useVideoPlayer, useConverterState } from "@/hooks/useModals";
import { apiFetchJson, getThumbnailUrl } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AiDirectorStudio } from "../converter/AiDirectorStudio";
import { ManualCropControls } from "../converter/ManualCropControls";
import { VideoPreviewPlayer } from "../converter/VideoPreviewPlayer";

export interface ConverterTabProps {
  initialVideoPath?: string | null;
}

export function ConverterTab({ initialVideoPath }: ConverterTabProps = {}) {
  const { lang, tr } = useAppLanguage();
  const { data: videos = [] } = useVideos(lang);
  const { selectedPath: storeVideoPath } = useConverterState();
  const { openPlayer } = useVideoPlayer();
  const { openDrawer } = usePostDrawer();
  const queryClient = useQueryClient();

  const onConversionDone = () => {
    queryClient.invalidateQueries({ queryKey: ["videos"] });
    queryClient.invalidateQueries({ queryKey: ["calendar"] });
  };

  // 16:9 regular landscape videos
  const regularVideos = useMemo(() => videos.filter((v) => !v.is_shorts), [videos]);

  // Active Mode: 'ai' (AI Shorts Studio) vs 'manual' (Manual Cropping)
  const [tabMode, setTabMode] = useState<"ai" | "manual">("ai");

  // Video Selection
  const [selectedPath, setSelectedPath] = useState<string>("");

  // AI Pipeline State
  const [userPrompt, setUserPrompt] = useState<string>("");
  const [shortsLanguage, setShortsLanguage] = useState<"en" | "uk">("en");
  const [selectedVoice, setSelectedVoice] = useState<string>("en-US-GuyNeural");
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [targetShortsCount, setTargetShortsCount] = useState<number>(5);
  const [scenarioPreset, setScenarioPreset] = useState<string>("diverse_mix");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>("");
  const [timelineData, setTimelineData] = useState<VideoTimelineData | null>(null);
  const [shortsPlan, setShortsPlan] = useState<ShortsPlan | null>(null);
  const [renderingShortId, setRenderingShortId] = useState<string | null>(null);
  const [isBatchRendering, setIsBatchRendering] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; title: string } | null>(null);

  // Manual Converter Controls State
  const [startTime, setStartTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(30);
  const [zoom, setZoom] = useState<number>(115);
  const [yPosPercent, setYPosPercent] = useState<number>(50);
  const [blurRadius, setBlurRadius] = useState<number>(25);
  const [dimPercent, setDimPercent] = useState<number>(20);
  const [manualTitle, setManualTitle] = useState<string>("");
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [convertedResult, setConvertedResult] = useState<{ path: string; title: string } | null>(null);

  // Outro CTA State
  const [withOutro, setWithOutro] = useState<boolean>(true);
  const [outroStyle, setOutroStyle] = useState<string>("youtube_animated_pills");
  const [outroMode, setOutroMode] = useState<string>("bottom_floating");
  const [outroBg, setOutroBg] = useState<string>("deep_black");
  const [isApplyingOutro, setIsApplyingOutro] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const target = initialVideoPath || storeVideoPath;
    if (target && regularVideos.some((v) => v.path === target)) {
      setSelectedPath(target);
    } else if (regularVideos.length > 0 && !selectedPath) {
      setSelectedPath(regularVideos[0].path);
    }
  }, [initialVideoPath, storeVideoPath, regularVideos, selectedPath]);

  const activeVideo = useMemo(
    () => regularVideos.find((v) => v.path === selectedPath) || null,
    [regularVideos, selectedPath]
  );

  useEffect(() => {
    if (activeVideo) {
      const baseName = activeVideo.filename.replace(/\.mp4$/i, "");
      setManualTitle(`${activeVideo.title || baseName} #Shorts`);
    }
  }, [activeVideo]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // 1. Voice prompt recording
  const handleToggleVoiceRecord = async () => {
    if (isRecordingVoice) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setIsRecordingVoice(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (audioBlob.size < 500) return;

        toast.info("Розпізнавання голосу через Gemini...");
        try {
          const formData = new FormData();
          formData.append("file", audioBlob, "voice.webm");
          const res = await fetch("http://localhost:8000/api/ai/transcribe-audio", {
            method: "POST",
            body: formData,
          });
          const json = await res.json();
          if (json.text) {
            setUserPrompt((prev) => (prev ? `${prev} ${json.text}` : json.text));
            toast.success("Голос розпізнано!");
          }
        } catch (err: any) {
          toast.error("Помилка розпізнавання голосу", { description: err.message });
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecordingVoice(true);
      toast.info("Запис голосу розпочато... Натисніть ще раз, щоб завершити.");
    } catch (err) {
      toast.error("Мікрофон недоступний або доступ заблоковано.");
    }
  };

  // 2. AI Video Analysis & Shorts Planning Pipeline
  const handleAnalyzeAndPlan = async () => {
    if (!activeVideo) {
      toast.error("Будь ласка, оберіть 16:9 відео зі списку.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStatus("Етап 1: Gemini аналізує відеоряд та таймлайн...");
    try {
      const samplesCount = (activeVideo.duration && activeVideo.duration > 600) ? 60 : 40;
      const data = await apiFetchJson<{
        success: boolean;
        timeline: VideoTimelineData;
        plan: ShortsPlan;
      }>("/api/ai/analyze-and-plan-shorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_path: activeVideo.path,
          user_prompt: userPrompt.trim() || undefined,
          samples: samplesCount,
          language: shortsLanguage,
          target_count: targetShortsCount,
          scenario_preset: scenarioPreset,
        }),
      });

      if (data.success) {
        setTimelineData(data.timeline);
        const enhancedPlan = {
          ...data.plan,
          shorts: data.plan.shorts.map((s) => ({
            ...s,
            with_voiceover: s.recommended_style === "voice_and_subtitles",
          })),
        };
        setShortsPlan(enhancedPlan);
        toast.success(`ШІ проаналізував відео! Запропоновано ${data.plan.recommended_count} Shorts (${shortsLanguage.toUpperCase()}).`);
      }
    } catch (err: any) {
      toast.error("Помилка аналізу відео", { description: err.message });
    } finally {
      setIsAnalyzing(false);
      setAnalysisStatus("");
    }
  };

  // 3. Render a single planned Short
  const handleRenderPlannedShort = async (shortItem: PlannedShort) => {
    if (!activeVideo) return;
    setRenderingShortId(shortItem.id);

    try {
      const res = await apiFetchJson<{
        success: boolean;
        path: string;
        filename: string;
        title: string;
        description?: string;
        tags?: string[];
        localizations?: Record<string, any>;
        default_lang?: string;
      }>("/api/ai/render-planned-short", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_path: activeVideo.path,
          start_sec: shortItem.start_sec,
          end_sec: shortItem.end_sec,
          title: shortItem.title,
          segments: shortItem.segments,
          with_voiceover: !!shortItem.with_voiceover,
          voiceover_script: shortItem.voiceover_script || undefined,
          voice: selectedVoice,
          zoom: zoom / 100,
          y_pos: yPosPercent / 100,
          blur_radius: blurRadius,
          dim: dimPercent / 100,
          with_outro: withOutro,
          outro_style: outroStyle,
          outro_mode: outroMode,
          outro_bg: outroBg,
          hook: shortItem.hook,
          rationale: shortItem.rationale,
          detected_game: timelineData?.detected_game,
          badge: shortItem.badge,
          language: shortsLanguage,
        }),
      });

      if (res.success) {
        toast.success(`Short створено: ${res.filename}!`);
        setShortsPlan((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            shorts: prev.shorts.map((s) =>
              s.id === shortItem.id
                ? {
                    ...s,
                    rendered_path: res.path,
                    rendered_description: res.description,
                    rendered_tags: res.tags,
                    rendered_localizations: res.localizations,
                    rendered_default_lang: res.default_lang,
                  }
                : s
            ),
          };
        });
        onConversionDone();
      }
    } catch (err: any) {
      toast.error("Помилка рендеру Short", { description: err.message });
    } finally {
      setRenderingShortId(null);
    }
  };

  const handleOpenDrawerFromStudio = (path: string, item?: PlannedShort) => {
    let initialMeta: Record<string, { title: string; desc: string; tags: string }> | undefined = undefined;

    if (item) {
      const cleanTitle = item.title.includes("#Shorts") ? item.title : `${item.title} #Shorts`;
      const detectedGame = timelineData?.detected_game || "";

      // Ukrainian version
      const ukDesc = item.rendered_description && item.rendered_default_lang === "uk"
        ? item.rendered_description
        : (item.rendered_localizations?.uk?.description || (
            `⚡ ${item.hook || "Дивіться яскравий момент!"}\n\n${item.voiceover_script || item.rationale || ""}\n\n${detectedGame ? `🎮 Гра: ${detectedGame}\n` : ""}💬 Як вам цей момент? Пишіть у коментарях!\n🔔 Підписуйтесь на канал!\n\n#Shorts #Хайлайти #Відео #Геймінг`
          ));
      const ukTags = (item.rendered_tags && item.rendered_default_lang === "uk")
        ? item.rendered_tags.join(", ")
        : (item.rendered_localizations?.uk?.tags ? (Array.isArray(item.rendered_localizations.uk.tags) ? item.rendered_localizations.uk.tags.join(", ") : item.rendered_localizations.uk.tags) : `Shorts, Хайлайти, Відео, ${detectedGame || "Геймінг"}`);

      // English version
      const enDesc = item.rendered_description && item.rendered_default_lang === "en"
        ? item.rendered_description
        : (item.rendered_localizations?.en?.description || (
            `⚡ ${item.hook || "Check out this highlight!"}\n\n${item.voiceover_script || item.rationale || ""}\n\n${detectedGame ? `🎮 Game: ${detectedGame}\n` : ""}💬 What do you think about this moment? Leave a comment below!\n🔔 Subscribe for more daily shorts!\n\n#Shorts #Highlights #Gaming #Viral`
          ));
      const enTags = (item.rendered_tags && item.rendered_default_lang === "en")
        ? item.rendered_tags.join(", ")
        : (item.rendered_localizations?.en?.tags ? (Array.isArray(item.rendered_localizations.en.tags) ? item.rendered_localizations.en.tags.join(", ") : item.rendered_localizations.en.tags) : `Shorts, Highlights, Gaming, Viral, ${detectedGame || "Gaming"}`);

      initialMeta = {
        en: {
          title: item.rendered_localizations?.en?.title || cleanTitle,
          desc: enDesc,
          tags: enTags,
        },
        uk: {
          title: item.rendered_localizations?.uk?.title || cleanTitle,
          desc: ukDesc,
          tags: ukTags,
        },
        es: { title: "", desc: "", tags: "" },
        de: { title: "", desc: "", tags: "" },
        pt: { title: "", desc: "", tags: "" },
        ja: { title: "", desc: "", tags: "" },
        pl: { title: "", desc: "", tags: "" },
      };
    }

    openDrawer(path, null, initialMeta, shortsLanguage);
  };

  // 4. Batch render all recommended Shorts
  const handleBatchRenderAll = async () => {
    if (!shortsPlan || !activeVideo) return;
    setIsBatchRendering(true);
    const unrendered = shortsPlan.shorts.filter((s) => !s.rendered_path);
    const totalToRender = unrendered.length;
    let count = 0;

    for (let i = 0; i < unrendered.length; i++) {
      const shortItem = unrendered[i];
      setBatchProgress({
        current: i + 1,
        total: totalToRender,
        title: shortItem.title,
      });
      toast.info(`[${i + 1}/${totalToRender}] Рендеринг: ${shortItem.title}...`);
      try {
        await handleRenderPlannedShort(shortItem);
        count++;
      } catch (err) {
        // continue with next
      }
    }

    setBatchProgress(null);
    setIsBatchRendering(false);
    toast.success(`Пакетну генерацію завершено! Створено ${count} Shorts.`);
  };

  // 5. Manual conversion run
  const handleRunConversion = async () => {
    if (!activeVideo) {
      toast.error(tr.drawer.selectVideoErr);
      return;
    }

    setIsConverting(true);
    toast.info(tr.toasts.convertStart, { description: tr.toasts.convertProcess });

    try {
      const data = await apiFetchJson<{ path: string; filename: string; title: string }>("/api/convert-to-shorts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": lang,
        },
        body: JSON.stringify({
          source_path: activeVideo.path,
          start_time: startTime,
          duration: duration,
          zoom: zoom / 100,
          y_position: yPosPercent / 100,
          blur_radius: blurRadius,
          dim: dimPercent / 100,
          title: manualTitle.trim(),
          lang: lang,
          with_outro: withOutro,
          outro_style: outroStyle,
          outro_mode: outroMode,
          outro_bg: outroBg,
        }),
      });

      toast.success(tr.toasts.convertDone, {
        description: tr.toasts.convertSuccess.replace("{file}", data.filename),
      });
      setConvertedResult({ path: data.path, title: data.title });
      onConversionDone();
    } catch (err: any) {
      toast.error(tr.toasts.error, { description: err.message });
    } finally {
      setIsConverting(false);
    }
  };

  // 6. Direct 1-Click Outro Application
  const handleApplyOutro = async (targetVideoPath?: string) => {
    const path = targetVideoPath || activeVideo?.path;
    if (!path) {
      toast.error("Оберіть відео для додавання аутро.");
      return;
    }

    setIsApplyingOutro(true);
    toast.info("Накладання картки Like & Subscribe та переходу в темряву...");
    try {
      const res = await apiFetchJson<{
        success: boolean;
        path: string;
        filename: string;
        render_time_sec: number;
      }>("/api/video/apply-outro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_path: path,
          style_key: outroStyle,
          mode: outroMode,
          bg_mode: outroBg,
          outro_duration: 2.8,
          lang: shortsLanguage,
        }),
      });

      if (res.success) {
        toast.success(`Like & Subscribe аутро успішно створено (${res.render_time_sec}с)!`, {
          description: res.filename,
        });
        setConvertedResult({ path: res.path, title: res.filename });
        onConversionDone();
      }
    } catch (err: any) {
      toast.error("Помилка накладання аутро", { description: err.message });
    } finally {
      setIsApplyingOutro(false);
    }
  };

  // Apply short timecode to manual view
  const handleTuneInManual = (shortItem: PlannedShort) => {
    setStartTime(Math.floor(shortItem.start_sec));
    setDuration(Math.round(shortItem.duration_sec));
    setManualTitle(shortItem.title);
    setTabMode("manual");
    toast.info(`Таймкод [${formatTime(shortItem.start_sec)} - ${formatTime(shortItem.end_sec)}] застосовано до ручного кадрування`);
  };

  // Set manual parameters from timeline event
  const handleSetManualFromEvent = (startSec: number, endSec: number, title: string) => {
    setStartTime(Math.floor(startSec));
    setDuration(Math.max(15, Math.min(60, Math.round(endSec - startSec))));
    setManualTitle(`${title} #Shorts`);
    setTabMode("manual");
  };

  const thumbUrl = activeVideo ? getThumbnailUrl(activeVideo.path) : "";

  return (
    <div className="space-y-6">
      {/* 1. Header with Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Sparkles className="w-3 h-3 text-purple-400" />
              Dual-AI Studio
            </span>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              ШІ-Студія Shorts (16:9 → 9:16)
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Аналіз відеоряду через Gemini Vision, універсальні режисерські сценарії та автоматична нарізка Shorts.
          </p>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-muted/40 border border-border/50 shrink-0">
          <button
            type="button"
            onClick={() => setTabMode("ai")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              tabMode === "ai"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-purple-400" />
            <span>ШІ-Автопілот</span>
          </button>
          <button
            type="button"
            onClick={() => setTabMode("manual")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              tabMode === "manual"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <span>Ручне кадрування</span>
          </button>
        </div>
      </div>

      {/* 2. Global Video Selector */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Film className="w-4 h-4 text-sky-400" />
            <span>Вихідне альбомне відео (16:9):</span>
          </label>
          {activeVideo && (
            <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
              <span className="bg-secondary px-2 py-0.5 rounded text-foreground font-semibold">
                {activeVideo.resolution}
              </span>
              <span>
                Тривалість: <strong className="text-foreground">{activeVideo.duration_formatted}</strong>
              </span>
            </div>
          )}
        </div>

        <select
          value={selectedPath}
          onChange={(e) => {
            setSelectedPath(e.target.value);
            setTimelineData(null);
            setShortsPlan(null);
          }}
          className="w-full h-11 rounded-xl border border-border bg-background px-3.5 text-xs font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none transition cursor-pointer"
        >
          <option value="">Оберіть відео для аналізу...</option>
          {regularVideos.map((v) => (
            <option key={v.path} value={v.path}>
              {v.filename} ({v.resolution}, {v.duration_formatted})
            </option>
          ))}
        </select>
      </div>

      {/* MODE 1: AI SHORTS STUDIO */}
      {tabMode === "ai" && (
        <AiDirectorStudio
          activeVideo={activeVideo}
          shortsLanguage={shortsLanguage}
          onShortsLanguageChange={setShortsLanguage}
          selectedVoice={selectedVoice}
          onSelectedVoiceChange={setSelectedVoice}
          targetShortsCount={targetShortsCount}
          onTargetShortsCountChange={setTargetShortsCount}
          scenarioPreset={scenarioPreset}
          onScenarioPresetChange={setScenarioPreset}
          userPrompt={userPrompt}
          onUserPromptChange={setUserPrompt}
          isRecordingVoice={isRecordingVoice}
          onToggleVoiceRecord={handleToggleVoiceRecord}
          withOutro={withOutro}
          onWithOutroChange={setWithOutro}
          outroStyle={outroStyle}
          onOutroStyleChange={setOutroStyle}
          outroBg={outroBg}
          onOutroBgChange={setOutroBg}
          isAnalyzing={isAnalyzing}
          analysisStatus={analysisStatus}
          onAnalyzeAndPlan={handleAnalyzeAndPlan}
          timelineData={timelineData}
          shortsPlan={shortsPlan}
          onShortsPlanChange={setShortsPlan}
          renderingShortId={renderingShortId}
          isBatchRendering={isBatchRendering}
          batchProgress={batchProgress}
          onRenderPlannedShort={handleRenderPlannedShort}
          onBatchRenderAll={handleBatchRenderAll}
          onTuneInManual={handleTuneInManual}
          onApplyOutro={handleApplyOutro}
          isApplyingOutro={isApplyingOutro}
          onOpenPlayer={openPlayer}
          onOpenDrawer={handleOpenDrawerFromStudio}
          onSetManualFromEvent={handleSetManualFromEvent}
          formatTime={formatTime}
        />
      )}

      {/* MODE 2: MANUAL CROP STUDIO */}
      {tabMode === "manual" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7">
            <ManualCropControls
              startTime={startTime}
              onStartTimeChange={setStartTime}
              duration={duration}
              onDurationChange={setDuration}
              zoom={zoom}
              onZoomChange={setZoom}
              yPosPercent={yPosPercent}
              onYPosPercentChange={setYPosPercent}
              blurRadius={blurRadius}
              onBlurRadiusChange={setBlurRadius}
              dimPercent={dimPercent}
              onDimPercentChange={setDimPercent}
              withOutro={withOutro}
              onWithOutroChange={setWithOutro}
              outroStyle={outroStyle}
              onOutroStyleChange={setOutroStyle}
              outroBg={outroBg}
              onOutroBgChange={setOutroBg}
              manualTitle={manualTitle}
              onManualTitleChange={setManualTitle}
              isConverting={isConverting}
              onRunConversion={handleRunConversion}
              convertedResult={convertedResult}
              onApplyOutro={handleApplyOutro}
              isApplyingOutro={isApplyingOutro}
              onOpenPlayer={openPlayer}
              onOpenDrawer={openDrawer}
              formatTime={formatTime}
              activeVideo={activeVideo}
            />
          </div>

          <div className="lg:col-span-5">
            <VideoPreviewPlayer
              thumbUrl={thumbUrl}
              blurRadius={blurRadius}
              dimPercent={dimPercent}
              zoom={zoom}
              yPosPercent={yPosPercent}
              outroStyle={outroStyle}
              onOutroStyleChange={setOutroStyle}
              outroMode={outroMode}
              onOutroModeChange={setOutroMode}
              outroBg={outroBg}
              onOutroBgChange={setOutroBg}
              activeVideoPath={activeVideo?.path}
              onApplyOutro={handleApplyOutro}
              isApplyingOutro={isApplyingOutro}
            />
          </div>
        </div>
      )}
    </div>
  );
}
