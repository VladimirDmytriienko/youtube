"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLang } from "@/types";
import { I18N } from "@/lib/i18n";
import { toast } from "sonner";

export const LANG_KEY = ["clientState", "language"] as const;

export function useAppLanguage() {
  const queryClient = useQueryClient();

  const { data: lang = "uk" } = useQuery<AppLang>({
    queryKey: LANG_KEY,
    queryFn: () => "uk",
    staleTime: Infinity,
    gcTime: Infinity,
    initialData: "uk",
  });

  // Client-only sync with localStorage to prevent Next.js SSR hydration mismatch
  useEffect(() => {
    try {
      const saved = localStorage.getItem("yt_scheduler_lang") as AppLang | null;
      if (saved && (saved === "uk" || saved === "en") && saved !== lang) {
        queryClient.setQueryData(LANG_KEY, saved);
        document.documentElement.lang = saved;
      }
    } catch {
      // ignore
    }
  }, [lang, queryClient]);

  const toggleLang = () => {
    const next: AppLang = lang === "uk" ? "en" : "uk";
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("yt_scheduler_lang", next);
        document.documentElement.lang = next;
      } catch {
        // ignore
      }
    }
    queryClient.setQueryData(LANG_KEY, next);
    const tr = I18N[next];
    toast.info(tr.toasts.langChange, { description: tr.toasts.langSet });
  };

  const setLang = (next: AppLang) => {
    if (next === lang) return;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("yt_scheduler_lang", next);
        document.documentElement.lang = next;
      } catch {
        // ignore
      }
    }
    queryClient.setQueryData(LANG_KEY, next);
    const trNext = I18N[next];
    toast.info(trNext.toasts.langChange, { description: trNext.toasts.langSet });
  };

  return {
    lang,
    tr: I18N[lang],
    toggleLang,
    setLang,
  };
}
