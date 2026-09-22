"use client";

import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  X, 
  Loader2, 
  Coins,
  Cpu,
  Video,
  FileText,
  Zap,
  ChevronDown
} from "lucide-react";
import { 
  useAiStatus, 
  useSaveAiKeyMutation, 
  useTestAiKeyMutation,
  useAiModels,
  useSaveAiSettingsMutation
} from "@/hooks/useApi";
import { useAiSettingsModal } from "@/hooks/useModals";
import { useAppLanguage } from "@/hooks/useAppLanguage";

export function AiSettingsModal() {
  const { isOpen, closeAiSettings } = useAiSettingsModal();
  const { data: status, isLoading: isStatusLoading } = useAiStatus();
  const { data: modelsData, isLoading: isModelsLoading } = useAiModels();
  const saveKeyMutation = useSaveAiKeyMutation();
  const testKeyMutation = useTestAiKeyMutation();
  const saveSettingsMutation = useSaveAiSettingsMutation();

  const [inputKey, setInputKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  // Model selection states
  const [visionModel, setVisionModel] = useState<string>("gemini-2.5-flash");
  const [customVisionModel, setCustomVisionModel] = useState<string>("");
  const [textModel, setTextModel] = useState<string>("gemini-2.5-flash");
  const [customTextModel, setCustomTextModel] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setInputKey("");
      setShowKey(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (modelsData) {
      setVisionModel(modelsData.raw_vision_setting || "gemini-2.5-flash");
      setCustomVisionModel(modelsData.custom_vision_model || "");
      setTextModel(modelsData.raw_text_setting || "gemini-2.5-flash");
      setCustomTextModel(modelsData.custom_text_model || "");
    }
  }, [modelsData]);

  if (!isOpen) return null;

  const isSaving = saveKeyMutation.isPending || saveSettingsMutation.isPending;

  const handleSave = async () => {
    if (inputKey.trim()) {
      saveKeyMutation.mutate(inputKey.trim(), {
        onSuccess: () => {
          setInputKey("");
        },
      });
    }

    saveSettingsMutation.mutate({
      vision_model: visionModel,
      text_model: textModel,
      custom_vision_model: visionModel === "custom" ? customVisionModel.trim() : "",
      custom_text_model: textModel === "custom" ? customTextModel.trim() : "",
    });
  };

  const handleTestCurrent = () => {
    testKeyMutation.mutate(inputKey.trim() || undefined);
  };

  const modelsList = modelsData?.models || [
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", badge: "⚡ Рекомендовано", description: "Найновіший швидкий флагман" },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", badge: "🔥 Стабільна", description: "Перевірена висока швидкість" },
    { id: "gemini-flash-latest", name: "Gemini Flash Latest", badge: "🔄 Auto Latest", description: "Авто-оновлення до найновішої" },
    { id: "gemini-flash-lite-latest", name: "Gemini Flash Lite", badge: "🪶 Легка", description: "Ультра-економія токенів" },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", badge: "🧠 Pro Інтелект", description: "Глибоке розуміння контексту" },
    { id: "custom", name: "Власна / Experimental", badge: "🧪 Custom", description: "Введіть будь-який рядок моделі" }
  ];

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl p-6 relative space-y-5 animate-in zoom-in-95 duration-200 scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeAiSettings}
          className="absolute top-4 right-4 h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shrink-0">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Налаштування AI Моделей & Ключа</h3>
            <p className="text-xs text-muted-foreground">Керування моделями Gemini для аналізу відео та генерації контенту</p>
          </div>
        </div>

        {/* Current Status Pill */}
        <div className="p-3.5 rounded-xl bg-secondary/50 border border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${status?.has_key ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : "bg-amber-500"}`} />
            <div>
              <p className="text-xs font-semibold text-foreground">
                {status?.has_key ? "Токен підключено" : "Токен не налаштовано"}
              </p>
              {status?.masked_key && (
                <p className="text-[11px] font-mono text-muted-foreground">{status.masked_key}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestCurrent}
            disabled={testKeyMutation.isPending || (!status?.has_key && !inputKey)}
            className="h-7 px-2.5 rounded-lg bg-secondary hover:bg-accent text-foreground text-[11px] font-medium border border-border transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            {testKeyMutation.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            )}
            <span>Тест зв'язку</span>
          </button>
        </div>

        {/* Input Field for API Key */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>{status?.has_key ? "Оновити Gemini API Key" : "Введіть Gemini API Key"}</span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-primary hover:underline flex items-center gap-1 font-normal"
            >
              <span>Отримати ключ</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </label>

          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder={status?.has_key ? "Вставте новий ключ для заміни..." : "AIzaSy..."}
              className="w-full h-10 pl-3.5 pr-10 rounded-xl border border-border bg-background text-foreground text-xs font-mono placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Model Selection Panel */}
        <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-bold text-foreground">Вибір AI моделей для операцій</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* 1. Vision Model (Storyboard & Frames) */}
            <div className="p-3 rounded-lg bg-background/80 border border-border/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Video className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Розкадровка та Відео</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Vision
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">
                Аналіз кадрів, виявлення піків, обгонів, аварій та видовищних моментів.
              </p>

              <select
                value={visionModel}
                onChange={(e) => setVisionModel(e.target.value)}
                className="w-full h-8 px-2 rounded-lg border border-border bg-secondary/50 text-foreground text-xs font-medium outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {modelsList.map((m) => (
                  <option key={`vis-${m.id}`} value={m.id}>
                    {m.name} {m.badge ? `(${m.badge.replace(/^[^\w\sа-яА-ЯёЁіїєґІЇЄҐ]+/, '').trim()})` : ''}
                  </option>
                ))}
              </select>

              {visionModel === "custom" && (
                <div className="pt-1 animate-in fade-in duration-150">
                  <input
                    type="text"
                    value={customVisionModel}
                    onChange={(e) => setCustomVisionModel(e.target.value)}
                    placeholder="наприклад gemini-2.0-flash-exp"
                    className="w-full h-8 px-2.5 rounded-lg border border-primary/40 bg-background text-foreground text-xs font-mono placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[10px] text-muted-foreground pt-1">
                    Введіть офіційний ID моделі Google Gemini.
                  </p>
                </div>
              )}
            </div>

            {/* 2. Text & Scripting Model */}
            <div className="p-3 rounded-lg bg-background/80 border border-border/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Сценарії & Описи</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Text / Script
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">
                Генерація вірусних назв, сценаріїв монтажу, таймкодів, тегів та описів.
              </p>

              <select
                value={textModel}
                onChange={(e) => setTextModel(e.target.value)}
                className="w-full h-8 px-2 rounded-lg border border-border bg-secondary/50 text-foreground text-xs font-medium outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {modelsList.map((m) => (
                  <option key={`txt-${m.id}`} value={m.id}>
                    {m.name} {m.badge ? `(${m.badge.replace(/^[^\w\sа-яА-ЯёЁіїєґІЇЄҐ]+/, '').trim()})` : ''}
                  </option>
                ))}
              </select>

              {textModel === "custom" && (
                <div className="pt-1 animate-in fade-in duration-150">
                  <input
                    type="text"
                    value={customTextModel}
                    onChange={(e) => setCustomTextModel(e.target.value)}
                    placeholder="наприклад gemini-2.5-pro чи gemini-3.0"
                    className="w-full h-8 px-2.5 rounded-lg border border-primary/40 bg-background text-foreground text-xs font-mono placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[10px] text-muted-foreground pt-1">
                    Введіть офіційний ID моделі Google Gemini.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-primary/5 p-2 rounded-lg border border-primary/10">
            <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>
              Система автоматично застосовує <strong>розумний каскад</strong>: якщо обрана модель тимчасово перевантажена, запит безпечно виконується резервними моделями без збоїв.
            </span>
          </div>
        </div>

        {/* Token Usage Stats Card */}
        {status?.usage && (() => {
          const dailyLimit = status.usage.daily_limit || 1_000_000;
          const todayTokens = status.usage.today_tokens ?? status.usage.total_tokens;
          const remainingTokens = status.usage.remaining_tokens ?? Math.max(0, dailyLimit - todayTokens);
          const remainingPercent = status.usage.remaining_percent ?? Math.round((remainingTokens / dailyLimit) * 1000) / 10;
          const isHigh = remainingPercent > 50;
          const isMedium = remainingPercent > 20 && remainingPercent <= 50;

          return (
            <div className="p-3.5 rounded-xl bg-secondary/40 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span>Використання токенів (Gemini Usage)</span>
                </div>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Free Tier
                </span>
              </div>

              {/* Remaining Quota Progress Bar Scale */}
              <div className="p-2.5 rounded-lg bg-background/80 border border-border space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <span>Залишилося:</span>
                    <strong
                      className={`text-sm font-bold font-mono ${
                        isHigh
                          ? "text-emerald-500"
                          : isMedium
                          ? "text-amber-500"
                          : "text-rose-500"
                      }`}
                    >
                      {remainingPercent.toFixed(1)}%
                    </strong>
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {remainingTokens.toLocaleString()} / {dailyLimit.toLocaleString()}
                  </span>
                </div>

                {/* Progress Track */}
                <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden p-0.5 border border-border/50">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      isHigh
                        ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                        : isMedium
                        ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                        : "bg-gradient-to-r from-rose-500 to-red-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, remainingPercent))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                  <span>Використано сьогодні: <strong className="text-foreground font-mono">{todayTokens.toLocaleString()}</strong> токенів</span>
                  <span>Денний ліміт</span>
                </div>
              </div>

              {/* Numbers Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-background/70 border border-border/70">
                  <span className="text-[10px] text-muted-foreground block font-medium">Всього за весь час</span>
                  <span className="text-sm font-bold text-foreground font-mono">
                    {status.usage.total_tokens.toLocaleString()}{" "}
                    <span className="text-[10px] text-muted-foreground font-normal">токенів</span>
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-background/70 border border-border/70">
                  <span className="text-[10px] text-muted-foreground block font-medium">Запитів до ШІ</span>
                  <span className="text-sm font-bold text-foreground font-mono">
                    {status.usage.total_requests}{" "}
                    <span className="text-[10px] text-muted-foreground font-normal">виклик(-ів)</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 pt-0.5">
                <span>Вхідні (промпт): <strong className="text-foreground font-mono">{status.usage.prompt_tokens.toLocaleString()}</strong></span>
                <span>Згенеровані: <strong className="text-foreground font-mono">{status.usage.candidates_tokens.toLocaleString()}</strong></span>
              </div>
            </div>
          );
        })()}

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={closeAiSettings}
            className="h-9 px-4 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground text-xs font-medium transition cursor-pointer"
          >
            Закрити
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="h-9 px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Зберегти налаштування</span>
          </button>
        </div>
      </div>
    </div>
  );
}
