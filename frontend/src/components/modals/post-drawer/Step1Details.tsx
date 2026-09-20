"use client";

import React, { useRef, useState } from "react";
import { Sparkles, Upload, Check, Image as ImageIcon, Wand2, Loader2, Copy, Lightbulb, Star, Mic, Square, Globe } from "lucide-react";
import { VideoItem, FrameCandidate, AiGeneratedMetadata, ThumbnailAdvice, SUPPORTED_LANGUAGES, SupportedLanguageCode, PostFormData } from "@/types";
import {
  useGenerateAiMetadataMutation,
  useAiStatus,
  useThumbnailAdviceMutation,
  useTranscribeAudioMutation,
  useGenerateThumbnailMutation,
} from "@/hooks/useApi";
import { useAiSettingsModal } from "@/hooks/useModals";
import { getThumbnailUrl } from "@/lib/api";
import { toast } from "sonner";

export interface Step1DetailsProps {
  form: PostFormData;
  updateForm: (patch: Partial<PostFormData> | ((prev: PostFormData) => Partial<PostFormData>)) => void;
  video: VideoItem | null;
  isExtractingFrames: boolean;
  onExtractFrames: () => void;
  onUploadCustomThumb: (e: React.ChangeEvent<HTMLInputElement>) => void;
  tr: any;
}

