"use client";

import React from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OUTRO_STYLES, OUTRO_BG_MODES } from "./constants";

export interface OutroStampStudioProps {
  outroStyle: string;
  onOutroStyleChange: (style: string) => void;
  outroBg: string;
  onOutroBgChange: (bg: string) => void;
  activeVideoPath?: string;
  onApplyOutro: (targetVideoPath?: string) => void;
  isApplyingOutro: boolean;
}

export function OutroStampStudio({
  outroStyle,
  onOutroStyleChange,
  outroBg,
  onOutroBgChange,
  activeVideoPath,
  onApplyOutro,
  isApplyingOutro,
}: OutroStampStudioProps) {
  const curStyle = OUTRO_STYLES.find((s) => s.id === outroStyle) || OUTRO_STYLES[0];

  return (
    <div className="w-full rounded-xl border border-border/80 bg-muted/25 p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5 text-amber-400" />
          <span>Outro: Like & Subscribe</span>
        </span>
        <span className="text-[10px] font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
          останні 2.8с
        </span>
      </div>

      {/* Dynamic Live CTA Stamp Visual Mockup */}
      <div
        className={`relative rounded-xl border border-white/15 p-3.5 text-center space-y-2 transition-all ${
          outroBg === "deep_black" ? "bg-black" : "bg-neutral-900/90"
        } shadow-inner`}
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-[9px] font-bold text-gray-200">
            {curStyle.badge}
          </span>
          <span className="text-[9px] text-muted-foreground font-medium">
            {outroBg === "deep_black" ? "⬛ Чорний екран (100%)" : "🎬 Кіно-затемнення (78%)"}
          </span>
        </div>

        {/* Authentic Double-Border Minimalist Stamp */}
        <div
          className="mx-auto rounded-lg p-2.5 max-w-[260px] transition-all"
          style={{
            border: `2.5px solid ${curStyle.accent}`,
            boxShadow: `0 0 14px ${curStyle.accent}33`,
          }}
        >
          <div
            className="rounded p-2 flex flex-col items-center justify-center gap-0.5"
            style={{
              border: `1.5px solid ${curStyle.accent}`,
            }}
          >
            {curStyle.lines.map((line, idx) => (
              <div
                key={idx}
                className="font-black text-white uppercase tracking-widest text-sm sm:text-base leading-tight"
                style={{
                  textShadow: "0 2px 6px rgba(0,0,0,0.9)",
                }}
              >
                {line}
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground">
          Мінімалістична печать без замилювання • плавний фейд 2.8с
        </p>
      </div>

      {/* Template Style Selector Chips */}
      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground block font-medium">Оберіть заготовку:</label>
        <div className="grid grid-cols-2 gap-1.5">
          {OUTRO_STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onOutroStyleChange(s.id)}
              className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center justify-between cursor-pointer ${
                outroStyle === s.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-background border border-border/70 text-foreground hover:bg-secondary"
              }`}
            >
              <span className="truncate">{s.name}</span>
              {outroStyle === s.id && <Check className="w-3 h-3 shrink-0 ml-1" />}
            </button>
          ))}
        </div>
      </div>

      {/* Background Mode Selector */}
      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground block font-medium">Ефект фону:</label>
        <div className="grid grid-cols-2 gap-1.5">
          {OUTRO_BG_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onOutroBgChange(m.id)}
              className={`px-2 py-1 rounded-lg text-[10px] font-medium transition cursor-pointer text-center truncate ${
                outroBg === m.id
                  ? "bg-secondary text-foreground border border-border font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground bg-background/50 border border-transparent"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Direct 1-Click Action Button */}
      <Button
        size="sm"
        disabled={!activeVideoPath || isApplyingOutro}
        onClick={() => onApplyOutro(activeVideoPath)}
        className="w-full h-9 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition active:scale-95 cursor-pointer disabled:opacity-50"
      >
        {isApplyingOutro ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Накладання аутро FFmpeg...</span>
          </>
        ) : (
          <>
            <Bell className="w-3.5 h-3.5" />
            <span>🔔 Додати Like & Subscribe (1 клік)</span>
          </>
        )}
      </Button>
    </div>
  );
}
