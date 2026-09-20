"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

export interface StudioDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  minDate?: string; // YYYY-MM-DD
  lang?: "uk" | "en";
  label?: string;
}

const MONTHS_UK = [
  "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
  "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"
];

const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS_UK = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
const WEEKDAYS_EN = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function StudioDatePicker({
  value,
  onChange,
  minDate,
  lang = "uk",
  label,
}: StudioDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpwards(spaceBelow < 350 && rect.top > 350);
    }
  }, [isOpen]);

  // Parse initial view year and month from value or today
  const initialDate = useMemo(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  }, [value]);

  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth()); // 0-11

  // Keep view aligned if value changes externally
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m] = value.split("-").map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
  }, [value]);

  // Close when clicking outside
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

  const months = lang === "uk" ? MONTHS_UK : MONTHS_EN;
  const weekdays = lang === "uk" ? WEEKDAYS_UK : WEEKDAYS_EN;

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  // Formatted display text
  const formattedDisplay = useMemo(() => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return lang === "uk" ? "Оберіть дату" : "Select date";
    }
    const [y, m, d] = value.split("-").map(Number);
    if (lang === "uk") {
      const mNamesGen = [
        "січ.", "лют.", "берез.", "квіт.", "трав.", "черв.",
        "лип.", "серп.", "вер.", "жовт.", "лист.", "груд."
      ];
      return `${d} ${mNamesGen[m - 1]} ${y} р.`;
    } else {
      const mNamesShort = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ];
      return `${mNamesShort[m - 1]} ${d}, ${y}`;
    }
  }, [value, lang]);

  // Generate calendar days for viewYear & viewMonth
  const calendarDays = useMemo(() => {
    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean; isDisabled: boolean }[] = [];
    
    // First day of current month
    const firstDay = new Date(viewYear, viewMonth, 1);
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Monday is 0, Sunday is 6

    // Last day of previous month
    const prevMonthLastDate = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDate - i;
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isDisabled: minDate ? dateStr < minDate : false,
      });
    }

    // Days of current month
    const currentMonthLastDate = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (let d = 1; d <= currentMonthLastDate; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isDisabled: minDate ? dateStr < minDate : false,
      });
    }

    // Days of next month to fill grid to 35 or 42
    const totalSlots = days.length <= 35 ? 35 : 42;
    const remaining = totalSlots - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isDisabled: minDate ? dateStr < minDate : false,
      });
    }

    return days;
  }, [viewYear, viewMonth, minDate]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (dateStr: string) => {
    onChange(dateStr);
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
        <span className="truncate">{formattedDisplay}</span>
        <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
      </button>

      {/* Popover Calendar Modal */}
      {isOpen && (
        <div
          className={`absolute ${
            openUpwards ? "bottom-full mb-2" : "top-full mt-1.5"
          } left-0 z-50 w-72 rounded-2xl bg-card border border-border shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Header: Month & Year + Navigation */}
          <div className="flex items-center justify-between pb-3">
            <span className="text-sm font-semibold text-foreground">
              {months[viewMonth]} {viewYear}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-7 h-7 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition"
                title="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-7 h-7 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition"
                title="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {weekdays.map((w, idx) => (
              <span key={idx} className="text-[10px] font-semibold uppercase text-muted-foreground py-1">
                {w}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map((item, idx) => {
              const isSelected = item.dateStr === value;
              const isToday = item.dateStr === todayStr;

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={item.isDisabled}
                  onClick={() => !item.isDisabled && handleSelectDay(item.dateStr)}
                  className={`h-8 w-8 mx-auto rounded-full text-xs font-medium flex items-center justify-center transition ${
                    item.isDisabled
                      ? "opacity-25 cursor-not-allowed text-muted-foreground"
                      : isSelected
                      ? "bg-primary text-primary-foreground font-bold shadow-sm"
                      : isToday
                      ? "border border-primary text-primary hover:bg-accent"
                      : item.isCurrentMonth
                      ? "text-foreground hover:bg-accent cursor-pointer"
                      : "text-muted-foreground/40 hover:bg-accent/40"
                  }`}
                >
                  {item.dayNum}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
