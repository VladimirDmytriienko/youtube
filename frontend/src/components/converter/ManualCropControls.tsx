"use client";

import React from "react";
import {
  Clock,
  Maximize2,
  MoveVertical,
  Sparkles,
  Bell,
  Wand2,
  Loader2,
  CheckCircle2,
  Play,
  CalendarPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoItem } from "@/types";

export interface ManualCropControlsProps {
  startTime: number;
  onStartTimeChange: (val: number) => void;
  duration: number;
  onDurationChange: (val: number) => void;
  zoom: number;
  onZoomChange: (val: number) => void;
  yPosPercent: number;
  onYPosPercentChange: (val: number) => void;
  blurRadius: number;
  onBlurRadiusChange: (val: number) => void;
  dimPercent: number;
  onDimPercentChange: (val: number) => void;
  withOutro: boolean;
  onWithOutroChange: (val: boolean) => void;
  outroStyle: string;
  onOutroStyleChange: (val: string) => void;
  outroBg: string;
  onOutroBgChange: (val: string) => void;
  manualTitle: string;
  onManualTitleChange: (val: string) => void;
  isConverting: boolean;
  onRunConversion: () => void;
  convertedResult: { path: string; title: string } | null;
  onApplyOutro: (targetVideoPath?: string) => void;
  isApplyingOutro: boolean;
  onOpenPlayer: (path: string) => void;
  onOpenDrawer: (path: string) => void;
  formatTime: (sec: number) => string;
  activeVideo: VideoItem | null;
}

