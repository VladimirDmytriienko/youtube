"use client";

import React from "react";
import { StudioSelect, StudioSelectOption } from "@/components/ui/studio-select";
import { PostFormData } from "@/types";

export interface Step2ElementsProps {
  form: PostFormData;
  updateForm: (patch: Partial<PostFormData> | ((prev: PostFormData) => Partial<PostFormData>)) => void;
  tr: any;
}

const CATEGORY_OPTIONS: StudioSelectOption[] = [
  { value: "20", label: "🎮 Відеоігри (Gaming - ID 20)" },
  { value: "24", label: "🎬 Розваги (Entertainment - ID 24)" },
  { value: "17", label: "🛹 Спорт та екстрім (Sports - ID 17)" },
  { value: "22", label: "👥 Люди й блоги (People & Blogs - ID 22)" },
  { value: "2", label: "🚗 Автомобілі та транспорт (Autos & Vehicles - ID 2)" },
  { value: "23", label: "🎭 Комедія (Comedy - ID 23)" },
  { value: "28", label: "💻 Наука й технології (Science & Tech - ID 28)" },
];

export function Step2Elements({
  form,
  updateForm,
  tr,
}: Step2ElementsProps) {
  const { allowShortsRemix, metaLang, metaData, category } = form;
  const tags = metaData[metaLang]?.tags || "";

  const quickTags = [
    "Shorts",
    "Highlights",
    "Viral",
    "Epic Moments",
    "Gameplay",
    "Clutch",
    "Trending",
  ];

  const handleTagsChange = (newTags: string) => {
    updateForm({
      metaData: {
        ...metaData,
        [metaLang]: { ...(metaData[metaLang] || { title: "", desc: "", tags: "" }), tags: newTags },
      },
    });
  };

  const handleAddQuickTag = (tag: string) => {
    const cleanTag = tag.replace(/^#+/, "").trim();
    const currentList = tags
      .split(",")
      .map((t) => t.trim().replace(/^#+/, ""))
      .filter(Boolean);

    if (!currentList.some((t) => t.toLowerCase() === cleanTag.toLowerCase())) {
      currentList.push(cleanTag);
      handleTagsChange(currentList.join(", "));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground">
          {tr.drawer.elementsTitle || "Елементи відео"}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Налаштуйте теги, ремікси Shorts та тематичну категорію.
        </p>
      </div>

      {/* 1. Shorts Remixing Section */}
      <div className="flex items-start justify-between p-3.5 rounded-xl bg-muted/30">
        <div className="space-y-0.5">
          <h4 className="text-xs font-semibold text-foreground">
            {tr.drawer.elementsRemixLabel || "Ремікси для Shorts"}
          </h4>
          <p className="text-[11px] text-muted-foreground">
            {tr.drawer.elementsRemixDesc || "Дозволити глядачам створювати ремікси з цим аудіо та відео."}
          </p>
        </div>
        <input
          type="checkbox"
          checked={allowShortsRemix}
          onChange={(e) => updateForm({ allowShortsRemix: e.target.checked })}
          className="w-4 h-4 rounded accent-primary cursor-pointer mt-0.5"
        />
      </div>

      {/* 2. Tags Section */}
      <div className="space-y-2">
        <label className="text-[11px] font-medium text-muted-foreground block">
          {tr.drawer.tagsLabel || "Теги"} • {metaLang.toUpperCase()}
        </label>

        {/* Quick Tag Chips */}
        <div className="flex flex-wrap gap-1.5 pb-0.5">
          {quickTags.map((tg) => {
            const isAdded = tags
              .split(",")
              .map((t) => t.trim().toLowerCase().replace(/^#+/, ""))
              .includes(tg.toLowerCase());
            return (
              <button
                key={tg}
                type="button"
                onClick={() => handleAddQuickTag(tg)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition active:scale-95 cursor-pointer ${
                  isAdded
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-secondary hover:bg-accent text-foreground"
                }`}
              >
                {isAdded ? `✓ ${tg}` : `+ ${tg}`}
              </button>
            );
          })}
        </div>

        {/* Material Outlined Input */}
        <div className="relative border border-border hover:border-foreground/40 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary rounded-lg transition bg-background">
          <input
            type="text"
            maxLength={500}
            value={tags}
            onChange={(e) => handleTagsChange(e.target.value)}
            placeholder="shorts, highlights, viral, trending"
            className="w-full bg-transparent px-3.5 pt-2.5 pb-6 text-xs text-foreground outline-none"
          />
          <span className="absolute bottom-1.5 right-3 text-[10px] text-muted-foreground font-mono">
            {tags.length}/500
          </span>
        </div>
      </div>

      {/* 3. Category Outlined Select */}
      <div className="space-y-1">
        <StudioSelect
          label="Категорія YouTube"
          value={category}
          onChange={(cat) => updateForm({ category: cat })}
          options={CATEGORY_OPTIONS}
        />
      </div>
    </div>
  );
}
