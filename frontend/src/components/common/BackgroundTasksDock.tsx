"use client";

import React from "react";
import {
  Maximize2,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Film,
  Zap,
} from "lucide-react";
import { usePostDrawer } from "@/hooks/useModals";
import { useBackgroundTasks } from "@/hooks/useBackgroundTasks";
import { useVideos } from "@/hooks/useApi";
import { getThumbnailUrl } from "@/lib/api";

export function BackgroundTasksDock() {
  const { isOpen, isMinimized, videoPath, restoreDrawer, closeDrawer } = usePostDrawer();
  const { tasks, dismissTask } = useBackgroundTasks();
  const { data: videos = [] } = useVideos();

  const currentVideo = videoPath ? videos.find((v) => v.path === videoPath) || null : null;
  const isDrawerMinimized = isOpen && isMinimized;
  const hasTasks = tasks.length > 0;

  if (!isDrawerMinimized && !hasTasks) {
    return null;
  }

  return (
    <aside
      aria-label="Панель фонових завдань"
      className="fixed bottom-20 md:bottom-6 right-3 sm:right-6 z-[60] flex flex-col items-end gap-2 max-w-[360px] sm:max-w-md w-full pointer-events-none"
    >
      {/* 1. Minimized Post Drawer Card */}
      {isDrawerMinimized && (
        <div
          role="button"
          tabIndex={0}
          onClick={restoreDrawer}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              restoreDrawer();
            }
          }}
          className="pointer-events-auto w-full bg-card/95 backdrop-blur-md border border-primary/40 text-card-foreground shadow-2xl rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-4 duration-200 cursor-pointer hover:border-primary transition group hover:shadow-primary/10"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-black/60 shrink-0 border border-border">
              {currentVideo ? (
                <img
                  src={getThumbnailUrl(currentVideo.path)}
                  alt={currentVideo.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Film className="w-4 h-4" />
                </div>
              )}
              {currentVideo?.is_shorts && (
                <span className="absolute bottom-0.5 right-0.5 p-0.5 bg-rose-600 rounded text-[7px] text-white">
                  <Zap className="w-2 h-2" />
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Студія публікації
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              </div>
              <h4 className="text-xs font-semibold text-foreground truncate max-w-[190px] sm:max-w-[240px]">
                {currentVideo?.title || currentVideo?.filename || "Чернетка ролика"}
              </h4>
              <p className="text-[10px] text-muted-foreground">
                Клікніть, щоб розгорнути вікно 🗖
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={restoreDrawer}
              className="h-8 w-8 rounded-full hover:bg-accent text-foreground flex items-center justify-center transition cursor-pointer"
              title="Розгорнути модалку"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={closeDrawer}
              className="h-8 w-8 rounded-full hover:bg-destructive/15 text-muted-foreground hover:text-destructive flex items-center justify-center transition cursor-pointer"
              title="Закрити"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Active Background Tasks (Uploads & Deploys) */}
      {tasks.map((task) => {
        const isUploading = task.status === "uploading";
        const isSuccess = task.status === "success";
        const isError = task.status === "error";

        return (
          <div
            key={task.id}
            className={`pointer-events-auto w-full backdrop-blur-md border shadow-xl rounded-2xl p-2.5 px-3 flex items-center justify-between gap-2.5 animate-in slide-in-from-bottom-2 duration-150 ${
              isUploading
                ? "bg-sky-950/90 border-sky-500/40 text-sky-100"
                : isSuccess
                ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-100"
                : "bg-destructive/20 border-destructive/50 text-destructive-foreground"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {isUploading && <Loader2 className="w-4 h-4 animate-spin text-sky-400 shrink-0" />}
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {isError && <AlertCircle className="w-4 h-4 text-destructive shrink-0" />}

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {isUploading ? "YouTube Завантаження" : isSuccess ? "Опубліковано" : "Помилка"}
                  </span>
                  {task.isShorts && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300">
                      Shorts
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium truncate max-w-[200px] sm:max-w-[250px] opacity-90">
                  {task.title}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {task.youtubeUrl && (
                <a
                  href={task.youtubeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="h-7 px-2 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-semibold flex items-center gap-1 transition"
                  title="Відкрити ролик на YouTube"
                >
                  <span>Дивитись</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              <button
                type="button"
                onClick={() => dismissTask(task.id)}
                className="h-7 w-7 rounded-full hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition cursor-pointer"
                title="Приховати сповіщення"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </aside>
  );
}
