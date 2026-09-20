"use client";

import React from "react";
import { ShieldCheck, Film, Zap, Save, Loader2 } from "lucide-react";
import { VideoItem, VideoStatus, PostFormData } from "@/types";
import { StudioSelect, StudioSelectOption } from "@/components/ui/studio-select";

export interface Step3ChecksProps {
  video: VideoItem | null;
  form: PostFormData;
  updateForm: (patch: Partial<PostFormData> | ((prev: PostFormData) => Partial<PostFormData>)) => void;
  isSavingStatus: boolean;
  onSaveManualStatus: () => void;
  tr: any;
}

export function Step3Checks({
  video,
  form,
  updateForm,
  isSavingStatus,
  onSaveManualStatus,
  tr,
}: Step3ChecksProps) {
  const { manualStatus } = form;
  const statusOptions: StudioSelectOption[] = [
    { value: "planning", label: `⏳ ${tr.status.planning}` },
    { value: "scheduled", label: `🕒 ${tr.status.scheduled}` },
    { value: "posted", label: `✅ ${tr.status.posted}` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground">
          {tr.drawer.checksTitle || "Перевірки"}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {tr.drawer.checksSubtitle || "Ми перевіримо ваше відео на наявність проблем із дотриманням авторських прав."}
        </p>
      </div>

      {/* 1. Copyright Check Notice */}
      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 space-y-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <h4 className="text-xs font-semibold">
            {tr.drawer.checksCopyright || "Авторські права: Проблем не виявлено"}
          </h4>
        </div>
        <p className="text-[11px] text-muted-foreground pl-7">
          {tr.drawer.checksCopyrightDesc || "У вашому відео не виявлено контенту, захищеного авторським правом."}
        </p>
      </div>

      {/* 2. Format & Technical Information */}
      <div className="p-3.5 rounded-xl bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {video?.is_shorts ? (
            <Zap className="w-5 h-5 text-rose-500 shrink-0" />
          ) : (
            <Film className="w-5 h-5 text-primary shrink-0" />
          )}
          <div>
            <h4 className="text-xs font-semibold text-foreground">
              {video?.is_shorts ? "9:16 YouTube Shorts" : "16:9 Стандартне відео"}
            </h4>
            <p className="text-[11px] text-muted-foreground">
              {video?.resolution || "1080x1920"} • {video?.duration_formatted || "00:00"}
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-muted-foreground font-medium">
          {video?.size_mb || 0} MB
        </span>
      </div>

      {/* 3. SQLite Database Status Selector */}
      <div className="p-3.5 rounded-xl bg-muted/20 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-foreground">
              {tr.drawer.statusLabel || "Статус у локальній базі даних"}
            </h4>
            <p className="text-[11px] text-muted-foreground">
              {tr.drawer.statusHint || "Збережіть статус у базі SQLite без публікації"}
            </p>
          </div>

          <button
            type="button"
            disabled={isSavingStatus}
            onClick={onSaveManualStatus}
            className="h-8 px-3 rounded-full border border-border hover:bg-accent text-xs font-medium flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isSavingStatus ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{tr.drawer.saveStatusBtn || "Зберегти"}</span>
          </button>
        </div>

        <StudioSelect
          value={manualStatus}
          onChange={(v) => updateForm({ manualStatus: v as VideoStatus })}
          options={statusOptions}
        />
      </div>
    </div>
  );
}
