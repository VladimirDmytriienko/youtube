"use client";

import React, { useMemo } from "react";
import { CheckCircle2, AlertCircle, LogIn, ExternalLink } from "lucide-react";
import { AuthStatus, PostFormData } from "@/types";
import { StudioDatePicker } from "@/components/ui/studio-date-picker";
import { StudioTimePicker } from "@/components/ui/studio-time-picker";
import { toDateStringYYYYMMDD } from "@/lib/utils";

export interface Step4VisibilityProps {
  form: PostFormData;
  updateForm: (patch: Partial<PostFormData> | ((prev: PostFormData) => Partial<PostFormData>)) => void;
  auth: AuthStatus;
  onLogin?: () => void;
  lang?: "uk" | "en";
  tr: any;
}

export function Step4Visibility({
  form,
  updateForm,
  auth,
  onLogin,
  lang = "uk",
  tr,
}: Step4VisibilityProps) {
  const { privacy, dateStr, timeStr } = form;
  const privacyOptions = [
    { id: "scheduled", title: tr.drawer.visScheduled || "Запланувати", desc: tr.drawer.visScheduledDesc || "Вкажіть точний час, коли відео стане загальнодоступним" },
    { id: "public", title: tr.drawer.visPublic || "Для всіх", desc: tr.drawer.visPublicDesc || "Відео буде опубліковано одразу для всіх глядачів" },
    { id: "unlisted", title: tr.drawer.visUnlisted || "Не для всіх", desc: tr.drawer.visUnlistedDesc || "Переглядати можуть лише користувачі, які мають посилання" },
    { id: "private", title: tr.drawer.visPrivate || "Приватне", desc: tr.drawer.visPrivateDesc || "Відео буде доступне лише вам" },
  ];

  const todayStr = useMemo(() => toDateStringYYYYMMDD(), []);

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h3 className="text-base font-semibold text-foreground">
          {tr.drawer.privacyLabel || "Видимість та розклад"}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Оберіть параметри доступу та дату автоматичної публікації.
        </p>
      </div>

      {/* 1. YouTube Channel Identity Banner */}
      {auth?.authenticated ? (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/60">
          <div className="flex items-center gap-2.5 min-w-0">
            {auth.channel_avatar ? (
              <img
                src={auth.channel_avatar}
                alt={auth.channel_title || "Channel"}
                className="w-8 h-8 rounded-full object-cover shrink-0"
              />
            ) : (
              <span className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                YT
              </span>
            )}
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-foreground truncate">
                  {auth.channel_title || "Мій YouTube Канал"}
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              </div>
              <p className="text-[10px] text-muted-foreground font-mono truncate">
                {auth.channel_handle || auth.channel_id || "Канал підключено"}
              </p>
            </div>
          </div>

          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold shrink-0">
            Готово до публікації
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <h4 className="font-semibold text-foreground">
                Канал YouTube ще не підключено
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Увійдіть для завантаження відео прямо на ваш канал.
              </p>
            </div>
          </div>

          {onLogin && (
            <button
              type="button"
              onClick={onLogin}
              className="h-8 px-3.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shrink-0 transition active:scale-95 shadow-sm"
            >
              Увійти
            </button>
          )}
        </div>
      )}

      {/* 2. Privacy Mode Selection List */}
      <div className="space-y-3">
        <label className="text-[11px] font-medium text-muted-foreground block">
          Параметри видимості
        </label>

        <div className="space-y-2">
          {privacyOptions.map((opt) => {
            const isSelected = privacy === opt.id;
            return (
              <label
                key={opt.id}
                className={`flex items-start gap-3 p-3 rounded-xl transition cursor-pointer ${
                  isSelected
                    ? "bg-primary/5 border border-primary/40 shadow-sm"
                    : "bg-muted/20 hover:bg-muted/40 border border-transparent"
                }`}
              >
                <input
                  type="radio"
                  name="visibility_mode"
                  checked={isSelected}
                  onChange={() => updateForm({ privacy: opt.id })}
                  className="w-4 h-4 mt-0.5 accent-primary cursor-pointer"
                />
                <div>
                  <span className={`text-xs font-semibold block transition ${
                    isSelected ? "text-primary" : "text-foreground"
                  }`}>
                    {opt.title}
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {opt.desc}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* 3. Schedule Pickers (Only if 'scheduled' selected) */}
      {privacy === "scheduled" && (
        <div className="p-4 rounded-xl bg-muted/30 space-y-3">
          <div>
            <h4 className="text-xs font-semibold text-foreground">
              {tr.drawer.dateLabel || "Дата і час публікації"}
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Відео буде опубліковано автоматично у вказаний момент.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <StudioDatePicker
              label="Дата"
              value={dateStr}
              onChange={(d) => updateForm({ dateStr: d })}
              minDate={todayStr}
              lang={lang}
            />

            <StudioTimePicker
              label="Час"
              value={timeStr}
              onChange={(t) => updateForm({ timeStr: t })}
            />
          </div>

          <div className="text-[10px] text-muted-foreground font-mono pt-1">
            Часовий пояс: місцевий (за системним годинником вашого пристрою)
          </div>
        </div>
      )}

      {/* 4. Archive option */}
      <div className="p-3.5 rounded-xl bg-muted/20 border border-border/60">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={!!form.archiveAfterPost}
            onChange={(e) => updateForm({ archiveAfterPost: e.target.checked })}
            className="w-4 h-4 mt-0.5 rounded accent-primary cursor-pointer"
          />
          <div>
            <span className="text-xs font-semibold text-foreground block">
              📦 Перемістити відео в архів після публікації
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              Відео буде автоматично переміщено в підпапку archive на комп&apos;ютері, щоб не відображатися у списку активних роликів.
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}
