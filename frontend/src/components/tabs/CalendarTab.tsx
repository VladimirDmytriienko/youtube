"use client";

import React, { useState, useMemo } from "react";
import { Calendar as CalendarIcon, Clock, Plus, Settings2, Play } from "lucide-react";
import { VideoItem, AppLang, VideoStatus } from "@/types";
import { I18N } from "@/lib/i18n";
import { StatusSelector } from "@/components/common/StatusSelector";
import { Button } from "@/components/ui/button";

import { useAppLanguage } from "@/hooks/useAppLanguage";
import { useCalendar, useVideos, useUpdateVideoStatus } from "@/hooks/useApi";
import { usePostDrawer, useVideoPlayer } from "@/hooks/useModals";
import { getThumbnailUrl } from "@/lib/api";
import { toDateStringYYYYMMDD } from "@/lib/utils";

export function CalendarTab() {
  const { lang, tr } = useAppLanguage();
  const { data: calendarMap = {} } = useCalendar(lang);
  const { data: videos = [] } = useVideos(lang);
  const { openPlayer } = useVideoPlayer();
  const { openDrawer } = usePostDrawer();
  const updateStatusMutation = useUpdateVideoStatus();

  const onOpenPlayer = openPlayer;
  const onOpenDrawer = openDrawer;
  const onUpdateStatus = (path: string, status: VideoStatus) => {
    updateStatusMutation.mutate({ path, status });
  };

  // Generate 14 days around today (-2 to +11 days)
  const days = useMemo(() => {
    const list: { dateStr: string; dateObj: Date; dayNum: number; weekday: string; isToday: boolean }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = -2; i <= 11; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = toDateStringYYYYMMDD(d);
      const isToday = i === 0;
      const weekday = isToday
        ? tr.calendar.today.replace(", ", "")
        : tr.calendar.weekdaysShort[d.getDay()];

      list.push({
        dateStr,
        dateObj: d,
        dayNum: d.getDate(),
        weekday,
        isToday,
      });
    }
    return list;
  }, [lang, tr]);

  const todayStr = useMemo(() => toDateStringYYYYMMDD(), []);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const selectedDayVideos = calendarMap[selectedDate] || [];

  // Upcoming videos across all days
  const upcomingEntries = useMemo(() => {
    return Object.entries(calendarMap)
      .filter(([date, list]) => list && list.length > 0)
      .sort((a, b) => a[0].localeCompare(b[0]));
  }, [calendarMap]);

  // Selected date formatted title
  const selectedDateTitle = useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const isToday = selectedDate === todayStr;
    const weekday = tr.calendar.weekdaysFull[date.getDay()];
    const monthGen = tr.calendar.monthsGenitive[date.getMonth()];
    return `${isToday ? tr.calendar.today : ""}${weekday}, ${d} ${monthGen}`;
  }, [selectedDate, todayStr, tr]);

  return (
    <div className="space-y-5">
      {/* 1. HORIZONTAL DAY PICKER STRIP (Clean Material Carousel) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {days.map((item) => {
          const isSelected = selectedDate === item.dateStr;
          const dayVideos = calendarMap[item.dateStr] || [];
          const hasVideos = dayVideos.length > 0;

          return (
            <button
              key={item.dateStr}
              onClick={() => setSelectedDate(item.dateStr)}
              className={`flex flex-col items-center justify-center min-w-[54px] sm:min-w-[62px] py-2.5 px-2 rounded-2xl transition shrink-0 active:scale-95 cursor-pointer ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                  : "bg-muted/40 hover:bg-muted text-foreground border border-border/40"
              }`}
            >
              <span className={`text-[10px] uppercase font-semibold ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {item.weekday}
              </span>
              <span className="text-base font-bold my-0.5">{item.dayNum}</span>
              {/* Dots indicator */}
              <div className="h-1.5 flex items-center justify-center gap-0.5 mt-0.5">
                {hasVideos && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isSelected ? "bg-primary-foreground" : "bg-primary"
                    }`}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. SELECTED DAY AGENDA CARD (Single clean surface, no card-in-card borders) */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-3.5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {tr.calendar.today.replace(", ", "")} / {tr.nav.calendar}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-foreground capitalize mt-0.5">
              {selectedDateTitle}
            </h3>
          </div>

          <Button
            size="sm"
            onClick={() => onOpenDrawer(undefined, selectedDate)}
            className="h-8 text-xs font-semibold gap-1.5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground transition self-start sm:self-auto cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{tr.calendar.scheduleForDay}</span>
          </Button>
        </div>

        {/* Videos for this day */}
        {selectedDayVideos.length === 0 ? (
          <div className="py-10 px-4 text-center rounded-xl bg-muted/20 space-y-2">
            <CalendarIcon className="w-8 h-8 text-muted-foreground mx-auto stroke-1" />
            <p className="text-xs font-semibold text-foreground">
              {tr.calendar.emptyDayTitle}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {tr.calendar.emptyDaySubtitle}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {selectedDayVideos.map((v) => {
              const timeStr = v.scheduled_for
                ? new Date(v.scheduled_for).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "18:00";

              return (
                <div
                  key={v.path}
                  className="group py-3 px-2 flex items-center justify-between gap-3 hover:bg-muted/30 rounded-xl transition"
                >
                  {/* Thumbnail */}
                  <div
                    className="relative w-16 sm:w-24 aspect-video rounded-lg overflow-hidden bg-black shrink-0 cursor-pointer group/thumb shadow-sm"
                    onClick={() => onOpenPlayer(v.path)}
                  >
                    <img
                      src={getThumbnailUrl(v.path)}
                      alt={v.title}
                      className="w-full h-full object-cover group-hover/thumb:scale-105 transition duration-200"
                    />
                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center group-hover/thumb:bg-black/10 transition">
                      <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          v.is_shorts ? "bg-rose-500/10 text-rose-500" : "bg-sky-500/10 text-sky-500"
                        }`}
                      >
                        {v.is_shorts ? "⚡ Shorts" : "🎬 16:9"}
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {timeStr}
                      </span>
                    </div>

                    <p
                      className="text-xs font-semibold text-foreground truncate cursor-pointer hover:text-primary transition"
                      onClick={() => onOpenDrawer(v.path)}
                      title={v.title}
                    >
                      {v.title || v.filename}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">
                      {v.filename}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <StatusSelector
                      status={v.status}
                      onChangeStatus={(st) => onUpdateStatus(v.path, st)}
                      lang={lang}
                    />

                    <button
                      onClick={() => onOpenDrawer(v.path)}
                      className="h-8 w-8 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition cursor-pointer"
                      title={tr.calendar.editBtn}
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. UPCOMING POSTS AGENDA SECTION */}
      <div className="space-y-3 pt-1">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
          {tr.calendar.upcomingTitle}
        </h4>

        {upcomingEntries.length === 0 ? (
          <div className="p-6 rounded-2xl bg-muted/20 text-center text-xs text-muted-foreground">
            {tr.calendar.upcomingEmpty}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {upcomingEntries.map(([dateKey, list]) => (
              <div key={dateKey} className="rounded-2xl border border-border/60 bg-card p-3.5 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground border-b border-border/50 pb-2">
                  <span className="flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-primary" /> {dateKey}
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {list.length} {tr.calendar.videosCount}
                  </span>
                </div>

                <div className="space-y-1">
                  {list.map((v) => (
                    <div
                      key={v.path}
                      className="flex items-center justify-between gap-2 py-1 px-1.5 rounded-lg hover:bg-accent/50 transition cursor-pointer text-xs"
                      onClick={() => onOpenDrawer(v.path)}
                    >
                      <span className="truncate flex-1 font-medium text-foreground">
                        {v.is_shorts ? "⚡" : "🎬"} {v.title || v.filename}
                      </span>
                      <StatusSelector
                        status={v.status}
                        onChangeStatus={(st) => onUpdateStatus(v.path, st)}
                        lang={lang}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
