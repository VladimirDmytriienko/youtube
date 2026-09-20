"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface StudioSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface StudioSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: StudioSelectOption[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function StudioSelect({
  value,
  onChange,
  options,
  label,
  placeholder = "Select an option",
  disabled = false,
}: StudioSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpwards(spaceBelow < 260 && rect.top > 260);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const selectedOption = options.find((o) => o.value === value);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <span className="text-[11px] font-medium text-muted-foreground block mb-1">
          {label}
        </span>
      )}

      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-10 px-3 rounded-lg border bg-background text-foreground text-xs font-medium flex items-center justify-between transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen
            ? "border-primary ring-1 ring-primary"
            : "border-border hover:border-foreground/40"
        }`}
      >
        <span className="truncate flex items-center gap-2">
          {selectedOption?.icon}
          <span>{selectedOption ? selectedOption.label : placeholder}</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground shrink-0 ml-2 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-primary" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute ${
            openUpwards ? "bottom-full mb-2" : "top-full mt-1.5"
          } left-0 z-50 w-full min-w-[200px] max-h-60 overflow-y-auto rounded-xl bg-card border border-border shadow-2xl py-1.5 animate-in fade-in zoom-in-95 duration-150`}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`w-full px-3.5 py-2 text-xs flex items-center justify-between transition cursor-pointer text-left ${
                  isSelected
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                <span className="truncate flex items-center gap-2">
                  {opt.icon}
                  <span>{opt.label}</span>
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