export function ManualCropControls({
  startTime,
  onStartTimeChange,
  duration,
  onDurationChange,
  zoom,
  onZoomChange,
  yPosPercent,
  onYPosPercentChange,
  blurRadius,
  onBlurRadiusChange,
  dimPercent,
  onDimPercentChange,
  withOutro,
  onWithOutroChange,
  outroStyle,
  onOutroStyleChange,
  outroBg,
  onOutroBgChange,
  manualTitle,
  onManualTitleChange,
  isConverting,
  onRunConversion,
  convertedResult,
  onApplyOutro,
  isApplyingOutro,
  onOpenPlayer,
  onOpenDrawer,
  formatTime,
  activeVideo,
}: ManualCropControlsProps) {
  return (
    <div className="w-full rounded-2xl border border-border/70 bg-card p-5 sm:p-6 space-y-5 shadow-sm">
      {/* Timing Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Таймінг уривка (Shorts max 60с):</span>
          </label>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-secondary text-foreground font-medium">
            {formatTime(startTime)} - {formatTime(startTime + duration)} ({duration}с)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-muted-foreground block mb-1">Початок (сек):</label>
            <input
              type="number"
              min={0}
              step={1}
              value={startTime}
              onChange={(e) => onStartTimeChange(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full h-9 rounded-lg border border-border bg-background px-2.5 text-xs font-mono focus:ring-1 focus:ring-primary outline-none transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] text-muted-foreground">Тривалість:</label>
              <span className="text-[11px] font-mono font-bold text-foreground">{duration}с</span>
            </div>
            <input
              type="range"
              min={5}
              max={60}
              value={duration}
              onChange={(e) => onDurationChange(parseInt(e.target.value))}
              className="w-full accent-primary h-2 bg-secondary rounded-lg cursor-pointer"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] text-muted-foreground">Швидкий вибір:</span>
          {[15, 30, 45, 60].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onDurationChange(s)}
              className={`text-[10px] px-2.5 py-0.5 rounded-full transition cursor-pointer active:scale-95 ${
                duration === s
                  ? "bg-primary text-primary-foreground font-bold shadow-sm"
                  : "bg-secondary hover:bg-accent text-foreground"
              }`}
            >
              {s}с
            </button>
          ))}
        </div>
      </div>

      {/* Zoom / Scale */}
      <div className="pt-4 border-t border-border/40 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Maximize2 className="w-3.5 h-3.5 text-sky-500" />
            <span>Масштаб головного відео (Zoom):</span>
          </label>
          <span className="text-[11px] font-mono font-bold text-foreground">{zoom}%</span>
        </div>

        <input
          type="range"
          min={100}
          max={150}
          value={zoom}
          onChange={(e) => onZoomChange(parseInt(e.target.value))}
          className="w-full accent-primary h-2 bg-secondary rounded-lg cursor-pointer"
        />
      </div>

      {/* Y Position */}
      <div className="pt-4 border-t border-border/40 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <MoveVertical className="w-3.5 h-3.5 text-emerald-500" />
            <span>Вертикальне положення (Y-позиція):</span>
          </label>
          <span className="text-[11px] font-mono font-bold text-foreground">{yPosPercent}%</span>
        </div>

        <input
          type="range"
          min={0}
          max={100}
          value={yPosPercent}
          onChange={(e) => onYPosPercentChange(parseInt(e.target.value))}
          className="w-full accent-primary h-2 bg-secondary rounded-lg cursor-pointer"
        />
      </div>

      {/* Blur & Dim */}
      <div className="pt-4 border-t border-border/40 space-y-3">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          <span>Ефекти розмитого фону:</span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-muted-foreground">Сила блюру:</span>
              <span className="text-[11px] font-mono font-bold text-foreground">{blurRadius}px</span>
            </div>
            <input
              type="range"
              min={10}
              max={45}
              value={blurRadius}
              onChange={(e) => onBlurRadiusChange(parseInt(e.target.value))}
              className="w-full accent-primary h-2 bg-secondary rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-muted-foreground">Затемнення фону:</span>
              <span className="text-[11px] font-mono font-bold text-foreground">{dimPercent}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              value={dimPercent}
              onChange={(e) => onDimPercentChange(parseInt(e.target.value))}
              className="w-full accent-primary h-2 bg-secondary rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Outro CTA Block in Manual Converter */}
      <div className="pt-4 border-t border-border/40 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={withOutro}
              onChange={(e) => onWithOutroChange(e.target.checked)}
              className="w-4 h-4 rounded accent-primary cursor-pointer"
            />
            <Bell className="w-3.5 h-3.5 text-red-500" />
            <span>🔴 Живі кнопки YouTube (Like & Subscribe)</span>
          </label>
          <span className="text-[10px] text-muted-foreground font-mono">
            {withOutro ? "ВКЛ" : "ВИКЛ"}
          </span>
        </div>

        {withOutro && (
          <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              Плаваючий стікер у зоні безпеки (знизу)
            </span>
            <div className="flex items-center gap-1.5 scale-90 origin-right">
              <span className="px-2 py-0.5 rounded-full bg-white text-black font-black text-[10px] shadow-xs">👍 LIKE</span>
              <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-black text-[10px] shadow-xs">▶ SUBSCRIBE</span>
            </div>
          </div>
        )}
      </div>

      {/* Manual Title */}
      <div className="pt-4 border-t border-border/40 space-y-1.5">
        <label className="text-xs font-semibold text-foreground">
          Назва для YouTube Shorts:
        </label>
        <input
          type="text"
          value={manualTitle}
          onChange={(e) => onManualTitleChange(e.target.value)}
          placeholder="Назва ролика #Shorts..."
          className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs focus:ring-1 focus:ring-primary outline-none transition"
        />
      </div>

      {/* Manual Run Button */}
      <Button
        size="lg"
        disabled={!activeVideo || isConverting}
        onClick={onRunConversion}
        className="w-full h-11 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
      >
        {isConverting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Кодування FFmpeg...</span>
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4" />
            <span>⚡ Згенерувати вертикальний Shorts (FFmpeg)</span>
          </>
        )}
      </Button>

      {/* Converted Result */}
      {convertedResult && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-xs font-bold text-foreground">Shorts успішно створено!</p>
              <p className="text-[11px] text-muted-foreground truncate max-w-[280px]">
                {convertedResult.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onApplyOutro(convertedResult.path)}
              disabled={isApplyingOutro}
              className="h-8 px-2.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              title="Додати Like & Subscribe аутро до цього готового ролика"
            >
              {isApplyingOutro ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
              <span>+Аутро</span>
            </button>
            <button
              onClick={() => onOpenPlayer(convertedResult.path)}
              className="h-8 px-3 rounded-full bg-secondary hover:bg-accent text-xs font-semibold text-foreground flex items-center gap-1 transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Перегляд</span>
            </button>
            <button
              onClick={() => onOpenDrawer(convertedResult.path)}
              className="h-8 px-3 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>У розклад</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
