"use client";

import React from "react";
import { Film, Smartphone } from "lucide-react";
import { OutroStampStudio } from "./OutroStampStudio";

export interface VideoPreviewPlayerProps {
  thumbUrl: string;
  blurRadius: number;
  dimPercent: number;
  zoom: number;
  yPosPercent: number;
  outroStyle?: string;
  onOutroStyleChange?: (style: string) => void;
  outroMode?: string;
  onOutroModeChange?: (mode: string) => void;
  outroBg?: string;
  onOutroBgChange?: (bg: string) => void;
  activeVideoPath?: string;
  onApplyOutro: (targetVideoPath?: string) => void;
  isApplyingOutro: boolean;
}

export function VideoPreviewPlayer({
  thumbUrl,
  blurRadius,
  dimPercent,
  zoom,
  yPosPercent,
  outroStyle = "youtube_animated_pills",
  onOutroStyleChange,
  outroMode = "bottom_floating",
  onOutroModeChange,
  outroBg,
  onOutroBgChange,
  activeVideoPath,
  onApplyOutro,
  isApplyingOutro,
}: VideoPreviewPlayerProps) {
  return (
    <div className="w-full rounded-2xl border border-border/70 bg-card p-5 sm:p-6 space-y-4 shadow-sm flex flex-col items-center">
      <div className="text-center w-full">
        <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center justify-center gap-1.5">
          <Smartphone className="w-4 h-4 text-primary" />
          <span>Живий макет Shorts (9:16)</span>
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Прев'ю миттєво реагує на зміну масштабу, позиції та анімованих кнопок
        </p>
      </div>

      {/* 9:16 Mockup Frame */}
      <div className="relative w-[210px] h-[373px] sm:w-[240px] sm:h-[426px] rounded-2xl overflow-hidden border-2 border-border/80 shadow-xl bg-black flex items-center justify-center select-none">
        {thumbUrl ? (
          <>
            {/* Background Blurred Image */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${thumbUrl})`,
                filter: `blur(${blurRadius / 3}px) brightness(${1 - dimPercent / 100})`,
                transform: "scale(1.2)",
              }}
            />

            {/* Foreground Scaled Video/Image */}
            <div
              className="absolute w-full flex items-center justify-center pointer-events-none"
              style={{
                top: `${(yPosPercent / 100) * 55}%`,
                transform: "translateY(-50%)",
              }}
            >
              <img
                src={thumbUrl}
                alt="Preview"
                className="w-full object-cover shadow-2xl transition-transform duration-75"
                style={{
                  transform: `scale(${zoom / 100})`,
                }}
              />
            </div>

            {/* Live Animated YouTube Buttons at Lowered Bottom Safe Zone */}
            <div className="absolute bottom-5 inset-x-0 flex items-center justify-center pointer-events-none z-20 transition-all">
              <div className="flex items-center gap-1.5 drop-shadow-md scale-[0.80] sm:scale-90 transition-transform">
                {/* White Pill: LIKE */}
                <div className="flex items-center justify-center gap-1 px-2.5 py-1 rounded-full bg-white text-neutral-900 border border-neutral-200 shadow font-bold text-[10px] animate-pulse">
                  <span>👍</span>
                  <span>LIKE</span>
                </div>
                {/* Red Pill: SUBSCRIBE */}
                <div className="flex items-center justify-center gap-1 px-3 py-1 rounded-full bg-red-600 text-white border border-red-700 shadow font-bold text-[10px] animate-bounce">
                  <span className="text-[8px]">▶</span>
                  <span>SUBSCRIBE</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center p-4">
            <Film className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-xs text-muted-foreground">Оберіть відео зі списку</p>
          </div>
        )}
      </div>

      {/* Outro Stamp Interactive Studio */}
      <OutroStampStudio
        outroStyle={outroStyle}
        onOutroStyleChange={onOutroStyleChange}
        outroMode={outroMode}
        onOutroModeChange={onOutroModeChange}
        outroBg={outroBg}
        onOutroBgChange={onOutroBgChange}
        activeVideoPath={activeVideoPath}
        onApplyOutro={onApplyOutro}
        isApplyingOutro={isApplyingOutro}
      />
    </div>
  );
}
