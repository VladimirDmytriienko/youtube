"use client";

import React, { useState, useEffect } from "react";
import { Sun, Moon, RotateCw, LogIn, ExternalLink, LogOut, RefreshCw, UserCheck, Globe, ChevronDown, Sparkles, Scissors } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { useAuthStatus, useLoginMutation, useLogoutMutation, useAiStatus } from "@/hooks/useApi";
import { useAiSettingsModal, useNavigationTab } from "@/hooks/useModals";
import { useQueryClient } from "@tanstack/react-query";

export function Header() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const { lang, setLang, tr } = useAppLanguage();
  const queryClient = useQueryClient();

  useEffect(() => {
    setMounted(true);

    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === "YOUTUBE_AUTH_SUCCESS") {
        queryClient.invalidateQueries();
      }
    };
    window.addEventListener("message", handleAuthMessage);
    return () => window.removeEventListener("message", handleAuthMessage);
  }, [queryClient]);

  const { data: auth = { authenticated: false }, isFetching: isAuthFetching } = useAuthStatus();
  const { data: aiStatus } = useAiStatus();
  const { openAiSettings } = useAiSettingsModal();
  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();

  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleLogin = () => {
    loginMutation.mutate();
  };

  const handleLogout = () => {
    logoutMutation.mutate();
    setIsAccountMenuOpen(false);
  };

  const { currentTab, setTab } = useNavigationTab();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-2.5 w-full">
      <div className="w-full max-w-7xl 2xl:max-w-[1600px] mx-auto flex items-center justify-between">
        {/* Brand: YouTube Studio */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center justify-center shrink-0">
              <svg className="w-7 h-5" viewBox="0 0 28 20">
                <path
                  d="M27.4 3.1A3.5 3.5 0 0 0 24.9.6C22.7 0 14 0 14 0S5.3 0 3.1.6A3.5 3.5 0 0 0 .6 3.1C0 5.3 0 10 0 10s0 4.7.6 6.9c.7 1.6 2 2.5 4.5 2.5 2.2.6 8.9.6 8.9.6s8.7 0 10.9-.6c2.5 0 3.8-.9 4.5-2.5.6-2.2.6-6.9.6-6.9s0-4.7-.6-6.9z"
                  fill="#FF0000"
                />
                <polygon points="11.2,14.4 18.4,10 11.2,5.6" fill="#FFFFFF" />
              </svg>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-semibold tracking-tight text-foreground">
                YouTube
              </span>
              <span className="text-xs font-normal text-muted-foreground uppercase tracking-wider hidden sm:inline">
                Studio
              </span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {/* In-App Video Editor Button */}
          <button
            onClick={() => setTab("editor")}
            className={`hidden sm:inline-flex h-8 px-2.5 sm:px-3 rounded-full border text-xs font-medium items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm ${
              currentTab === "editor"
                ? "border-emerald-500 bg-emerald-500 text-black font-semibold shadow-emerald-500/20"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            }`}
            title="Вбудований відеоредактор (Монтаж, нарізка та склейка)"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-semibold">Монтаж</span>
          </button>

          {/* Gemini AI Settings Button */}
          <button
            onClick={openAiSettings}
            className={`h-8 px-2.5 sm:px-3 rounded-full border text-xs font-medium flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
              aiStatus?.has_key
                ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
                : "border-border bg-secondary hover:bg-accent text-muted-foreground"
            }`}
            title={
              aiStatus?.usage?.remaining_percent !== undefined
                ? `Gemini AI • Залишилося ${aiStatus.usage.remaining_percent.toFixed(1)}% денного ліміту (${aiStatus.usage.remaining_tokens?.toLocaleString()} токенів)`
                : "Налаштування Gemini AI"
            }
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline font-semibold">AI</span>
            {aiStatus?.has_key && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                {aiStatus.usage?.remaining_percent !== undefined && (
                  <span className="text-[10px] font-mono font-semibold text-emerald-400 hidden md:inline">
                    {aiStatus.usage.remaining_percent.toFixed(0)}%
                  </span>
                )}
              </>
            )}
          </button>

          {/* Language Selector (Small Select) */}
          <div className="relative inline-flex items-center">
            <Globe className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 pointer-events-none" />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as "uk" | "en")}
              className="h-8 pl-7 pr-6 rounded-full border border-border bg-secondary hover:bg-accent text-foreground text-xs font-semibold cursor-pointer appearance-none outline-none focus:ring-1 focus:ring-primary transition"
              title="Select Language / Обрати мову"
            >
              <option value="uk" className="bg-popover text-popover-foreground">UA</option>
              <option value="en" className="bg-popover text-popover-foreground">EN</option>
            </select>
            <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-2 pointer-events-none" />
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-8 w-8 rounded-full border border-border bg-secondary hover:bg-accent text-foreground flex items-center justify-center transition active:scale-95 cursor-pointer"
            title="Toggle Theme"
          >
            {mounted ? (
              theme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />
            ) : (
              <div className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Refresh Data */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 rounded-full border border-border bg-secondary hover:bg-accent text-foreground flex items-center justify-center transition active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Refresh Data"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </button>

          {/* Auth State & Channel Info */}
          {auth.authenticated ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                className="h-8 pl-1.5 pr-3 rounded-full bg-secondary text-foreground text-xs flex items-center gap-2 border border-border hover:border-primary/50 transition cursor-pointer"
                title="Manage YouTube Channel"
              >
                {auth.channel_avatar ? (
                  <img
                    src={auth.channel_avatar}
                    alt={auth.channel_title || "Channel"}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                )}
                <span className="truncate max-w-[90px] sm:max-w-[150px] font-medium">
                  {auth.channel_title || "Channel"}
                </span>
              </button>

              {/* Account / Channel Dropdown */}
              {isAccountMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsAccountMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-card border border-border shadow-2xl p-4 z-50 text-xs space-y-3 font-sans">
                    <div className="flex items-start gap-3 border-b border-border pb-3">
                      {auth.channel_avatar ? (
                        <img
                          src={auth.channel_avatar}
                          alt="Avatar"
                          className="w-10 h-10 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-emerald-600/30 flex items-center justify-center font-bold text-foreground text-sm">
                          {auth.channel_title ? auth.channel_title[0] : "YT"}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate text-sm">
                          {auth.channel_title}
                        </p>
                        {auth.channel_handle && (
                          <p className="text-muted-foreground font-mono text-[11px] truncate">
                            {auth.channel_handle}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5 truncate">
                          ID: {auth.channel_id || "Connected"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1 pt-1">
                      {auth.custom_url && (
                        <a
                          href={auth.custom_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition"
                        >
                          <span>Відкрити канал на YouTube</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={handleLogin}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-accent text-primary transition text-left cursor-pointer"
                      >
                        <span>Змінити канал / акаунт</span>
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-rose-500/10 text-rose-500 transition text-left cursor-pointer"
                      >
                        <span>Відключити YouTube</span>
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Button
              size="sm"
              onClick={handleLogin}
              disabled={loginMutation.isPending}
              className="h-8 px-4 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tr.header.login}</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
