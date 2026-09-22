"use client";

import React, { useState } from "react";
import { X, CalendarPlus, Film, Zap, Trash2 } from "lucide-react";
import { useVideoPlayer, usePostDrawer } from "@/hooks/useModals";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { useVideos, useDeleteVideoMutation } from "@/hooks/useApi";
import { ConfirmDeleteModal } from "@/components/modals/ConfirmDeleteModal";

export function VideoPlayerModal() {
  const { isOpen, videoPath, closePlayer } = useVideoPlayer();
  const { openDrawer } = usePostDrawer();
  const { lang, tr } = useAppLanguage();
  const { data: videos = [] } = useVideos(lang);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteVideoMutation = useDeleteVideoMutation();

  const fallbackVideo = videoPath
    ? {
        path: videoPath,
        filename: videoPath.split(/[/\\]/).pop() || "Video",
        folder: "root",
        size_mb: 0,
        duration: 0,
        duration_formatted: "0:00",
        resolution: "1080x1920",
        aspect_ratio: "9:16",
        is_shorts: true,
        title: videoPath.split(/[/\\]/).pop()?.replace(/\.[^/.]+$/, "") || "Video",
        title_options: [],
        description: "",
        tags: [],
        status: "planning" as const,
        scheduled_for: null,
        youtube_url: null,
      }
    : null;

  const video = videos.find((v) => v.path === videoPath) || fallbackVideo;

  if (!isOpen || !video) return null;

  const streamUrl = `/api/video-stream?path=${encodeURIComponent(video.path)}`;

  const handleOpenDrawerFromPlayer = () => {
    closePlayer();
    openDrawer(video.path);
  };

  const handleDelete = () => {
    deleteVideoMutation.mutate(video.path, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        closePlayer();
      },
    });
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
      onClick={closePlayer}
    >
      <div
        className="relative w-full max-w-5xl bg-card border border-border text-card-foreground rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                video.is_shorts
                  ? "bg-rose-500/15 text-rose-500"
                  : "bg-sky-500/15 text-sky-500"
              }`}
            >
              {video.is_shorts ? <Zap className="w-3 h-3" /> : <Film className="w-3 h-3" />}
              {video.is_shorts ? "Shorts (9:16)" : "16:9"}
            </span>

            <h3 className="text-xs sm:text-sm font-semibold text-foreground truncate" title={video.title}>
              {video.title || video.filename}
            </h3>
          </div>

          <button
            onClick={closePlayer}
            className="w-8 h-8 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video Player Canvas */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[260px] sm:min-h-[420px]">
          <video
            src={streamUrl}
            controls
            autoPlay
            playsInline
            className={`w-full h-full object-contain ${
              video.is_shorts ? "max-h-[65vh] max-w-[360px]" : "max-h-[65vh]"
            }`}
          />
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-3 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span>{video.duration_formatted}</span>
            <span>•</span>
            <span>{video.resolution}</span>
            <span>•</span>
            <span>{video.size_mb} MB</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="h-8 px-3 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-xs font-medium flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="Видалити файл з комп'ютера"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Видалити файл</span>
            </button>

            <button
              onClick={handleOpenDrawerFromPlayer}
              className="h-8 px-4 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>{tr.library.postBtn}</span>
            </button>
          </div>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        filename={video.filename}
        isDeleting={deleteVideoMutation.isPending}
      />
    </div>
  );
}
