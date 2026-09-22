"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { X, Minus, ChevronLeft, ChevronRight, Check, Upload, Loader2, Trash2, Archive, ArchiveRestore } from "lucide-react";
import { VideoItem, VideoStatus, FrameCandidate, PostFormData, createInitialPostFormData } from "@/types";
import { usePostDrawer, useVideoPlayer } from "@/hooks/useModals";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import {
  useVideos,
  useAuthStatus,
  useLoginMutation,
  useScheduleUpload,
  useUpdateVideoStatus,
  useDeleteVideoMutation,
  useArchiveVideoMutation,
  useUnarchiveVideoMutation,
} from "@/hooks/useApi";
import { useBackgroundTasks } from "@/hooks/useBackgroundTasks";
import { toast } from "sonner";
import { ConfirmDeleteModal } from "@/components/modals/ConfirmDeleteModal";
import { apiFetchJson, getThumbnailUrl } from "@/lib/api";
import { getTomorrowDateString, parseTags, sanitizeTag } from "@/lib/utils";

import { Step1Details } from "./post-drawer/Step1Details";
import { Step2Elements } from "./post-drawer/Step2Elements";
import { Step3Checks } from "./post-drawer/Step3Checks";
import { Step4Visibility } from "./post-drawer/Step4Visibility";
import { VideoPreviewRail } from "./post-drawer/VideoPreviewRail";

