"use client";

import React from "react";
import { Calendar, LayoutGrid, Wand2, History, Plus, Scissors } from "lucide-react";
import { useNavigationTab, usePostDrawer } from "@/hooks/useModals";
import { useAppLanguage } from "@/hooks/useAppLanguage";

export type NavTab = "calendar" | "library" | "editor" | "converter" | "history";

export function DesktopNavigation() {
  const { currentTab, setTab } = useNavigationTab();
  const { tr } = useAppLanguage();

  const items: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: "calendar", label: tr.nav.calendar, icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: "library", label: tr.nav.library, icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { id: "editor", label: tr.nav.editor || "Монтаж", icon: <Scissors className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: "converter", label: tr.nav.converter, icon: <Wand2 className="w-3.5 h-3.5 text-rose-500" /> },
    { id: "history", label: tr.nav.history, icon: <History className="w-3.5 h-3.5" /> },
  ];

  return (
    <nav className="hidden md:inline-flex items-center gap-1 p-1 bg-secondary/70 rounded-full border border-border">
      {items.map((item) => {
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition cursor-pointer ${
              isActive
                ? "bg-foreground text-background font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function MobileBottomBar() {
  const { currentTab, setTab } = useNavigationTab();
  const { openDrawer } = usePostDrawer();
  const { tr } = useAppLanguage();

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-lg border-t border-border px-2 py-1.5 flex items-center justify-around">
      {/* Schedule */}
      <button
        onClick={() => setTab("calendar")}
        className={`flex flex-col items-center gap-0.5 py-1 px-2.5 transition active:scale-90 cursor-pointer ${
          currentTab === "calendar" ? "text-primary font-semibold" : "text-muted-foreground"
        }`}
      >
        <Calendar className="w-5 h-5" />
        <span className="text-[10px]">{tr.nav.calendar}</span>
      </button>

      {/* Library */}
      <button
        onClick={() => setTab("library")}
        className={`flex flex-col items-center gap-0.5 py-1 px-2.5 transition active:scale-90 cursor-pointer ${
          currentTab === "library" ? "text-primary font-semibold" : "text-muted-foreground"
        }`}
      >
        <LayoutGrid className="w-5 h-5" />
        <span className="text-[10px]">{tr.nav.library}</span>
      </button>

      {/* Central Create / Post Button */}
      <div className="relative -top-3">
        <button
          onClick={() => openDrawer()}
          className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg flex items-center justify-center transition active:scale-90 cursor-pointer"
          title="Create / Post video"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* In-App Video Editor */}
      <button
        onClick={() => setTab("editor")}
        className={`flex flex-col items-center gap-0.5 py-1 px-2.5 transition active:scale-90 cursor-pointer ${
          currentTab === "editor" ? "text-primary font-semibold" : "text-muted-foreground"
        }`}
      >
        <Scissors className="w-5 h-5 text-emerald-400" />
        <span className="text-[10px]">{tr.nav.editor ? tr.nav.editor.replace("🎬 ", "") : "Монтаж"}</span>
      </button>

      {/* Shorts Converter */}
      <button
        onClick={() => setTab("converter")}
        className={`flex flex-col items-center gap-0.5 py-1 px-2.5 transition active:scale-90 cursor-pointer ${
          currentTab === "converter" ? "text-primary font-semibold" : "text-muted-foreground"
        }`}
      >
        <Wand2 className="w-5 h-5" />
        <span className="text-[10px]">{tr.nav.converterMob}</span>
      </button>

      {/* History */}
      <button
        onClick={() => setTab("history")}
        className={`flex flex-col items-center gap-0.5 py-1 px-2.5 transition active:scale-90 cursor-pointer ${
          currentTab === "history" ? "text-primary font-semibold" : "text-muted-foreground"
        }`}
      >
        <History className="w-5 h-5" />
        <span className="text-[10px]">{tr.nav.history}</span>
      </button>
    </div>
  );
}
