"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Clock, Check } from "lucide-react";

export interface StudioTimePickerProps {
  value: string; // "HH:MM" 24-hour format
  onChange: (timeStr: string) => void;
  label?: string;
}

export function StudioTimePicker({
  value,
  onChange,
  label,
}: StudioTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpwards(spaceBelow < 260 && rect.top > 260);
    }
  }, [isOpen]);

  // Generate 15-minute time slots (00:00 to 23:45)
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }
    }
    return slots;
  }, []);

  // Close on outside click
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

  // Auto-scroll to selected time slot when opened
  useEffect(() => {
    if (isOpen && listRef.current && value) {
      const idx = timeSlots.indexOf(value);
      if (idx !== -1) {
        const itemEl = listRef.current.children[idx] as HTMLElement;
        if (itemEl) {
          listRef.current.scrollTop = itemEl.offsetTop - listRef.current.offsetHeight / 2 + 16;
        }
      }
    }
  }, [isOpen, value, timeSlots]);

  const handleSelect = (timeStr: string) => {
    onChange(timeStr);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Label if provided */}
      {label && (
        <span className="text-[11px] font-medium text-muted-foreground block mb-1">
          {label}
        </span>
      )}

      {/* Trigger Button - Clean Material Outlined Field */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-10 px-3 rounded-lg border bg-background text-foreground text-xs font-medium flex items-center justify-between transition cursor-pointer ${
          isOpen
            ? "border-primary ring-1 ring-primary"
            : "border-border hover:border-foreground/40"
        }`}
      >
        <span className="font-mono text-xs">{value || "12:00"}</span>
        <Clock className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
      </button>

      {/* Popover Time Dropdown */}
      {isOpen && (
        <div
          ref={listRef}
          className={`absolute ${
            openUpwards ? "bottom-full mb-2" : "top-full mt-1.5"
          } left-0 z-50 w-full min-w-[160px] max-h-56 overflow-y-auto rounded-xl bg-card border border-border shadow-2xl py-1.5 animate-in fade-in zoom-in-95 duration-150 scrollbar-thin`}
        >
          {timeSlots.map((timeStr) => {
            const isSelected = timeStr === value;
            return (
              <button
                key={timeStr}
                type="button"
                onClick={() => handleSelect(timeStr)}
                className={`w-full px-3.5 py-2 text-xs flex items-center justify-between transition cursor-pointer text-left ${
                  isSelected
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                <span className="font-mono">{timeStr}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
