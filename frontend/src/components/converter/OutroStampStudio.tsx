"use client";

import React from "react";
import { Bell, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OUTRO_PLACEMENT_MODES } from "./constants";

export interface OutroStampStudioProps {
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

export function OutroStampStudio({
  outroMode = "bottom_floating",
  onOutroModeChange,
  activeVideoPath,
  onApplyOutro,
  isApplyingOutro,
}: OutroStampStudioProps) {
  return (
    <div className="w-full rounded-xl border border-border/80 bg-muted/25 p-3.5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5 text-red-500" />
          <span>YouTube Like & Subscribe</span>
        </span>
        <span className="text-[10px] font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 text-amber-400" />
          <span>{outroMode === "bottom_floating" ? "на весь ролик знизу" : "фінал 2.8с"}</span>
        </span>
      </div>

      {/* Dynamic Live Preview Box */}
      <div className="relative rounded-xl border border-white/15 p-3.5 text-center space-y-2.5 transition-all overflow-hidden bg-neutral-950 shadow-inner">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-[9px] font-bold text-red-400">
            🔴 Live YouTube Sticker
          </span>
          <span className="text-[9px] text-muted-foreground font-medium">
            📍 Safe Zone (y = H - h - 200)
          </span>
        </div>

        {/* Animated YouTube Buttons Mockup */}
        <div className="py-2.5 flex flex-col items-center justify-center space-y-2">
          <div className="flex items-center justify-center gap-2 transform transition-transform hover:scale-105">
            {/* White Pill: LIKE */}
            <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-neutral-900 border border-neutral-200 shadow-lg cursor-pointer transition-all animate-pulse">
              <span className="text-sm leading-none">👍</span>
              <span className="font-black text-xs tracking-wide">LIKE</span>
            </div>

            {/* YouTube Red Pill: SUBSCRIBE */}
            <div className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-600 text-white border border-red-700 shadow-xl cursor-pointer transition-all animate-bounce">
              <span className="text-[10px] leading-none">▶</span>
              <span className="font-black text-xs tracking-wider">SUBSCRIBE</span>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground">
            Поява спочатку пілюль, потім тексту • центрування • без пікселізації
          </p>
        </div>
      </div>

      {/* Placement Mode Selector */}
      {onOutroModeChange && (
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground block font-medium">Режим показу:</label>
          <div className="grid grid-cols-2 gap-1.5">
            {OUTRO_PLACEMENT_MODES.map((pm) => (
              <button
                key={pm.id}
                type="button"
                onClick={() => onOutroModeChange(pm.id)}
                className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center justify-between cursor-pointer ${
                  outroMode === pm.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-background border border-border/70 text-foreground hover:bg-secondary"
                }`}
              >
                <span className="truncate">{pm.label}</span>
                {outroMode === pm.id && <Check className="w-3 h-3 shrink-0 ml-1" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Direct 1-Click Action Button */}
      <Button
        size="sm"
        disabled={!activeVideoPath || isApplyingOutro}
        onClick={() => onApplyOutro(activeVideoPath)}
        className="w-full h-9 rounded-xl bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 hover:from-red-700 hover:to-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition active:scale-95 cursor-pointer disabled:opacity-50"
      >
        {isApplyingOutro ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Накладання стікера FFmpeg...</span>
          </>
        ) : (
          <>
            <Bell className="w-3.5 h-3.5" />
            <span>✨ Накласти стікер Like & Subscribe (1 клік)</span>
          </>
        )}
      </Button>
    </div>
  );
}
