"use client";

import React, { useEffect, useState } from "react";
import { History as HistoryIcon, Play, ExternalLink } from "lucide-react";
import { HistoryRecord, AppLang, VideoStatus } from "@/types";
import { I18N } from "@/lib/i18n";
import { StatusSelector } from "@/components/common/StatusSelector";

import { useAppLanguage } from "@/hooks/useAppLanguage";
import { useHistory, useUpdateVideoStatus } from "@/hooks/useApi";
import { useVideoPlayer } from "@/hooks/useModals";

export function HistoryTab() {
  const { lang, tr } = useAppLanguage();
  const { data: records = [], isLoading } = useHistory(lang);
  const { openPlayer } = useVideoPlayer();
  const updateStatusMutation = useUpdateVideoStatus();

  const onOpenPlayer = openPlayer;
  const onUpdateStatus = (path: string, status: VideoStatus) => {
    updateStatusMutation.mutate({ path, status });
  };

  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="px-0.5">
        <h2 className="text-sm sm:text-base font-bold tracking-tight text-foreground">
          {tr.history.title}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {tr.history.subtitle}
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-xs text-muted-foreground">
          {tr.history.loading}
        </div>
      ) : records.length === 0 ? (
        <div className="py-12 px-4 rounded-xl border border-dashed border-border bg-card text-center space-y-2">
          <HistoryIcon className="w-8 h-8 text-muted-foreground mx-auto stroke-1" />
          <p className="text-xs font-semibold text-foreground">{tr.history.emptyTitle}</p>
          <p className="text-[11px] text-muted-foreground">{tr.history.emptySubtitle}</p>
        </div>
      ) : (
        <>
          {/* Desktop Table (hidden on mobile) */}
          <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/60 text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-3 px-4 font-semibold">{tr.history.thFormat}</th>
                  <th className="py-3 px-4 font-semibold">{tr.history.thTitle}</th>
                  <th className="py-3 px-4 font-semibold">{tr.history.thFile}</th>
                  <th className="py-3 px-4 font-semibold">{tr.history.thStatus}</th>
                  <th className="py-3 px-4 font-semibold">{tr.history.thDate}</th>
                  <th className="py-3 px-4 font-semibold text-right">{tr.history.thAction}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {records.map((item) => {
                  const targetPath = item.path || item.file_path || "";
                  const dateDisplay = item.scheduled_for
                    ? `🕒 ${new Date(item.scheduled_for).toLocaleString()}`
                    : new Date(item.updated_at).toLocaleDateString();

                  return (
                    <tr key={item.id || targetPath} className="hover:bg-secondary/40 transition">
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-bold ${
                            item.is_shorts
                              ? "bg-rose-500/15 text-rose-500"
                              : "bg-sky-500/15 text-sky-500"
                          }`}
                        >
                          {item.is_shorts ? "⚡ Shorts" : "🎬 16:9"}
                        </span>
                      </td>

                      <td
                        className="py-3 px-4 font-medium text-foreground truncate max-w-[220px] lg:max-w-md xl:max-w-xl cursor-pointer hover:text-primary"
                        onClick={() => targetPath && onOpenPlayer(targetPath)}
                      >
                        ▶ {item.title}
                      </td>

                      <td className="py-3 px-4 font-mono text-muted-foreground text-[11px] truncate max-w-[140px] lg:max-w-xs">
                        {item.filename || item.file}
                      </td>

                      <td className="py-3 px-4">
                        {targetPath ? (
                          <StatusSelector
                            status={item.status || "posted"}
                            onChangeStatus={(st) => onUpdateStatus(targetPath, st)}
                            lang={lang}
                          />
                        ) : (
                          <span className="text-muted-foreground font-mono text-[10px]">{item.status}</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-muted-foreground text-[11px]">
                        {dateDisplay}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {item.youtube_url ? (
                          <a
                            href={item.youtube_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline font-semibold text-[11px]"
                          >
                            <span>YouTube</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : targetPath ? (
                          <button
                            onClick={() => onOpenPlayer(targetPath)}
                            className="text-xs text-primary hover:underline"
                          >
                            {tr.history.watchBtn}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List (hidden on desktop) */}
          <div className="md:hidden space-y-2.5">
            {records.map((item) => {
              const targetPath = item.path || item.file_path || "";
              const dateDisplay = item.scheduled_for
                ? new Date(item.scheduled_for).toLocaleDateString()
                : new Date(item.updated_at).toLocaleDateString();

              return (
                <div
                  key={item.id || targetPath}
                  className="rounded-xl border border-border bg-card p-3 space-y-2 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-bold ${
                        item.is_shorts
                          ? "bg-rose-500/15 text-rose-500"
                          : "bg-sky-500/15 text-sky-500"
                      }`}
                    >
                      {item.is_shorts ? "⚡ Shorts" : "🎬 16:9"}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {dateDisplay}
                    </span>
                  </div>

                  <p
                    className="text-xs font-semibold text-foreground line-clamp-2 cursor-pointer hover:text-primary"
                    onClick={() => targetPath && onOpenPlayer(targetPath)}
                  >
                    ▶ {item.title}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-border/60 text-[11px]">
                    <div>
                      {targetPath && (
                        <StatusSelector
                          status={item.status || "posted"}
                          onChangeStatus={(st) => onUpdateStatus(targetPath, st)}
                          lang={lang}
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {targetPath && (
                        <button
                          onClick={() => onOpenPlayer(targetPath)}
                          className="text-xs text-foreground hover:text-primary font-medium flex items-center gap-0.5"
                        >
                          <Play className="w-3 h-3" />
                          <span>{tr.history.playerBtn}</span>
                        </button>
                      )}
                      {item.youtube_url && (
                        <a
                          href={item.youtube_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-primary font-semibold text-xs"
                        >
                          <span>YouTube</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
