"use client";

import React from "react";
import { Header } from "@/components/layout/Header";
import { DesktopNavigation, MobileBottomBar } from "@/components/layout/Navigation";
import { CalendarTab } from "@/components/tabs/CalendarTab";
import { LibraryTab } from "@/components/tabs/LibraryTab";
import { EditorTab } from "@/components/tabs/EditorTab";
import { ConverterTab } from "@/components/tabs/ConverterTab";
import { HistoryTab } from "@/components/tabs/HistoryTab";
import { VideoPlayerModal } from "@/components/modals/VideoPlayerModal";
import { PostDrawer } from "@/components/modals/PostDrawer";
import { AiSettingsModal } from "@/components/modals/AiSettingsModal";
import { useNavigationTab, usePostDrawer } from "@/hooks/useModals";
import { useAppLanguage } from "@/hooks/useAppLanguage";

export default function HomePage() {
  const { currentTab } = useNavigationTab();
  const { openDrawer } = usePostDrawer();
  const { tr } = useAppLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* App Header (Zero props!) */}
      <Header />

      {/* Main Content Area */}
      {currentTab === "editor" ? (
        <main className="flex-1 w-full flex flex-col min-h-0 overflow-hidden">
          {/* Slim top tab switcher bar for editor */}
          <div className="px-3 py-1.5 border-b border-[#20232d] bg-[#0c0d12] flex items-center justify-between shrink-0">
            <DesktopNavigation />

            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => openDrawer()}
                className="h-8 px-3 rounded-full bg-[#3ea6ff] hover:bg-[#65b8ff] text-black text-xs font-semibold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <span className="text-base leading-none font-bold">+</span>
                <span>{tr.calendar.scheduleForDay.replace("+ ", "")}</span>
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            <EditorTab />
          </div>
        </main>
      ) : (
        <main className="flex-1 w-full max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-24 md:pb-12 space-y-4">
          {/* Desktop Top Tabs Navigation */}
          <div className="flex items-center justify-between">
            <DesktopNavigation />

            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => openDrawer()}
                className="h-9 px-4 rounded-full bg-[#3ea6ff] hover:bg-[#65b8ff] text-black text-xs font-semibold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <span className="text-base leading-none font-bold">+</span>
                <span>{tr.calendar.scheduleForDay.replace("+ ", "")}</span>
              </button>
            </div>
          </div>

          {/* Tab Content (Zero props!) */}
          {currentTab === "calendar" && <CalendarTab />}
          {currentTab === "library" && <LibraryTab />}
          {currentTab === "converter" && <ConverterTab />}
          {currentTab === "history" && <HistoryTab />}
        </main>
      )}

      {/* Mobile Bottom Navigation Bar (Zero props!) */}
      <MobileBottomBar />

      {/* Video Player Lightbox Modal (Zero props!) */}
      <VideoPlayerModal />

      {/* YouTube Studio Post & Scheduling Drawer (Zero props!) */}
      <PostDrawer />

      {/* Gemini AI Settings Modal (Zero props!) */}
      <AiSettingsModal />
    </div>
  );
}
