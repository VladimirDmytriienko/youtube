"use client";

import React, { useState } from "react";
import { Play, Copy, Check, ExternalLink, Film, Zap } from "lucide-react";
import { VideoItem } from "@/types";
import { getThumbnailUrl } from "@/lib/api";
import { toast } from "sonner";

export interface VideoPreviewRailProps {
  video: VideoItem | null;
  onOpenPlayer: (path: string) => void;
  customThumbUrl?: string | null;
  title?: string;
  tr: any;
}

export function VideoPreviewRail({
  video,
  onOpenPlayer,
  customThumbUrl,
  title,
  tr,
}: VideoPreviewRailProps) {
  const [copied, setCopied] = useState(false);

  if (!video) {
    return (
      <div className="rounded-2xl bg-muted/40 p-6 text-center text-xs text-muted-foreground flex flex-col items-center justify-center min-h-[300px]">
        <Film className="w-8 h-8 text-muted-foreground/50 mb-2 stroke-1" />
        <p className="font-medium">{tr.drawer.selectVideoPrompt || "Оберіть відео для перегляду"}</p>
      </div>
    );
  }

  const thumbSrc =
    customThumbUrl || getThumbnailUrl(video.path);
  const fakeYtLink = `https://youtu.be/${video.filename.slice(0, 11).replace(/[^a-zA-Z0-9]/g, "x")}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fakeYtLink);
    setCopied(true);
    toast.success("Посилання скопійовано в буфер обміну");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl bg-muted/30 p-4 space-y-3.5">
      {/* Thumbnail / Player Launcher */}
      <div
        onClick={() => onOpenPlayer(video.path)}
        className="group/thumb relative aspect-video w-full rounded-xl overflow-hidden bg-black/60 cursor-pointer shadow-sm"
      >
        <img
          src={thumbSrc}
          alt={video.title}
          className="w-full h-full object-cover group-hover/thumb:scale-105 transition duration-300"
        />
        <div className="absolute inset-0 bg-black/30 group-hover/thumb:bg-black/10 transition" />

        {/* Play Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-11 h-11 rounded-full bg-black/70 backdrop-blur-sm text-white flex items-center justify-center group-hover/thumb:scale-110 group-hover/thumb:bg-primary transition duration-200 shadow-md">
            <Play className="w-4 h-4 fill-white ml-0.5" />
          </div>
        </div>

        {/* Format Badge */}
        <div className="absolute top-2 left-2">
          <span
            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-bold text-white shadow ${
              video.is_shorts ? "bg-rose-600" : "bg-sky-600"
            }`}
          >
            {video.is_shorts ? <Zap className="w-2.5 h-2.5" /> : <Film className="w-2.5 h-2.5" />}
            {video.is_shorts ? "Shorts" : "16:9"}
          </span>
        </div>

        {/* Duration */}
        <div className="absolute bottom-2 right-2">
          <span className="rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-white">
            {video.duration_formatted}
          </span>
        </div>
      </div>

      {/* Video Details */}
      <div className="space-y-2">
        <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground block">
          {tr.drawer.videoPreviewTitle || "Попередній перегляд"}
        </span>
        <h4 className="text-xs font-semibold text-foreground line-clamp-2 leading-relaxed">
          {title || video.title || video.filename}
        </h4>

        {/* YouTube Link Box */}
        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background border border-border/70 text-xs">
          <div className="truncate min-w-0 font-mono text-[11px] text-primary">
            {fakeYtLink}
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-7 h-7 rounded hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition shrink-0"
            title="Copy Link"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* File Meta Tags */}
        <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="truncate max-w-[170px]" title={video.filename}>
            {video.filename}
          </span>
          <span>•</span>
          <span className="font-mono">{video.resolution}</span>
          <span>•</span>
          <span className="font-mono">{video.size_mb} MB</span>
        </div>
      </div>
    </div>
  );
}
