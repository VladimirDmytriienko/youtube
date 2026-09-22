"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Calendar,
  Clock,
  Sparkles,
  CalendarPlus,
  AlertCircle,
  Archive,
  CheckCircle2,
  LogIn,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlannedShort } from "@/types";
import { useBackgroundTasks } from "@/hooks/useBackgroundTasks";
import { useAuthStatus, useLoginMutation } from "@/hooks/useApi";
import { useQueryClient } from "@tanstack/react-query";
import { parseTags } from "@/lib/utils";
import { toast } from "sonner";

export interface BatchScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  shorts: PlannedShort[];
  detectedGame?: string;
  shortsLanguage?: "en" | "uk";
}

function toDatetimeLocalString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

function formatHumanDateTime(val: string): string {
  if (!val) return "";
  try {
    const d = new Date(val);
    return d.toLocaleString("uk-UA", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return val;
  }
}

export function BatchScheduleModal({
  isOpen,
  onClose,
  shorts,
  detectedGame = "Gaming",
  shortsLanguage = "en",
}: BatchScheduleModalProps) {
  const { data: auth = { authenticated: false } } = useAuthStatus();
  const loginMutation = useLoginMutation();
  const { startUpload } = useBackgroundTasks();
  const queryClient = useQueryClient();

  // Filter only rendered shorts
  const renderedShorts = useMemo(
    () => shorts.filter((s) => !!s.rendered_path),
    [shorts]
  );

  const [scheduledTimes, setScheduledTimes] = useState<Record<string, string>>({});
  const [privacy, setPrivacy] = useState<"scheduled" | "private" | "unlisted" | "public">("scheduled");
  const [archiveAfterPost, setArchiveAfterPost] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize default spaced times (1 video per day at 18:00)
  useEffect(() => {
    if (!isOpen || renderedShorts.length === 0) return;

    const initialTimes: Record<string, string> = {};
    const now = new Date();
    const startDate = new Date();
    if (now.getHours() >= 18) {
      startDate.setDate(startDate.getDate() + 1);
    }
    startDate.setHours(18, 0, 0, 0);

    renderedShorts.forEach((item, idx) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + idx);
      initialTimes[item.id] = toDatetimeLocalString(d);
    });

    setScheduledTimes(initialTimes);
  }, [isOpen, renderedShorts]);

  if (!isOpen) return null;

  // Preset Spacers
  const handleApplyPerDay = (targetHour: number) => {
    const newTimes: Record<string, string> = {};
    const now = new Date();
    const startDate = new Date();
    if (now.getHours() >= targetHour) {
      startDate.setDate(startDate.getDate() + 1);
    }
    startDate.setHours(targetHour, 0, 0, 0);

    renderedShorts.forEach((item, idx) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + idx);
      newTimes[item.id] = toDatetimeLocalString(d);
    });

    setScheduledTimes(newTimes);
    toast.info(`Розподілено: щодня о ${targetHour}:00 (по 1 ролику)`);
  };

  const handleApplyHourly = (gapHours: number) => {
    const newTimes: Record<string, string> = {};
    const now = new Date();
    // Start +1 hour from next rounded hour
    const startDate = new Date(now.getTime() + 60 * 60 * 1000);
    startDate.setMinutes(0, 0, 0);

    renderedShorts.forEach((item, idx) => {
      const d = new Date(startDate.getTime() + idx * gapHours * 60 * 60 * 1000);
      newTimes[item.id] = toDatetimeLocalString(d);
    });

    setScheduledTimes(newTimes);
    toast.info(`Розподілено: кожні ${gapHours} год.`);
  };

  // Submit all
  const handleSubmitBatch = async () => {
    if (renderedShorts.length === 0) {
      toast.error("Немає готових відрендерених Shorts для публікації.");
      return;
    }

    if (!auth?.authenticated) {
      toast.error("Необхідно увійти у свій YouTube-канал перед публікацією.");
      loginMutation.mutate();
      return;
    }

    setIsSubmitting(true);

    try {
      for (const item of renderedShorts) {
        const cleanTitle = item.title.trim();
        const baseDesc = `${cleanTitle}\n\n${item.hook || ""}\n\n#Shorts #${detectedGame.replace(/\s+/g, "")} #Gameplay #Viral`;
        const enDesc = item.rendered_description || item.rendered_localizations?.en?.description || baseDesc;
        const ukDesc = item.rendered_localizations?.uk?.description || baseDesc;

        const enTags =
          item.rendered_tags && item.rendered_default_lang === "en"
            ? item.rendered_tags
            : item.rendered_localizations?.en?.tags
            ? parseTags(item.rendered_localizations.en.tags)
            : parseTags(`Shorts, Highlights, Gaming, Viral, ${detectedGame}`);

        const locMap: Record<string, { title: string; description: string }> = {};
        if (item.rendered_localizations) {
          for (const [code, val] of Object.entries(item.rendered_localizations)) {
            if (code !== "en" && val && typeof val === "object" && (val as any).title) {
              locMap[code] = {
                title: (val as any).title,
                description: (val as any).description || "",
              };
            }
          }
        }
        if (!locMap.uk && ukDesc) {
          locMap.uk = {
            title: item.rendered_localizations?.uk?.title || cleanTitle,
            description: ukDesc,
          };
        }

        let publishAtIso: string | null = null;
        if (privacy === "scheduled" && scheduledTimes[item.id]) {
          try {
            publishAtIso = new Date(scheduledTimes[item.id]).toISOString();
          } catch {
            publishAtIso = `${scheduledTimes[item.id]}:00Z`;
          }
        }

        startUpload({
          video_path: item.rendered_path!,
          title: item.rendered_localizations?.en?.title || cleanTitle,
          description: enDesc,
          tags: enTags,
          privacy: privacy,
          publish_at: publishAtIso,
          is_shorts: true,
          default_lang: "en",
          localizations: locMap,
          custom_thumb_path: null,
          archiveAfterPost: archiveAfterPost,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      queryClient.invalidateQueries({ queryKey: ["videos"] });

      toast.success(`🚀 Усі ${renderedShorts.length} Shorts заплановано у фоні!`, {
        description: "Відео додано у чергу завантаження. Ви можете стежити за прогресом у правому нижньому віджеті.",
        duration: 6000,
      });

      onClose();
    } catch (err: any) {
      toast.error("Помилка планування", { description: err?.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border border-border/80 bg-card shadow-2xl text-foreground overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/60 bg-muted/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <span>Пакетне планування на YouTube</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {renderedShorts.length} Shorts
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Оберіть дату та час для кожного ролика або застосуйте розумний інтервал
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Auth Banner if not authenticated */}
          {!auth?.authenticated && (
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Ви ще не увійшли у свій YouTube-канал.</span>
              </div>
              <Button
                size="sm"
                onClick={() => loginMutation.mutate()}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs h-8 px-3 rounded-lg flex items-center gap-1.5 shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Увійти через Google</span>
              </Button>
            </div>
          )}

          {/* Quick Smart Spacing Presets */}
          <div className="space-y-2 p-3.5 rounded-xl bg-muted/40 border border-border/60">
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Швидкий розумний інтервал (1-клік розклад):</span>
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleApplyPerDay(18)}
                className="py-1.5 px-2.5 rounded-lg border border-border/80 bg-background hover:bg-secondary text-[11px] font-medium text-foreground transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Clock className="w-3 h-3 text-emerald-400" />
                <span>Щодня о 18:00</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyPerDay(20)}
                className="py-1.5 px-2.5 rounded-lg border border-border/80 bg-background hover:bg-secondary text-[11px] font-medium text-foreground transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Clock className="w-3 h-3 text-sky-400" />
                <span>Щодня о 20:00</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyHourly(6)}
                className="py-1.5 px-2.5 rounded-lg border border-border/80 bg-background hover:bg-secondary text-[11px] font-medium text-foreground transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Layers className="w-3 h-3 text-amber-400" />
                <span>Кожні 6 год.</span>
              </button>
              <button
                type="button"
                onClick={() => handleApplyHourly(12)}
                className="py-1.5 px-2.5 rounded-lg border border-border/80 bg-background hover:bg-secondary text-[11px] font-medium text-foreground transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Layers className="w-3 h-3 text-indigo-400" />
                <span>Кожні 12 год.</span>
              </button>
            </div>
          </div>

          {/* List of Rendered Shorts with Custom Timepickers */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-bold text-foreground flex items-center justify-between">
              <span>Готові ролики для публікації:</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                Час можна коригувати окремо під кожен ролик
              </span>
            </label>

            <div className="space-y-2">
              {renderedShorts.map((item, idx) => {
                const currentTimeVal = scheduledTimes[item.id] || "";
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-border/70 bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-border transition"
                  >
                    {/* Video Info */}
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-muted text-[10px] font-bold font-mono text-muted-foreground flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <h4 className="text-xs font-bold text-foreground truncate">
                          {item.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground pl-7">
                        <span className="px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 font-semibold">
                          {item.badge}
                        </span>
                        <span>•</span>
                        <span>{Math.round(item.duration_sec)} сек</span>
                        {currentTimeVal && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400 font-medium">
                              📅 {formatHumanDateTime(currentTimeVal)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Datetime Picker */}
                    <div className="shrink-0 flex items-center gap-2">
                      <div className="relative">
                        <input
                          type="datetime-local"
                          value={currentTimeVal}
                          onChange={(e) => {
                            const val = e.target.value;
                            setScheduledTimes((prev) => ({
                              ...prev,
                              [item.id]: val,
                            }));
                          }}
                          className="h-9 px-3 rounded-lg border border-border bg-muted/30 text-xs font-mono text-foreground outline-none focus:border-primary transition cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Privacy & Archive Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/20 border border-border/60">
            {/* Privacy */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-foreground block">
                Режим видимості YouTube:
              </label>
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value as any)}
                className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground outline-none cursor-pointer"
              >
                <option value="scheduled">📅 За розкладом (Scheduled)</option>
                <option value="public">🌍 Публічне (Public одразу)</option>
                <option value="unlisted">🔗 Доступ за посиланням (Unlisted)</option>
                <option value="private">🔒 Приватне (Private)</option>
              </select>
            </div>

            {/* Archive after post */}
            <div className="flex items-center gap-2 pt-4 sm:pt-5">
              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={archiveAfterPost}
                  onChange={(e) => setArchiveAfterPost(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary cursor-pointer"
                />
                <Archive className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Архівувати після публікації</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-border bg-muted/20 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-full border border-border hover:bg-muted text-xs font-medium text-foreground transition cursor-pointer"
          >
            Скасувати
          </button>

          <Button
            size="sm"
            disabled={isSubmitting || renderedShorts.length === 0}
            onClick={handleSubmitBatch}
            className="h-9 px-5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>
              {isSubmitting
                ? "Планування..."
                : `Запланувати всі (${renderedShorts.length}) у фоні`}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