export function PostDrawer() {
  const {
    isOpen,
    isMinimized,
    minimizeDrawer,
    closeDrawer,
    videoPath: storePath,
    targetDate: storeDate,
    initialMeta: storeInitialMeta,
    initialLang: storeInitialLang,
  } = usePostDrawer();
  const { openPlayer } = useVideoPlayer();
  const { lang, tr } = useAppLanguage();
  const { data: videos = [] } = useVideos(lang);
  const { data: auth = { authenticated: false } } = useAuthStatus();
  const loginMutation = useLoginMutation();
  const updateStatusMutation = useUpdateVideoStatus();
  const scheduleUploadMutation = useScheduleUpload();
  const deleteVideoMutation = useDeleteVideoMutation();
  const archiveVideoMutation = useArchiveVideoMutation();
  const unarchiveVideoMutation = useUnarchiveVideoMutation();
  const { startUpload } = useBackgroundTasks();
  const draftsRef = useRef<Record<string, PostFormData>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteVideo = () => {
    if (activeVideo) {
      deleteVideoMutation.mutate(activeVideo.path, {
        onSuccess: () => {
          setShowDeleteConfirm(false);
          closeDrawer();
        },
      });
    }
  };

  // Stepper state (1: Details, 2: Elements, 3: Checks, 4: Visibility)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  const [selectedPath, setSelectedPath] = useState<string>("");
  const [isExtractingFrames, setIsExtractingFrames] = useState<boolean>(false);
  const [isSavingStatus, setIsSavingStatus] = useState<boolean>(false);

  // Unified Compound Form State
  const [formData, setFormData] = useState<PostFormData>(createInitialPostFormData);

  const updateForm = (patch: Partial<PostFormData> | ((prev: PostFormData) => Partial<PostFormData>)) => {
    setFormData((prev) => {
      const nextPatch = typeof patch === "function" ? patch(prev) : patch;
      const updated = { ...prev, ...nextPatch };
      if (selectedPath) {
        draftsRef.current[selectedPath] = updated;
      }
      return updated;
    });
  };

  // Active Video Item with fallback for freshly rendered AI shorts
  const activeVideo = videos.find((v) => v.path === selectedPath) || null;
  const fallbackVideo: VideoItem | null = selectedPath
    ? {
        path: selectedPath,
        filename: selectedPath.split(/[/\\]/).pop() || "video.mp4",
        folder: "root",
        size_mb: 0,
        duration: 0,
        duration_formatted: "00:00",
        resolution: "1080x1920",
        aspect_ratio: "9:16",
        is_shorts: true,
        title: selectedPath.split(/[/\\]/).pop()?.replace(/\.[^/.]+$/, "") || "video",
        title_options: [],
        description: "",
        tags: [],
        status: "planning" as const,
        scheduled_for: null,
        youtube_url: null,
      }
    : null;
  const currentDisplayVideo = activeVideo || fallbackVideo;

  // Sync state when Drawer opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      const chosenPath = storePath || (videos.length > 0 ? videos[0].path : "");
      setSelectedPath(chosenPath);

      if (chosenPath && draftsRef.current[chosenPath]) {
        setFormData(draftsRef.current[chosenPath]);
        return;
      }

      // Initialize date
      const initialDate = storeDate || getTomorrowDateString();

      let initialMeta = createInitialPostFormData().metaData;
      let initialStatus: VideoStatus = "planning";
      let initialThumbPath: string | null = null;
      let activeLang = storeInitialLang || "en";

      if (chosenPath) {
        const vid = videos.find((v) => v.path === chosenPath);
        if (vid) {
          const rawTitle = vid.title || vid.filename.replace(/\.[^/.]+$/, "");
          const existingDesc = vid.description || "";
          const existingTags = Array.isArray(vid.tags) ? vid.tags.join(", ") : (vid.tags || "");

          const cleanTitle = sanitizeTag(rawTitle);
          const cleanExistingTags = parseTags(existingTags).join(", ");

          const defaultEnDesc = (vid.localizations?.en?.description) || existingDesc || `Check out this highlight from ${rawTitle}! Subscribe for more daily videos and highlights. #Shorts #Viral`;
          const defaultEnTags = (vid.localizations?.en?.tags ? (Array.isArray(vid.localizations.en.tags) ? vid.localizations.en.tags.join(", ") : vid.localizations.en.tags) : "") || cleanExistingTags || (cleanTitle ? `${cleanTitle}, shorts, highlights, viral, trending` : "shorts, highlights, viral, trending");

          const defaultUkDesc = (vid.localizations?.uk?.description) || existingDesc || `Дивіться яскравий момент із ${rawTitle}! Підписуйтесь на канал, щоб не пропустити нові випуски. #Shorts #Відео`;
          const defaultUkTags = (vid.localizations?.uk?.tags ? (Array.isArray(vid.localizations.uk.tags) ? vid.localizations.uk.tags.join(", ") : vid.localizations.uk.tags) : "") || cleanExistingTags || (cleanTitle ? `${cleanTitle}, шортс, хайлайти, відео, тренди` : "шортс, хайлайти, відео, тренди");

          initialMeta = {
            en: {
              title: vid.localizations?.en?.title || rawTitle,
              desc: defaultEnDesc,
              tags: defaultEnTags,
            },
            uk: {
              title: vid.localizations?.uk?.title || rawTitle,
              desc: defaultUkDesc,
              tags: defaultUkTags,
            },
            es: { title: vid.localizations?.es?.title || "", desc: vid.localizations?.es?.description || "", tags: (Array.isArray(vid.localizations?.es?.tags) ? vid.localizations.es.tags.join(", ") : vid.localizations?.es?.tags) || "" },
            de: { title: vid.localizations?.de?.title || "", desc: vid.localizations?.de?.description || "", tags: (Array.isArray(vid.localizations?.de?.tags) ? vid.localizations.de.tags.join(", ") : vid.localizations?.de?.tags) || "" },
            pt: { title: vid.localizations?.pt?.title || "", desc: vid.localizations?.pt?.description || "", tags: (Array.isArray(vid.localizations?.pt?.tags) ? vid.localizations.pt.tags.join(", ") : vid.localizations?.pt?.tags) || "" },
            ja: { title: vid.localizations?.ja?.title || "", desc: vid.localizations?.ja?.description || "", tags: (Array.isArray(vid.localizations?.ja?.tags) ? vid.localizations.ja.tags.join(", ") : vid.localizations?.ja?.tags) || "" },
            pl: { title: vid.localizations?.pl?.title || "", desc: vid.localizations?.pl?.description || "", tags: (Array.isArray(vid.localizations?.pl?.tags) ? vid.localizations.pl.tags.join(", ") : vid.localizations?.pl?.tags) || "" },
          };
          initialStatus = vid.status || "planning";
          initialThumbPath = vid.custom_thumb_path || null;
          if (vid.default_lang && !storeInitialLang) {
            activeLang = vid.default_lang;
          }
        }
      }

      // If storeInitialMeta was passed directly from Studio (instant seed)
      if (storeInitialMeta) {
        for (const [code, meta] of Object.entries(storeInitialMeta) as [string, { title?: string; desc?: string; tags?: string }][]) {
          if (meta && (meta.title || meta.desc || meta.tags)) {
            initialMeta[code as any] = {
              title: meta.title || initialMeta[code as any]?.title || "",
              desc: meta.desc || initialMeta[code as any]?.desc || "",
              tags: meta.tags || initialMeta[code as any]?.tags || "",
            };
          }
        }
      }

      const initialData: PostFormData = {
        metaLang: activeLang,
        metaData: initialMeta,
        candidates: [],
        selectedThumbPath: initialThumbPath,
        isMadeForKids: false,
        category: "20",
        allowShortsRemix: true,
        manualStatus: initialStatus,
        privacy: "scheduled",
        dateStr: initialDate,
        timeStr: "15:00",
      };

      setFormData(initialData);
      if (chosenPath) {
        draftsRef.current[chosenPath] = initialData;
      }
    }
  }, [isOpen, storePath, storeDate, storeInitialMeta, storeInitialLang, videos]);

  if (!isOpen) return null;

  // Extract frames handler
  const handleExtractFrames = async () => {
    if (!selectedPath) return;
    setIsExtractingFrames(true);
    try {
      const data = await apiFetchJson<{ candidates: FrameCandidate[] }>("/api/video/extract-frames", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: selectedPath, count: 4 }),
      });
      if (data?.candidates) {
        updateForm({
          candidates: data.candidates,
          selectedThumbPath: data.candidates.length > 0 ? data.candidates[0].thumb_path : null,
        });
        toast.success("Кадри успішно вилучено");
      }
    } catch (err: any) {
      toast.error("Помилка генерації кадрів", { description: err?.message });
    } finally {
      setIsExtractingFrames(false);
    }
  };

  // Upload custom thumbnail
  const handleUploadCustomThumb = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPath) return;
    const form = new FormData();
    form.append("file", file);
    form.append("video_path", selectedPath);
    try {
      const data = await apiFetchJson<{ custom_thumb_path?: string }>("/api/thumbnail/upload", {
        method: "POST",
        body: form,
      });
      if (data?.custom_thumb_path) {
        updateForm({ selectedThumbPath: data.custom_thumb_path });
        toast.success("Значок завантажено");
      }
    } catch (err: any) {
      toast.error("Помилка завантаження зображення", { description: err?.message });
    }
  };

  const getScheduledIso = () => {
    if (formData.privacy !== "scheduled" || !formData.dateStr || !formData.timeStr) return null;
    try {
      const [year, month, day] = formData.dateStr.split("-").map(Number);
      const [hours, minutes] = formData.timeStr.split(":").map(Number);
      const localDate = new Date(year, month - 1, day, hours, minutes, 0);
      return localDate.toISOString();
    } catch {
      return `${formData.dateStr}T${formData.timeStr}:00Z`;
    }
  };

  // Save manual status to SQLite
  const handleSaveManualStatus = () => {
    if (!selectedPath) return;
    setIsSavingStatus(true);
    const fullIso = getScheduledIso();
    const currentTitle = formData.metaData[formData.metaLang]?.title || formData.metaData.en?.title || "";
    updateStatusMutation.mutate(
      {
        path: selectedPath,
        status: formData.manualStatus,
        scheduled_for: fullIso,
        title: currentTitle,
        custom_thumb_path: formData.selectedThumbPath || undefined,
      },
      {
        onSuccess: () => {
          setIsSavingStatus(false);
          toast.success("Статус збережено в базі даних SQLite");
        },
        onError: () => setIsSavingStatus(false),
      }
    );
  };

  // Publish to YouTube in background
  const handlePublishOrSchedule = () => {
    if (!selectedPath) return;
    if (!auth?.authenticated) {
      toast.error("Будь ласка, увійдіть у свій YouTube канал перед публікацією");
      loginMutation.mutate();
      return;
    }

    const scheduledIso = getScheduledIso();
    const currentMeta = formData.metaData[formData.metaLang] || { title: "", desc: "", tags: "" };

    // English is the global primary default language on YouTube
    const primaryTitle = formData.metaData.en?.title || currentMeta.title || "YouTube Video";
    const primaryDesc = formData.metaData.en?.desc || currentMeta.desc || "";
    const primaryTags = parseTags(formData.metaData.en?.tags || currentMeta.tags || "");

    // Build localizations for all other populated languages
    const locMap: Record<string, { title: string; description: string }> = {};
    for (const [langCode, item] of Object.entries(formData.metaData)) {
      if (langCode !== "en" && item?.title) {
        locMap[langCode] = {
          title: item.title,
          description: item.desc || "",
        };
      }
    }

    startUpload({
      video_path: selectedPath,
      title: primaryTitle,
      description: primaryDesc,
      tags: primaryTags,
      privacy: formData.privacy,
      publish_at: scheduledIso,
      is_shorts: !!currentDisplayVideo?.is_shorts,
      default_lang: "en",
      localizations: locMap,
      custom_thumb_path: formData.selectedThumbPath,
      archiveAfterPost: formData.archiveAfterPost,
    });

    if (selectedPath) {
      delete draftsRef.current[selectedPath];
    }
    closeDrawer();
  };

  const steps = [
    { num: 1, title: tr.drawer.stepDetails || "Відомості" },
    { num: 2, title: tr.drawer.stepElements || "Елементи" },
    { num: 3, title: tr.drawer.stepChecks || "Перевірки" },
    { num: 4, title: tr.drawer.stepVisibility || "Видимість" },
  ];

  return (
    <div
      onClick={minimizeDrawer}
      className={`fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-in fade-in duration-200 ${
        isMinimized ? "hidden pointer-events-none" : ""
      }`}
    >
      <div
        className="relative w-full max-w-5xl xl:max-w-6xl 2xl:max-w-[1240px] bg-card text-card-foreground border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Modal Header: Title & Close Button */}
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 truncate min-w-0">
            <h2 className="text-sm sm:text-base font-semibold text-foreground truncate">
              {formData.metaData[formData.metaLang]?.title || currentDisplayVideo?.filename || "Студія публікації"}
            </h2>
            {currentDisplayVideo?.is_archived && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-300 bg-amber-950/80 border border-amber-500/40 shadow-sm shrink-0">
                📦 В архіві
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {currentDisplayVideo?.is_archived ? (
              <button
                type="button"
                onClick={() => {
                  if (selectedPath) {
                    unarchiveVideoMutation.mutate(selectedPath);
                  }
                }}
                disabled={unarchiveVideoMutation.isPending}
                className="h-8 px-3 rounded-full bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                title="Відновити з архіву"
              >
                <ArchiveRestore className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Відновити з архіву</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (selectedPath) {
                    archiveVideoMutation.mutate(selectedPath, {
                      onSuccess: () => closeDrawer(),
                    });
                  }
                }}
                disabled={archiveVideoMutation.isPending}
                className="h-8 px-3 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                title="Перемістити в архів"
              >
                <Archive className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">В архів</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="h-8 px-3 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-xs font-medium flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="Видалити файл з диска"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Видалити файл</span>
            </button>

            <button
              type="button"
              onClick={minimizeDrawer}
              className="w-8 h-8 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition cursor-pointer shrink-0"
              title="Згорнути вікно"
            >
              <Minus className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={closeDrawer}
              className="w-8 h-8 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition cursor-pointer shrink-0"
              title="Закрити"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Material Stepper Navigation (Clean thin line, no heavy borders) */}
        <div className="px-6 py-3 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="max-w-3xl mx-auto flex items-center justify-between relative">
            {steps.map((s, idx) => {
              const isCurrent = currentStep === s.num;
              const isPast = currentStep > s.num;

              return (
                <div key={s.num} className="flex-1 flex items-center relative">
                  {/* Step Button */}
                  <button
                    type="button"
                    onClick={() => setCurrentStep(s.num as 1 | 2 | 3 | 4)}
                    className="flex items-center gap-2 relative z-10 transition cursor-pointer group"
                  >
                    <div
                      className={`w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center transition ${
                        isCurrent
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : isPast
                          ? "bg-muted text-foreground"
                          : "bg-muted/60 text-muted-foreground"
                      }`}
                    >
                      {isPast ? <Check className="w-3.5 h-3.5" /> : s.num}
                    </div>
                    <span
                      className={`hidden sm:inline text-xs font-medium transition ${
                        isCurrent
                          ? "text-foreground font-semibold"
                          : isPast
                          ? "text-muted-foreground group-hover:text-foreground"
                          : "text-muted-foreground/60"
                      }`}
                    >
                      {s.title}
                    </span>
                  </button>

                  {/* Connecting line to next step */}
                  {idx < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-3 transition ${
                        isPast ? "bg-primary" : "bg-border"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Main Modal Body: Left form & Right preview rail */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Left Column: Current Step Content */}
          <div className="lg:col-span-8 space-y-6">
            {currentStep === 1 && (
              <Step1Details
                form={formData}
                updateForm={updateForm}
                video={currentDisplayVideo}
                isExtractingFrames={isExtractingFrames}
                onExtractFrames={handleExtractFrames}
                onUploadCustomThumb={handleUploadCustomThumb}
                tr={tr}
              />
            )}

            {currentStep === 2 && (
              <Step2Elements
                form={formData}
                updateForm={updateForm}
                tr={tr}
              />
            )}

            {currentStep === 3 && (
              <Step3Checks
                video={currentDisplayVideo}
                form={formData}
                updateForm={updateForm}
                isSavingStatus={isSavingStatus}
                onSaveManualStatus={handleSaveManualStatus}
                tr={tr}
              />
            )}

            {currentStep === 4 && (
              <Step4Visibility
                form={formData}
                updateForm={updateForm}
                auth={auth}
                onLogin={() => loginMutation.mutate()}
                lang={lang}
                tr={tr}
              />
            )}
          </div>

          {/* Right Column: Video Preview Rail */}
          <div className="lg:col-span-4 space-y-4">
            <VideoPreviewRail
              video={currentDisplayVideo}
              onOpenPlayer={openPlayer}
              customThumbUrl={formData.selectedThumbPath ? getThumbnailUrl(formData.selectedThumbPath) : null}
              title={formData.metaData[formData.metaLang]?.title}
              tr={tr}
            />
          </div>
        </div>

        {/* 4. Modal Footer: Navigation and Action Buttons */}
        <div className="px-6 py-3.5 border-t border-border bg-muted/20 flex items-center justify-between shrink-0">
          {/* Back Button */}
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((currentStep - 1) as 1 | 2 | 3 | 4)}
              className="h-9 px-4 rounded-full text-xs font-medium hover:bg-accent text-foreground flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{tr.drawer.btnBack || "Назад"}</span>
            </button>
          ) : (
            <div />
          )}

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Save Status in SQLite Draft */}
            <button
              type="button"
              onClick={handleSaveManualStatus}
              disabled={isSavingStatus}
              className="h-9 px-4 rounded-full border border-border hover:bg-accent text-xs font-medium text-foreground transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSavingStatus ? "Збереження..." : "Зберегти чернетку"}
            </button>

            {/* Next or Publish Button */}
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((currentStep + 1) as 1 | 2 | 3 | 4)}
                className="h-9 px-5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
              >
                <span>{tr.drawer.btnNext || "Далі"}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePublishOrSchedule}
                className="h-9 px-5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-md cursor-pointer"
              >
                <span>{formData.privacy === "scheduled" ? "Запланувати у фоні" : "Опублікувати у фоні"}</span>
                <span>↗</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteVideo}
        onArchive={
          currentDisplayVideo && !currentDisplayVideo.is_archived
            ? () => {
                archiveVideoMutation.mutate(currentDisplayVideo.path, {
                  onSuccess: () => {
                    setShowDeleteConfirm(false);
                    closeDrawer();
                  },
                });
              }
            : undefined
        }
        isArchiving={archiveVideoMutation.isPending}
        filename={currentDisplayVideo?.filename || ""}
        isDeleting={deleteVideoMutation.isPending}
      />
    </div>
  );
}
