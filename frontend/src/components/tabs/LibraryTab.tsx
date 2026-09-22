"use client";

import React, { useState, useMemo } from "react";
import { Zap, Film, Play, CalendarPlus, Wand2, Trash2, Archive, ArchiveRestore } from "lucide-react";
import { VideoItem, AppLang, VideoStatus } from "@/types";
import { I18N } from "@/lib/i18n";
import { StatusSelector } from "@/components/common/StatusSelector";

type FilterType = "all" | "planning" | "scheduled" | "posted" | "shorts" | "archive";

import { useAppLanguage } from "@/hooks/useAppLanguage";
import {
  useVideos,
  useUpdateVideoStatus,
  useDeleteVideoMutation,
  useArchiveVideoMutation,
  useUnarchiveVideoMutation,
} from "@/hooks/useApi";
import { usePostDrawer, useVideoPlayer, useNavigationTab, useConverterState } from "@/hooks/useModals";
import { ConfirmDeleteModal } from "@/components/modals/ConfirmDeleteModal";
import { getThumbnailUrl } from "@/lib/api";

export function LibraryTab() {
  const { lang, tr } = useAppLanguage();
  const { data: videos = [] } = useVideos(lang);
  const { openPlayer } = useVideoPlayer();
  const { openDrawer } = usePostDrawer();
  const { setTab } = useNavigationTab();
  const { selectForConversion } = useConverterState();
  const updateStatusMutation = useUpdateVideoStatus();
  const deleteVideoMutation = useDeleteVideoMutation();
  const archiveVideoMutation = useArchiveVideoMutation();
  const unarchiveVideoMutation = useUnarchiveVideoMutation();
  const [deletingVideo, setDeletingVideo] = useState<VideoItem | null>(null);

  const onOpenPlayer = openPlayer;
  const onOpenDrawer = openDrawer;
  const onOpenConverter = (path: string) => {
    selectForConversion(path);
    setTab("converter");
  };
  const onUpdateStatus = (path: string, status: VideoStatus) => {
    updateStatusMutation.mutate({ path, status });
  };
  const handleDelete = () => {
    if (deletingVideo) {
      deleteVideoMutation.mutate(deletingVideo.path, {
        onSuccess: () => setDeletingVideo(null),
      });
    }
  };
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const counts = useMemo(() => {
    const active = videos.filter((v) => !v.is_archived);
    const archived = videos.filter((v) => !!v.is_archived);
    return {
      all: active.length,
      planning: active.filter((v) => v.status === "planning").length,
      scheduled: active.filter((v) => v.status === "scheduled").length,
      posted: active.filter((v) => v.status === "posted").length,
      shorts: active.filter((v) => v.is_shorts).length,
      archive: archived.length,
    };
  }, [videos]);

  const filteredVideos = useMemo(() => {
    if (activeFilter === "archive") {
      return videos.filter((v) => !!v.is_archived);
    }
    const active = videos.filter((v) => !v.is_archived);
    if (activeFilter === "all") return active;
    if (activeFilter === "shorts") return active.filter((v) => v.is_shorts);
    return active.filter((v) => v.status === activeFilter);
  }, [videos, activeFilter]);

  const shorts = useMemo(() => filteredVideos.filter((v) => v.is_shorts), [filteredVideos]);
  const regulars = useMemo(() => filteredVideos.filter((v) => !v.is_shorts), [filteredVideos]);

  return (
    <div className="space-y-6">
      {/* 1. FILTER CHIPS (Clean Material Pills) */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1">
        {[
          { id: "all", label: `${tr.status.all} (${counts.all})` },
          { id: "planning", label: `${tr.status.planning} (${counts.planning})` },
          { id: "scheduled", label: `${tr.status.scheduled} (${counts.scheduled})` },
          { id: "posted", label: `${tr.status.posted} (${counts.posted})` },
          { id: "shorts", label: `⚡ Shorts (${counts.shorts})` },
          { id: "archive", label: `${tr.status.archive || "📦 Архів"} (${counts.archive})` },
        ].map((chip) => {
          const isActive = activeFilter === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setActiveFilter(chip.id as FilterType)}
              className={`h-8 px-4 rounded-full text-xs font-medium transition cursor-pointer shrink-0 active:scale-95 ${
                isActive
                  ? "bg-foreground text-background font-semibold shadow-sm"
                  : "bg-secondary hover:bg-accent text-foreground"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Empty State for Archive or empty filters */}
      {filteredVideos.length === 0 && (
        <div className="py-16 text-center space-y-3 bg-muted/20 border border-dashed border-border rounded-2xl p-8">
          <div className="w-12 h-12 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
            <Archive className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            {activeFilter === "archive"
              ? (tr.library.emptyArchiveTitle || "Архів порожній")
              : "Відео не знайдено"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {activeFilter === "archive"
              ? (tr.library.emptyArchiveDesc || "Тут зберігаються опубліковані або завершені відео, перенесені в локальну папку archive.")
              : "У цій категорії наразі немає відеофайлів."}
          </p>
        </div>
      )}

      {/* 2. SHORTS SECTION (Clean YouTube Web 9:16 Style - No Heavy Outer Box) */}
      {shorts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              {activeFilter === "archive"
                ? (tr.library.archivedShortsTitle || "Заархівовані Shorts (9:16)")
                : tr.library.shortsTitle}
            </span>
            <span className="text-[11px] text-muted-foreground font-mono">
              {tr.library.clickPreview}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
            {shorts.map((v) => (
              <div
                key={v.path}
                className="group flex flex-col justify-between transition"
              >
                {/* 9:16 Thumbnail with play button */}
                <div
                  className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-black/90 cursor-pointer shadow-sm group-hover:shadow-md transition duration-200"
                  onClick={() => onOpenPlayer(v.path)}
                >
                  <img
                    src={getThumbnailUrl(v.path)}
                    alt={v.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                  <div className="absolute inset-0 flex items-center justify-center opacity-80 group-hover:opacity-100 transition">
                    <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-primary transition duration-200">
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </div>
                  </div>

                  <div className="absolute top-2 left-2">
                    <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold text-white bg-rose-600 shadow">
                      <Zap className="w-2.5 h-2.5" /> Shorts
                    </span>
                  </div>

                  {v.is_archived && (
                    <div className="absolute top-2 right-2">
                      <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold text-amber-300 bg-black/80 backdrop-blur-sm border border-amber-500/40 shadow">
                        <Archive className="w-2.5 h-2.5 text-amber-400" /> Архів
                      </span>
                    </div>
                  )}

                  <div className="absolute bottom-2 right-2">
                    <span className="rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-white">
                      {v.duration_formatted}
                    </span>
                  </div>
                </div>

                {/* Metadata & Actions */}
                <div className="pt-2 px-0.5 space-y-1.5">
                  <p
                    className="text-xs font-semibold text-foreground line-clamp-2 cursor-pointer hover:text-primary transition leading-snug"
                    onClick={() => onOpenDrawer(v.path)}
                    title={v.title}
                  >
                    {v.title || v.filename}
                  </p>

                  <div className="flex items-center justify-between gap-1 pt-0.5">
                    <StatusSelector
                      status={v.status}
                      onChangeStatus={(st) => onUpdateStatus(v.path, st)}
                      lang={lang}
                    />

                    <div className="flex items-center gap-1">
                      {v.is_archived ? (
                        <button
                          type="button"
                          onClick={() => unarchiveVideoMutation.mutate(v.path)}
                          disabled={unarchiveVideoMutation.isPending}
                          className="h-6 px-2 rounded-full bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600 dark:text-amber-400 flex items-center gap-1 text-[10px] font-semibold transition cursor-pointer disabled:opacity-50"
                          title={tr.library.unarchiveBtn || "Відновити з архіву"}
                        >
                          <ArchiveRestore className="w-3 h-3" />
                          <span className="hidden xl:inline">Відновити</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => archiveVideoMutation.mutate(v.path)}
                          disabled={archiveVideoMutation.isPending}
                          className="h-6 w-6 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition cursor-pointer disabled:opacity-50"
                          title={tr.library.archiveBtn || "В архів"}
                        >
                          <Archive className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setDeletingVideo(v)}
                        className="h-6 w-6 rounded-full hover:bg-destructive/15 text-muted-foreground hover:text-destructive flex items-center justify-center transition cursor-pointer"
                        title="Видалити файл з диска"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      <button
                        onClick={() => onOpenDrawer(v.path)}
                        className="h-6 px-2.5 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground text-foreground text-[10px] font-semibold flex items-center gap-0.5 transition shrink-0 cursor-pointer"
                      >
                        <span>{tr.library.postBtn}</span>
                        <span>↗</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. REGULAR VIDEOS (16:9 CARDS) */}
      {regulars.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-border/60">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-sky-500" />
              {activeFilter === "archive"
                ? (tr.library.archivedRegularTitle || "Заархівовані Відео (16:9)")
                : tr.library.regularTitle}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-5">
            {regulars.map((v) => (
              <div
                key={v.path}
                className="group flex flex-col justify-between transition"
              >
                {/* 16:9 Thumbnail */}
                <div
                  className="relative aspect-video rounded-2xl overflow-hidden bg-black/90 cursor-pointer shadow-sm group-hover:shadow-md transition duration-200"
                  onClick={() => onOpenPlayer(v.path)}
                >
                  <img
                    src={getThumbnailUrl(v.path)}
                    alt={v.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                  <div className="absolute inset-0 flex items-center justify-center opacity-80 group-hover:opacity-100 transition">
                    <div className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-primary transition duration-200">
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    </div>
                  </div>

                  <div className="absolute top-2 left-2">
                    <span className="inline-flex items-center gap-1 rounded bg-sky-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
                      <Film className="w-2.5 h-2.5" /> 16:9
                    </span>
                  </div>

                  {v.is_archived && (
                    <div className="absolute top-2 right-2">
                      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold text-amber-300 bg-black/80 backdrop-blur-sm border border-amber-500/40 shadow">
                        <Archive className="w-2.5 h-2.5 text-amber-400" /> Архів
                      </span>
                    </div>
                  )}

                  <div className="absolute bottom-2 right-2">
                    <span className="rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-white">
                      {v.duration_formatted}
                    </span>
                  </div>
                </div>

                {/* Info & Bottom Bar */}
                <div className="pt-2 px-0.5 space-y-2">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p
                        className="text-xs font-semibold text-foreground truncate flex-1 cursor-pointer hover:text-primary transition"
                        onClick={() => onOpenDrawer(v.path)}
                        title={v.title}
                      >
                        {v.title || v.filename}
                      </p>
                      <StatusSelector
                        status={v.status}
                        onChangeStatus={(st) => onUpdateStatus(v.path, st)}
                        lang={lang}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">
                      {v.filename}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-1.5">
                    <button
                      onClick={() => onOpenConverter(v.path)}
                      className="h-7 px-3 rounded-full bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Wand2 className="w-3 h-3" />
                      <span>{tr.library.toShortsBtn}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {v.is_archived ? (
                        <button
                          type="button"
                          onClick={() => unarchiveVideoMutation.mutate(v.path)}
                          disabled={unarchiveVideoMutation.isPending}
                          className="h-7 px-2.5 rounded-full bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                          title={tr.library.unarchiveBtn || "Відновити з архіву"}
                        >
                          <ArchiveRestore className="w-3.5 h-3.5" />
                          <span>Відновити</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => archiveVideoMutation.mutate(v.path)}
                          disabled={archiveVideoMutation.isPending}
                          className="h-7 w-7 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition cursor-pointer disabled:opacity-50"
                          title={tr.library.archiveBtn || "В архів"}
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setDeletingVideo(v)}
                        className="h-7 w-7 rounded-full hover:bg-destructive/15 text-muted-foreground hover:text-destructive flex items-center justify-center transition cursor-pointer"
                        title="Видалити файл з диска"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onOpenDrawer(v.path)}
                        className="h-7 px-3 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground text-foreground text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                      >
                        <CalendarPlus className="w-3 h-3" />
                        <span>{tr.library.scheduleBtn}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={!!deletingVideo}
        onClose={() => setDeletingVideo(null)}
        onConfirm={handleDelete}
        onArchive={
          deletingVideo && !deletingVideo.is_archived
            ? () => {
                archiveVideoMutation.mutate(deletingVideo.path, {
                  onSuccess: () => setDeletingVideo(null),
                });
              }
            : undefined
        }
        isArchiving={archiveVideoMutation.isPending}
        filename={deletingVideo?.filename || ""}
        isDeleting={deleteVideoMutation.isPending}
      />
    </div>
  );
}
