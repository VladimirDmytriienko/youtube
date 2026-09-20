"use client";

import React from "react";
import { VideoStatus, AppLang } from "@/types";
import { getStatusConfig, I18N } from "@/lib/i18n";

interface StatusSelectorProps {
  status: VideoStatus;
  onChangeStatus: (newStatus: VideoStatus) => void;
  lang: AppLang;
  size?: "sm" | "default";
}

export function StatusSelector({
  status,
  onChangeStatus,
  lang,
  size = "sm",
}: StatusSelectorProps) {
  const tr = I18N[lang];
  const cfg = getStatusConfig(lang, status);

  const padding = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1.5 text-xs";

  return (
    <select
      value={status}
      onChange={(e) => {
        e.stopPropagation();
        onChangeStatus(e.target.value as VideoStatus);
      }}
      onClick={(e) => e.stopPropagation()}
      className={`font-semibold rounded-full border outline-none cursor-pointer transition ${cfg.badgeClass} ${padding}`}
    >
      <option value="planning">{tr.status.planning}</option>
      <option value="scheduled">{tr.status.scheduled}</option>
      <option value="posted">{tr.status.posted}</option>
    </select>
  );
}