export function Step1Details({
  form,
  updateForm,
  video,
  isExtractingFrames,
  onExtractFrames,
  onUploadCustomThumb,
  tr,
}: Step1DetailsProps) {
  const { metaLang, metaData, candidates, selectedThumbPath, isMadeForKids, category } = form;
  const isShorts = video ? video.is_shorts : true;
  const filename = video?.filename || "";
  const videoPath = video?.path || "";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aiResult, setAiResult] = useState<AiGeneratedMetadata | null>(null);
  const [userPrompt, setUserPrompt] = useState("");
  const [includeFrames, setIncludeFrames] = useState(false);
  const [thumbAdvice, setThumbAdvice] = useState<ThumbnailAdvice | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const { data: aiStatus } = useAiStatus();
  const { openAiSettings } = useAiSettingsModal();
  const generateAiMutation = useGenerateAiMetadataMutation();
  const thumbAdviceMutation = useThumbnailAdviceMutation();
  const transcribeMutation = useTranscribeAudioMutation();
  const generateThumbMutation = useGenerateThumbnailMutation();

  const handleGenerateAiThumbnail = async () => {
    try {
      const activeTitle = metaData[metaLang]?.title || metaData.en?.title || filename || "YouTube Video";
      const activeDesc = metaData[metaLang]?.desc || metaData.en?.desc || undefined;
      const validFrames = candidates.map((c) => c.thumb_path).filter(Boolean);
      const data = await generateThumbMutation.mutateAsync({
        title: activeTitle,
        description: activeDesc,
        user_prompt: userPrompt.trim() || undefined,
        is_shorts: isShorts,
        video_path: videoPath || undefined,
        frame_paths: validFrames.length > 0 ? validFrames : undefined,
      });
      if (data?.candidate) {
        updateForm((prev) => ({
          candidates: [data.candidate, ...prev.candidates],
          selectedThumbPath: data.candidate.thumb_path,
        }));
        toast.success("ШІ-обкладинку згенеровано на основі кадрів відео!");
      }
    } catch (err: any) {
      toast.error("Помилка генерації обкладинки", { description: err?.message });
    }
  };

  const currentMeta = metaData[metaLang] || { title: "", desc: "", tags: "" };

  // Clean up any ongoing recording on unmount
  React.useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const handleApplyAll = (data: AiGeneratedMetadata) => {
    const updated: Record<string, { title: string; desc: string; tags: string }> = { ...metaData };
    const langsData = data.languages || {};

    // Populate all 7 supported languages from AI response
    for (const langItem of SUPPORTED_LANGUAGES) {
      const code = langItem.code;
      const lData = langsData[code] || (code === "uk" ? data.uk : code === "en" ? data.en : null);
      if (lData) {
        updated[code] = {
          title: lData.title || (code === "en" ? data.titles?.[0] : "") || updated[code]?.title || "",
          desc: lData.description || updated[code]?.desc || "",
          tags: Array.isArray(lData.tags) ? lData.tags.join(", ") : updated[code]?.tags || "",
        };
      }
    }

    // Ensure English has top title if still empty
    if (!updated.en?.title && data.titles?.[0]) {
      updated.en = {
        title: data.titles[0],
        desc: updated.en?.desc || "",
        tags: updated.en?.tags || "",
      };
    }

    updateForm({
      metaData: updated,
      category: data.category_id || category || "20",
    });

    const tokMsg = data.usage ? ` (${data.usage.total_tokens} токенів)` : "";
    toast.success(`✨ Усі 7 мов (EN, UA, ES, DE, PT, JA, PL) заповнено ШІ!${tokMsg}`);
  };

  const handleGenerateAi = (promptOverride?: string) => {
    if (!aiStatus?.has_key) {
      toast.info("Вкажіть токен Gemini для активації AI", {
        action: {
          label: "Налаштувати",
          onClick: () => openAiSettings(),
        },
      });
      openAiSettings();
      return;
    }

    const effectivePrompt = promptOverride !== undefined ? promptOverride : userPrompt;
    const baseTitle = currentMeta.title || filename || "YouTube Video";

    generateAiMutation.mutate(
      {
        title: baseTitle,
        description: currentMeta.desc,
        user_prompt: effectivePrompt,
        is_shorts: isShorts,
        include_frames: includeFrames,
        frame_paths: candidates.map((c) => c.thumb_path),
        dual_language: true,
        languages: ["en", "uk", "es", "de", "pt", "ja", "pl"],
      },
      {
        onSuccess: (data) => {
          setAiResult(data);
          // Automatically populate all fields (UA & EN title, description, tags, category)
          handleApplyAll(data);
        },
        onError: (err: any) => {
          toast.error(err.message || "Помилка AI генерації");
        },
      }
    );
  };

  const startRecording = async () => {
    if (typeof window === "undefined") return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("Ваш браузер не підтримує запис аудіо з мікрофона");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Clean MediaRecorder - audio sent directly to Gemini multimodal API
      let mimeType = "";
      if (typeof MediaRecorder.isTypeSupported === "function") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });

        if (blob.size > 100) {
          toast.info("⏳ Gemini розпізнає аудіо через API...");
          transcribeMutation.mutate(blob, {
            onSuccess: (data) => {
              if (data.text) {
                // 1. Put transcribed text into prompt input
                setUserPrompt(data.text);
                const tokMsg = data.usage ? ` (${data.usage.total_tokens} токенів)` : "";
                toast.success(`🎙️ Розпізнано: "${data.text.slice(0, 45)}${data.text.length > 45 ? "..." : ""}"${tokMsg}`);
                // 2. Automatically trigger metadata generation
                handleGenerateAi(data.text);
              } else {
                toast.warning("Не вдалося розпізнати слова у голосовому записі");
              }
            },
            onError: (err: any) => {
              console.error("Audio transcription error:", err);
              toast.error(err.message || "Помилка розпізнавання аудіо через Gemini API");
            },
          });
        } else {
          toast.warning("Запис занадто короткий. Спробуйте ще раз.");
        }
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      toast.info("🎙️ Запис... Говоріть ідею або опис (натисніть ⏹ для генерації)");
    } catch (err: any) {
      console.error("Mic error:", err);
      toast.error("Не вдалося увімкнути мікрофон. Перевірте дозволи браузера.");
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error("Error stopping recorder:", err);
      }
    }
  };

  const handleGetThumbAdvice = () => {
    if (!candidates || candidates.length === 0) {
      toast.info("Спочатку натисніть 'Згенерувати кадри'");
      return;
    }
    const baseTitle = currentMeta.title || filename || "YouTube Video";
    thumbAdviceMutation.mutate(
      {
        title: baseTitle,
        user_prompt: userPrompt,
        frame_paths: candidates.map((c) => c.thumb_path),
      },
      {
        onSuccess: (data) => {
          setThumbAdvice(data);
          const tokMsg = data.usage ? ` (${data.usage.total_tokens} токенів)` : "";
          toast.success(`AI обрав найкращий кадр для значка!${tokMsg}`);
          if (typeof data.best_frame_index === "number" && candidates[data.best_frame_index]) {
            updateForm({ selectedThumbPath: candidates[data.best_frame_index].thumb_path });
          }
        },
        onError: (err: any) => {
          toast.error(err.message || "Помилка аналізу значка");
        },
      }
    );
  };

  const handlePickTitle = (title: string) => {
    updateForm({
      metaData: {
        ...metaData,
        [metaLang]: { ...(metaData[metaLang] || { title: "", desc: "", tags: "" }), title },
      },
    });
    const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === metaLang);
    toast.success(`Назву (${langObj?.name || metaLang.toUpperCase()}) оновлено`);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    updateForm({
      metaData: {
        ...metaData,
        [metaLang]: { ...(metaData[metaLang] || { title: "", desc: "", tags: "" }), title: val },
      },
    });
  };

  const handleDescChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    updateForm({
      metaData: {
        ...metaData,
        [metaLang]: { ...(metaData[metaLang] || { title: "", desc: "", tags: "" }), desc: val },
      },
    });
  };

  const currentLangInfo = SUPPORTED_LANGUAGES.find((l) => l.code === metaLang) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="space-y-6">
      {/* Multilingual Switcher Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-indigo-400" />
              <span>{tr.drawer.detailsTitle || "Відомості про відео"}</span>
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
              🇺🇸 EN — Головна мова
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {currentLangInfo.flag} <strong>{currentLangInfo.name}</strong> • {currentLangInfo.highlight}
          </p>
        </div>

        {/* 7-Language Pill Switcher */}
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border/50">
          {SUPPORTED_LANGUAGES.map((langItem) => {
            const isSelected = metaLang === langItem.code;
            const hasData = !!metaData[langItem.code]?.title;
            const isPrimary = langItem.code === "en";

            return (
              <button
                key={langItem.code}
                type="button"
                onClick={() => updateForm({ metaLang: langItem.code })}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-card text-foreground shadow-sm font-semibold border border-border ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                title={`${langItem.name} (${langItem.highlight})`}
              >
                <span>{langItem.flag}</span>
                <span>{langItem.label}</span>
                {isPrimary && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-400 font-mono font-bold">
                    MAIN
                  </span>
                )}
                {hasData && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Заповнено" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 0. Gemini AI Assistant Bar */}
      <div className="p-3 sm:p-4 rounded-xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-foreground">Gemini AI Генератор</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-400 font-semibold font-mono">
                  2.5 Flash
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Створити 5 вірусних назв, SEO-опис та теги для 7 мов (EN, UA, ES, DE, PT, JA, PL)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleGenerateAi()}
            disabled={generateAiMutation.isPending}
            className="h-8 px-3.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {generateAiMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Генерація...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5" />
                <span>Згенерувати AI</span>
              </>
            )}
          </button>
        </div>

        {/* Custom Prompt Input & Options */}
        <div className="space-y-2 pt-2 border-t border-indigo-500/15">
          <div className="relative flex items-center">
            <input
              type="text"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder={
                isRecording
                  ? "🎙️ Слухаю... Говоріть у мікрофон (натисніть ⏹ щоб розпізнати й згенерувати)..."
                  : transcribeMutation.isPending
                  ? "⏳ Gemini розпізнає голос через API..."
                  : generateAiMutation.isPending
                  ? "✨ Генерація вірусних метаданих..."
                  : "Підказка для ШІ (напишіть або надиктуйте голосом)..."
              }
              className={`w-full h-9 pl-3 pr-10 rounded-lg border text-xs placeholder:text-muted-foreground outline-none transition ${
                isRecording
                  ? "border-rose-500 ring-2 ring-rose-500/30 bg-rose-500/5 text-rose-300"
                  : "border-border/70 bg-background text-foreground focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
              }`}
            />

            {/* Voice Input Button */}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={transcribeMutation.isPending || generateAiMutation.isPending}
              className={`absolute right-1.5 h-6 w-6 rounded-md flex items-center justify-center transition cursor-pointer ${
                isRecording
                  ? "bg-rose-500 text-white animate-pulse shadow-sm shadow-rose-500/50"
                  : transcribeMutation.isPending
                  ? "bg-amber-500/20 text-amber-400"
                  : "hover:bg-secondary text-muted-foreground hover:text-indigo-400"
              }`}
              title={
                isRecording
                  ? "Зупинити запис і надіслати в Gemini (автогенерація)"
                  : transcribeMutation.isPending
                  ? "Розпізнавання аудіо через Gemini..."
                  : "Надиктувати промпт голосом (мікрофон)"
              }
            >
              {transcribeMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isRecording ? (
                <Square className="w-3 h-3 fill-current" />
              ) : (
                <Mic className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {isRecording && (
            <div className="flex items-center justify-between text-[11px] text-rose-400 font-medium px-1">
              <span className="flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Йде запис аудіо для Gemini API... Говоріть ідею або опис відео
              </span>
              <button
                type="button"
                onClick={stopRecording}
                className="text-xs text-rose-300 hover:text-white font-semibold underline transition cursor-pointer"
              >
                ⏹ Готово (надіслати та згенерувати)
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground select-none">
            <label className="inline-flex items-center gap-1.5 cursor-pointer hover:text-foreground transition">
              <input
                type="checkbox"
                checked={includeFrames}
                onChange={(e) => setIncludeFrames(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-border text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
              />
              <span>📸 Враховувати кадри відео (візуальний контекст)</span>
            </label>

            <span className="text-[11px] text-indigo-400 font-medium flex items-center gap-1">
              🌐 Авто-локалізація: 7 мов (EN + UA, ES, DE, PT, JA, PL)
            </span>
          </div>
        </div>

        {/* Generated Titles & Quick Pick */}
        {aiResult && (
          <div className="space-y-3 pt-2.5 border-t border-indigo-500/20 text-xs animate-in fade-in duration-200">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center justify-between">
                <span>🔥 Оберіть вірусну назву (клікніть щоб встановити):</span>
                {aiResult.usage ? (
                  <span className="text-[10px] text-indigo-400 font-mono flex items-center gap-1 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                    ⚡ {aiResult.usage.total_tokens} токенів ({aiResult.usage.prompt_tokens} вх. / {aiResult.usage.candidates_tokens} вих.)
                  </span>
                ) : (
                  <span className="text-[10px] text-indigo-400">Клікніть на будь-яку</span>
                )}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {aiResult.titles.map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePickTitle(t)}
                    className="text-left text-[11px] font-medium px-2.5 py-1.5 rounded-lg bg-background hover:bg-primary hover:text-primary-foreground border border-border text-foreground transition cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
                    title="Встановити цю назву"
                  >
                    <span>{t}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Generated Tags Preview Chips */}
            {((aiResult.languages?.[metaLang]?.tags && aiResult.languages[metaLang].tags.length > 0) ||
              ((aiResult as any)[metaLang]?.tags && (aiResult as any)[metaLang].tags.length > 0)) && (
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-semibold text-muted-foreground block">
                  Згенеровані теги ({currentLangInfo.flag} {currentLangInfo.name}):
                </span>
                <div className="flex flex-wrap gap-1">
                  {(aiResult.languages?.[metaLang]?.tags || (aiResult as any)[metaLang]?.tags || []).map((tg: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-secondary text-[10px] font-mono text-muted-foreground border border-border/60"
                    >
                      #{tg.replace(/^#/, "")}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Apply All CTA */}
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-background/80 border border-emerald-500/20 bg-emerald-500/5">
              <div className="space-y-0.5">
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Усі 7 мов (EN, UA, ES, DE, PT, JA, PL) заповнено:
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  ✓ 🇺🇸 EN (Головна) + ✓ 6 локалізацій + ✓ SEO-описи + ✓ Теги + ✓ Категорія ({category === "20" ? "Gaming" : category})
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleApplyAll(aiResult)}
                className="h-7 px-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-sm shrink-0"
                title="Застосувати ці згенеровані метадані повторно для всіх 7 мов"
              >
                <Check className="w-3 h-3" />
                <span>Застосувати повторно</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 1. Title Input (Material Outlined) */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-muted-foreground block">
          {tr.drawer.titleLabel || "Назва (обов'язково)"} • {metaLang.toUpperCase()}
        </label>
        <div className="relative border border-border hover:border-foreground/40 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary rounded-lg transition bg-background">
          <input
            type="text"
            maxLength={100}
            value={currentMeta.title}
            onChange={handleTitleChange}
            placeholder={tr.drawer.titlePlaceholder || "Введіть назву відео..."}
            className="w-full bg-transparent px-3.5 pt-2.5 pb-6 text-xs sm:text-sm font-medium text-foreground outline-none"
          />
          <span className="absolute bottom-1.5 right-3 text-[10px] text-muted-foreground font-mono">
            {currentMeta.title.length}/100
          </span>
        </div>
      </div>

      {/* 2. Description Textarea (Material Outlined) */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-muted-foreground block">
          {tr.drawer.descLabel || "Опис"} • {metaLang.toUpperCase()}
        </label>
        <div className="relative border border-border hover:border-foreground/40 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary rounded-lg transition bg-background">
          <textarea
            rows={4}
            maxLength={5000}
            value={currentMeta.desc}
            onChange={handleDescChange}
            placeholder={tr.drawer.descPlaceholder || "Розкажіть глядачам про своє відео..."}
            className="w-full bg-transparent px-3.5 pt-2.5 pb-6 text-xs sm:text-sm text-foreground outline-none resize-none"
          />
          <span className="absolute bottom-1.5 right-3 text-[10px] text-muted-foreground font-mono">
            {currentMeta.desc.length}/5000
          </span>
        </div>
      </div>

      {/* 2.1 Tags Field (Material Outlined) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-muted-foreground block">
            Теги відео • {metaLang.toUpperCase()}
          </label>
          <span className="text-[10px] text-muted-foreground font-mono">
            {currentMeta.tags ? currentMeta.tags.split(",").filter((t) => t.trim()).length : 0} тегів
          </span>
        </div>
        <div className="relative border border-border hover:border-foreground/40 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary rounded-lg transition bg-background">
          <input
            type="text"
            maxLength={500}
            value={currentMeta.tags}
            onChange={(e) => {
              const val = e.target.value;
              updateForm({
                metaData: {
                  ...metaData,
                  [metaLang]: { ...(metaData[metaLang] || { title: "", desc: "", tags: "" }), tags: val },
                },
              });
            }}
            placeholder="Введіть теги через кому або натисніть 'Застосувати все'..."
            className="w-full bg-transparent px-3.5 py-2 text-xs sm:text-sm text-foreground outline-none"
          />
        </div>
      </div>

      {/* 3. Thumbnail Generator & Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-muted-foreground">
            {tr.drawer.thumbLabel || "Значок відео (Прев'ю)"}
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateAiThumbnail}
              disabled={generateThumbMutation.isPending}
              className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 transition cursor-pointer disabled:opacity-50 shadow-sm"
              title={
                candidates.length > 0
                  ? `ШІ проаналізує ${candidates.length} реальних кадрів відео для генерації автентичної 4K обкладинки`
                  : "ШІ автоматично вилучить кадри гри та згенерує автентичну 4K обкладинку"
              }
            >
              {generateThumbMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
              ) : (
                <Wand2 className="w-3.5 h-3.5 text-violet-400" />
              )}
              <span>
                {generateThumbMutation.isPending
                  ? "Аналіз кадрів та малювання..."
                  : candidates.length > 0
                  ? `✨ ШІ-значок (${candidates.length} кадр.)`
                  : "✨ Згенерувати ШІ-значок"}
              </span>
            </button>

            <button
              type="button"
              onClick={onExtractFrames}
              disabled={isExtractingFrames}
              className="text-xs text-primary hover:underline flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isExtractingFrames ? "Генерація..." : "Кадри з відео"}</span>
            </button>
            {candidates.length > 0 && (
              <button
                type="button"
                onClick={handleGetThumbAdvice}
                disabled={thumbAdviceMutation.isPending}
                className="text-xs text-amber-500 hover:text-amber-400 font-medium flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                title="ШІ проаналізує кадри та порадить найклікабельніший значок і текст банера"
              >
                {thumbAdviceMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Lightbulb className="w-3.5 h-3.5" />
                )}
                <span>{thumbAdviceMutation.isPending ? "Аналіз..." : "💡 Порада"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Thumbnail Slots Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Upload Button Slot */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="aspect-video rounded-lg border border-dashed border-border hover:border-primary/60 bg-muted/20 hover:bg-muted/40 flex flex-col items-center justify-center p-2 text-center transition cursor-pointer group"
          >
            <Upload className="w-4 h-4 text-muted-foreground group-hover:text-primary mb-1 transition" />
            <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground">
              Завантажити файл
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onUploadCustomThumb}
            />
          </button>

          {/* Candidate Thumbnails */}
          {candidates.slice(0, 7).map((c, idx) => {
            const isSelected = selectedThumbPath === c.thumb_path;
            const isAiBest = thumbAdvice?.best_frame_index === idx;
            return (
              <div
                key={c.thumb_path || idx}
                onClick={() => updateForm({ selectedThumbPath: c.thumb_path })}
                className={`relative aspect-video rounded-lg overflow-hidden bg-black cursor-pointer transition ${
                  isSelected
                    ? "ring-2 ring-primary shadow-md"
                    : c.is_ai_generated
                    ? "ring-2 ring-violet-500/80 shadow-sm"
                    : isAiBest
                    ? "ring-2 ring-amber-500/80"
                    : "opacity-80 hover:opacity-100"
                }`}
                title={c.prompt_used || c.formatted}
              >
                <img
                  src={getThumbnailUrl(c.thumb_path)}
                  alt={`Thumbnail ${idx}`}
                  className="w-full h-full object-cover"
                />
                {c.is_ai_generated ? (
                  <div className="absolute top-1 left-1 bg-violet-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-0.5 z-10">
                    <Sparkles className="w-2.5 h-2.5 fill-current" />
                    <span>ШІ Арт</span>
                  </div>
                ) : isAiBest ? (
                  <div className="absolute top-1 left-1 bg-amber-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-0.5 z-10">
                    <Star className="w-2.5 h-2.5 fill-current" />
                    <span>ШІ Топ</span>
                  </div>
                ) : null}
                {isSelected && (
                  <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5 z-10">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* AI Thumbnail Advice Card */}
        {thumbAdvice && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-2 mt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-amber-500 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5" />
                  Порада ШІ для значка
                </span>
                {thumbAdvice.usage && (
                  <span className="text-[10px] text-amber-400 font-mono bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/20">
                    ⚡ {thumbAdvice.usage.total_tokens} токенів
                  </span>
                )}
              </div>
              {thumbAdvice.banner_text && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(thumbAdvice.banner_text);
                    toast.success("Текст банера скопійовано!");
                  }}
                  className="text-[11px] text-amber-500 hover:text-amber-400 flex items-center gap-1 transition cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  Копіювати напис
                </button>
              )}
            </div>
            {thumbAdvice.reason && (
              <p className="text-xs text-foreground/90 leading-relaxed">
                🎯 <strong className="text-amber-400">Чому цей кадр:</strong> {thumbAdvice.reason}
              </p>
            )}
            {thumbAdvice.banner_text && (
              <div className="p-2 bg-background/60 rounded border border-border flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-semibold">
                    Рекомендований напис на банері:
                  </span>
                  <span className="font-bold text-amber-400 text-sm tracking-wide">
                    &ldquo;{thumbAdvice.banner_text}&rdquo;
                  </span>
                </div>
              </div>
            )}
            {thumbAdvice.design_tip && (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                💡 <em>{thumbAdvice.design_tip}</em>
              </p>
            )}
          </div>
        )}
      </div>

      {/* 4. Audience / COPPA */}
      <div className="space-y-2 pt-1">
        <label className="text-[11px] font-medium text-muted-foreground block">
          {tr.drawer.audienceLabel || "Аудиторія (Вимоги COPPA)"}
        </label>
        <div className="space-y-2">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="radio"
              name="coppa_audience"
              checked={!isMadeForKids}
              onChange={() => updateForm({ isMadeForKids: false })}
              className="w-4 h-4 mt-0.5 accent-primary cursor-pointer"
            />
            <div>
              <span className="text-xs font-medium text-foreground group-hover:text-primary transition">
                {tr.drawer.audienceNotForKids || "Ні, це відео не для дітей"}
              </span>
              <p className="text-[11px] text-muted-foreground">
                Відео містить стандартний ігровий контент та не орієнтоване спеціально на дітей.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="radio"
              name="coppa_audience"
              checked={isMadeForKids}
              onChange={() => updateForm({ isMadeForKids: true })}
              className="w-4 h-4 mt-0.5 accent-primary cursor-pointer"
            />
            <div>
              <span className="text-xs font-medium text-foreground group-hover:text-primary transition">
                {tr.drawer.audienceForKids || "Так, це відео для дітей"}
              </span>
              <p className="text-[11px] text-muted-foreground">
                Цей контент призначений виключно для дитячої аудиторії.
              </p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
