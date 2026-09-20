"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Play,
  Pause,
  Scissors,
  Trash2,
  Film,
  Zap,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Volume2,
  VolumeX,
  Plus,
  Clock,
  CheckCircle2,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  SkipBack,
  SkipForward,
  Magnet,
  Sparkles,
  Eye,
  Lock,
  Music,
  FolderOpen,
  Upload,
  Grid,
  List,
  Sliders,
  Copy,
  Check,
  X,
  Layers,
  ArrowRight
} from "lucide-react";
import { useVideos } from "@/hooks/useApi";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { usePostDrawer } from "@/hooks/useModals";
import { getThumbnailUrl } from "@/lib/api";
import { VideoItem, TimelineSegment, ProjectMediaItem } from "@/types";
import { toast } from "sonner";

function formatTimecode(seconds: number): string {
  const safe = Math.max(0, seconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = Math.floor(safe % 60);
  const frames = Math.floor((safe % 1) * 30);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}:${frames.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}:${frames.toString().padStart(2, "0")}`;
}

function formatShortTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function EditorTab() {
  const { lang } = useAppLanguage();
  const { data: serverVideos = [] } = useVideos(lang);
  const { openDrawer } = usePostDrawer();

  // Project Media Pool: ONLY clips explicitly selected by the user!
  const [projectMedia, setProjectMedia] = useState<ProjectMediaItem[]>([]);
  const [selectedVideoPath, setSelectedVideoPath] = useState<string>("");
  const [segments, setSegments] = useState<TimelineSegment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  // Media Picker Dialog State
  const [showPickerModal, setShowPickerModal] = useState<boolean>(false);
  const [pickerSearch, setPickerSearch] = useState<string>("");
  const [pickerFilter, setPickerFilter] = useState<"all" | "16:9" | "9:16">("all");
  const [selectedPickerIds, setSelectedPickerIds] = useState<Set<string>>(new Set());

  // Layout & View states
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showInspector, setShowInspector] = useState<boolean>(true);
  const [previewAspect, setPreviewAspect] = useState<"16:9" | "9:16">("16:9");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isSnapping, setIsSnapping] = useState<boolean>(true);

  // Player states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const rulerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [isScrubbingRuler, setIsScrubbingRuler] = useState<boolean>(false);
  const [draggedSegmentIndex, setDraggedSegmentIndex] = useState<number | null>(null);
  const [isDraggingOverTimeline, setIsDraggingOverTimeline] = useState<boolean>(false);

  // Export Dialog State
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportTargetFormat, setExportTargetFormat] = useState<"16:9" | "9:16">("16:9");
  const [exportFilename, setExportFilename] = useState<string>("");
  const [renderedResult, setRenderedResult] = useState<{ path: string; filename: string } | null>(null);

  // Formatted server video items
  const allLibraryVideos: ProjectMediaItem[] = useMemo(() => {
    return serverVideos.map((v) => ({
      id: v.path,
      filename: v.filename,
      title: v.title || v.filename,
      path: v.path,
      duration: v.duration || 30,
      duration_formatted: v.duration_formatted || "0:30",
      resolution: v.resolution || "1920x1080",
      is_shorts: !!v.is_shorts,
      thumbnail_url: getThumbnailUrl(v.path),
    }));
  }, [serverVideos]);

  // Filtered list for media picker modal
  const filteredPickerVideos = useMemo(() => {
    return allLibraryVideos.filter((v) => {
      if (pickerSearch.trim()) {
        const q = pickerSearch.toLowerCase();
        const matchTitle = (v.title || "").toLowerCase().includes(q);
        const matchFile = (v.filename || "").toLowerCase().includes(q);
        if (!matchTitle && !matchFile) return false;
      }
      if (pickerFilter === "16:9") return !v.is_shorts;
      if (pickerFilter === "9:16") return v.is_shorts;
      return true;
    });
  }, [allLibraryVideos, pickerSearch, pickerFilter]);

  // Active video & selected segment
  const activeVideo = projectMedia.find((v) => v.path === selectedVideoPath) || null;
  const selectedSegment = segments.find((s) => s.id === selectedSegmentId) || null;

  // Stream URL
  const streamUrl = useMemo(() => {
    if (!selectedVideoPath) return "";
    if (selectedVideoPath.startsWith("blob:") || selectedVideoPath.startsWith("http")) {
      return selectedVideoPath;
    }
    return `http://localhost:8000/api/video/stream?path=${encodeURIComponent(selectedVideoPath)}`;
  }, [selectedVideoPath]);

  // Total timeline duration
  const totalTimelineDuration = useMemo(() => {
    return segments.reduce((sum, seg) => sum + seg.durationSec, 0);
  }, [segments]);

  // Timeline scale (pixels per second)
  const pxPerSec = useMemo(() => {
    const base = 8;
    return Math.max(2, base * zoomLevel);
  }, [zoomLevel]);

  // Handle confirming media selection in modal
  const handleConfirmMediaSelection = () => {
    const selectedList = allLibraryVideos.filter((v) => selectedPickerIds.has(v.id));
    if (selectedList.length === 0) {
      toast.warning("Оберіть хоча б одне відео");
      return;
    }

    // Merge into projectMedia (avoid duplicates)
    const existingIds = new Set(projectMedia.map((p) => p.id));
    const newItems = selectedList.filter((item) => !existingIds.has(item.id));
    const updatedMedia = [...projectMedia, ...newItems];
    setProjectMedia(updatedMedia);

    // If no active video yet, load the first selected
    if (!selectedVideoPath && selectedList.length > 0) {
      const first = selectedList[0];
      setSelectedVideoPath(first.path);
      const dur = first.duration || 30;
      setVideoDuration(dur);
      setPreviewAspect(first.is_shorts ? "9:16" : "16:9");
      setExportTargetFormat(first.is_shorts ? "9:16" : "16:9");

      // Populate timeline with initial segments from selected videos
      const initialSegs: TimelineSegment[] = selectedList.map((item, idx) => ({
        id: `seg_${Date.now()}_${idx}`,
        sourcePath: item.path,
        sourceTitle: item.title || item.filename,
        startSec: 0,
        endSec: item.duration || 30,
        durationSec: item.duration || 30,
        label: item.title || `Кліп ${idx + 1}`,
        volume: 1,
        speed: 1,
      }));
      setSegments(initialSegs);
      setSelectedSegmentId(initialSegs[0]?.id || null);
      setExportFilename(`Edited_${first.filename.replace(/\.[^/.]+$/, "")}.mp4`);
    } else {
      // Append newly added clips to timeline
      const startIndex = segments.length;
      const newSegs: TimelineSegment[] = newItems.map((item, idx) => ({
        id: `seg_${Date.now()}_${startIndex + idx}`,
        sourcePath: item.path,
        sourceTitle: item.title || item.filename,
        startSec: 0,
        endSec: item.duration || 30,
        durationSec: item.duration || 30,
        label: item.title || `Кліп ${startIndex + idx + 1}`,
        volume: 1,
        speed: 1,
      }));
      setSegments((prev) => [...prev, ...newSegs]);
    }

    setShowPickerModal(false);
    setSelectedPickerIds(new Set());
    toast.success(`Додано до проекту: ${selectedList.length} відео`);
  };

  // Quick 1-click start with a single video from recent list
  const handleQuickStartVideo = (v: ProjectMediaItem) => {
    setProjectMedia([v]);
    setSelectedVideoPath(v.path);
    const dur = v.duration || 30;
    setVideoDuration(dur);
    setPreviewAspect(v.is_shorts ? "9:16" : "16:9");
    setExportTargetFormat(v.is_shorts ? "9:16" : "16:9");

    const initialSeg: TimelineSegment = {
      id: `seg_${Date.now()}`,
      sourcePath: v.path,
      sourceTitle: v.title || v.filename,
      startSec: 0,
      endSec: dur,
      durationSec: dur,
      label: v.title || v.filename,
      volume: 1,
      speed: 1,
    };
    setSegments([initialSeg]);
    setSelectedSegmentId(initialSeg.id);
    setExportFilename(`Edited_${v.filename.replace(/\.[^/.]+$/, "")}.mp4`);
    toast.success(`Проект розпочато з: ${v.title || v.filename}`);
  };

  // Handle local file upload
  const handleImportLocalFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const blobUrl = URL.createObjectURL(file);
      const isShort = file.name.toLowerCase().includes("short");

      const tempVideo = document.createElement("video");
      tempVideo.src = blobUrl;
      tempVideo.onloadedmetadata = () => {
        const dur = Math.round(tempVideo.duration) || 15;
        const newMedia: ProjectMediaItem = {
          id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          filename: file.name,
          title: file.name.replace(/\.[^/.]+$/, ""),
          path: blobUrl,
          duration: dur,
          duration_formatted: formatShortTime(dur),
          resolution: isShort ? "1080x1920" : "1920x1080",
          is_shorts: isShort,
          isCustomBlob: true,
        };

        setProjectMedia((prev) => [...prev, newMedia]);
        if (!selectedVideoPath) {
          handleQuickStartVideo(newMedia);
        } else {
          // Append to timeline
          const newSeg: TimelineSegment = {
            id: `seg_${Date.now()}`,
            sourcePath: newMedia.path,
            sourceTitle: newMedia.title,
            startSec: 0,
            endSec: dur,
            durationSec: dur,
            label: newMedia.title,
            volume: 1,
            speed: 1,
          };
          setSegments((prev) => [...prev, newSeg]);
        }
        toast.success(`Імпортовано: ${file.name}`);
      };
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Switch active video in player
  const handleLoadVideoToPlayer = (v: ProjectMediaItem) => {
    setSelectedVideoPath(v.path);
    const dur = v.duration || 30;
    setVideoDuration(dur);
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  // Add video to timeline
  const handleAppendToTimeline = (v: ProjectMediaItem) => {
    const dur = v.duration || 30;
    const newSeg: TimelineSegment = {
      id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      sourcePath: v.path,
      sourceTitle: v.title || v.filename,
      startSec: 0,
      endSec: dur,
      durationSec: dur,
      label: v.title || `Кліп ${segments.length + 1}`,
      volume: 1,
      speed: 1,
    };
    setSegments((prev) => [...prev, newSeg]);
    setSelectedSegmentId(newSeg.id);
    if (!selectedVideoPath) {
      setSelectedVideoPath(v.path);
    }
    toast.success(`Додано на таймлайн`);
  };

  // Drag & drop video onto timeline
  const handleTimelineDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverTimeline(false);
    const rawData = e.dataTransfer.getData("application/json");
    if (!rawData) return;
    try {
      const mediaItem: ProjectMediaItem = JSON.parse(rawData);
      if (mediaItem && mediaItem.path) {
        handleAppendToTimeline(mediaItem);
      }
    } catch (err) {
      console.error("Drop error:", err);
    }
  };

  // Playhead & Transport controls
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const seekTo = (sec: number) => {
    const target = Math.max(0, Math.min(sec, videoDuration || totalTimelineDuration));
    setCurrentTime(target);
    if (videoRef.current) {
      videoRef.current.currentTime = target;
    }
  };

  const stepTime = (delta: number) => {
    seekTo(currentTime + delta);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    setCurrentTime(cur);

    if (selectedSegment) {
      if (cur >= selectedSegment.endSec) {
        const curIndex = segments.findIndex((s) => s.id === selectedSegment.id);
        if (curIndex >= 0 && curIndex < segments.length - 1) {
          const nextSeg = segments[curIndex + 1];
          setSelectedSegmentId(nextSeg.id);
          if (nextSeg.sourcePath !== selectedSegment.sourcePath) {
            setSelectedVideoPath(nextSeg.sourcePath);
          }
          seekTo(nextSeg.startSec);
        } else {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      }
    }
  };

  // Razor Split Tool (S or C)
  const handleSplitSegment = () => {
    if (!selectedSegment) {
      toast.warning("Оберіть фрагмент на таймлайні для розрізання");
      return;
    }

    const splitPoint = currentTime;
    if (splitPoint <= selectedSegment.startSec + 0.3 || splitPoint >= selectedSegment.endSec - 0.3) {
      toast.warning("Точка розрізання надто близько до краю");
      return;
    }

    const firstDuration = Number((splitPoint - selectedSegment.startSec).toFixed(2));
    const secondDuration = Number((selectedSegment.endSec - splitPoint).toFixed(2));

    const segIndex = segments.findIndex((s) => s.id === selectedSegment.id);
    const seg1: TimelineSegment = {
      ...selectedSegment,
      id: `seg_${Date.now()}_A`,
      endSec: splitPoint,
      durationSec: firstDuration,
      label: `${selectedSegment.label || "Кліп"} (A)`,
    };

    const seg2: TimelineSegment = {
      ...selectedSegment,
      id: `seg_${Date.now()}_B`,
      startSec: splitPoint,
      durationSec: secondDuration,
      label: `${selectedSegment.label || "Кліп"} (B)`,
    };

    const updated = [...segments];
    updated.splice(segIndex, 1, seg1, seg2);
    setSegments(updated);
    setSelectedSegmentId(seg2.id);
    toast.success(`Розрізано на ${formatShortTime(splitPoint)}`);
  };

  // In / Out Points
  const handleSetInPoint = () => {
    if (!selectedSegment) return;
    if (currentTime >= selectedSegment.endSec - 0.5) {
      toast.error("Початок In повинен бути раніше кінця Out");
      return;
    }
    const newStart = Number(currentTime.toFixed(2));
    const newDur = Number((selectedSegment.endSec - newStart).toFixed(2));
    setSegments((prev) =>
      prev.map((s) =>
        s.id === selectedSegment.id ? { ...s, startSec: newStart, durationSec: newDur } : s
      )
    );
    toast.success(`Початок встановлено: ${formatShortTime(newStart)}`);
  };

  const handleSetOutPoint = () => {
    if (!selectedSegment) return;
    if (currentTime <= selectedSegment.startSec + 0.5) {
      toast.error("Кінець Out повинен бути пізніше початку In");
      return;
    }
    const newEnd = Number(currentTime.toFixed(2));
    const newDur = Number((newEnd - selectedSegment.startSec).toFixed(2));
    setSegments((prev) =>
      prev.map((s) =>
        s.id === selectedSegment.id ? { ...s, endSec: newEnd, durationSec: newDur } : s
      )
    );
    toast.success(`Кінець встановлено: ${formatShortTime(newEnd)}`);
  };

  // Delete segment
  const handleDeleteSegment = (segId: string) => {
    if (segments.length <= 1) {
      toast.warning("Не можна видалити єдиний фрагмент");
      return;
    }
    const updated = segments.filter((s) => s.id !== segId);
    setSegments(updated);
    setSelectedSegmentId(updated[0]?.id || null);
    toast.info("Фрагмент видалено");
  };

  // Duplicate segment
  const handleDuplicateSegment = (seg: TimelineSegment) => {
    const dup: TimelineSegment = {
      ...seg,
      id: `seg_${Date.now()}_dup`,
      label: `${seg.label || "Кліп"} (Копія)`,
    };
    const idx = segments.findIndex((s) => s.id === seg.id);
    const updated = [...segments];
    updated.splice(idx + 1, 0, dup);
    setSegments(updated);
    setSelectedSegmentId(dup.id);
    toast.success(`Кліп продубльовано`);
  };

  // Interactive Ruler Scrubbing
  const handleRulerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsScrubbingRuler(true);
    handleRulerScrub(e);
  };

  const handleRulerScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const targetSec = Math.max(0, Math.min(clickX / pxPerSec, totalTimelineDuration || videoDuration));
    seekTo(targetSec);
  };

  // Keyboard hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "KeyS" || e.code === "KeyC") {
        e.preventDefault();
        handleSplitSegment();
      } else if (e.code === "Delete" || e.code === "Backspace") {
        if (selectedSegmentId) {
          e.preventDefault();
          handleDeleteSegment(selectedSegmentId);
        }
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        stepTime(e.shiftKey ? -1 : -0.1);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        stepTime(e.shiftKey ? 1 : 0.1);
      } else if (e.code === "KeyI") {
        e.preventDefault();
        handleSetInPoint();
      } else if (e.code === "KeyO") {
        e.preventDefault();
        handleSetOutPoint();
      } else if (e.code === "KeyF") {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, currentTime, selectedSegmentId, selectedSegment, segments, totalTimelineDuration]);

  // Generate ruler tick marks
  const rulerTicks = useMemo(() => {
    const ticks: { sec: number; label: string; isMajor: boolean }[] = [];
    const maxDur = Math.max(totalTimelineDuration, videoDuration, 30);
    const step = zoomLevel > 1.5 ? 5 : zoomLevel > 0.8 ? 10 : 15;
    for (let s = 0; s <= maxDur + 15; s += step) {
      ticks.push({
        sec: s,
        label: formatShortTime(s),
        isMajor: s % (step * 2) === 0,
      });
    }
    return ticks;
  }, [totalTimelineDuration, videoDuration, zoomLevel]);

  // FFmpeg render
  const handleExportTimeline = async () => {
    if (segments.length === 0) {
      toast.error("Немає фрагментів для експорту");
      return;
    }

    setIsExporting(true);
    try {
      const payload = {
        segments: segments.map((s) => ({
          source_path: s.sourcePath,
          start_sec: s.startSec,
          end_sec: s.endSec,
          duration_sec: s.durationSec,
        })),
        target_format: exportTargetFormat,
        output_filename: exportFilename || `Edited_${Date.now()}.mp4`,
      };

      const res = await fetch("http://localhost:8000/api/editor/render-timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Помилка монтажу");
      }

      const data = await res.json();
      setRenderedResult({
        path: data.output_path,
        filename: data.filename,
      });
      toast.success("Відео успішно змонтовано!");
    } catch (err: any) {
      console.error("Export error:", err);
      toast.error(`Помилка експорту: ${err.message || "Невідома помилка"}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenInPostDrawer = () => {
    if (!renderedResult) return;
    setShowExportModal(false);
    openDrawer({
      id: renderedResult.path,
      filename: renderedResult.filename,
      title: renderedResult.filename.replace(/\.[^/.]+$/, ""),
      path: renderedResult.path,
      is_shorts: exportTargetFormat === "9:16",
    } as any);
  };

  // If NO VIDEOS SELECTED YET: Show clean YouTube Studio Welcome Screen
  if (projectMedia.length === 0) {
    return (
      <div className="flex-1 w-full h-[calc(100vh-120px)] flex flex-col items-center justify-center bg-[#0f0f0f] text-[#f1f1f1] px-4 select-none">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportLocalFiles}
          accept="video/*,audio/*"
          multiple
          className="hidden"
        />

        <div className="max-w-2xl w-full flex flex-col items-center text-center space-y-6">
          {/* YouTube Studio Badge */}
          <div className="w-16 h-16 rounded-full bg-[#272727] flex items-center justify-center text-white shadow-lg border border-[#383838]">
            <Film className="w-8 h-8 text-[#3ea6ff]" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#f1f1f1]">
              Редактор відео YouTube Studio
            </h2>
            <p className="text-sm text-[#aaaaaa] max-w-md mx-auto">
              Оберіть конкретні відео з бібліотеки або завантажте локальний файл, щоб почати монтаж і нарізку.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setSelectedPickerIds(new Set());
                setShowPickerModal(true);
              }}
              className="h-10 px-5 rounded-full bg-[#3ea6ff] hover:bg-[#65b8ff] text-black font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Обрати відео для монтажу</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-10 px-5 rounded-full bg-[#272727] hover:bg-[#383838] border border-[#383838] text-[#f1f1f1] font-medium text-xs sm:text-sm flex items-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-[#aaaaaa]" />
              <span>Завантажити з комп'ютера</span>
            </button>
          </div>

          {/* Quick Selection Cards from Recent Server Videos */}
          {allLibraryVideos.length > 0 && (
            <div className="w-full pt-8 text-left border-t border-[#272727] space-y-3">
              <div className="flex items-center justify-between text-xs text-[#aaaaaa]">
                <span className="font-medium uppercase tracking-wider text-[11px]">Швидкий старт з останніх відео:</span>
                <button
                  onClick={() => setShowPickerModal(true)}
                  className="text-[#3ea6ff] hover:underline font-medium"
                >
                  Переглянути всі ({allLibraryVideos.length})
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {allLibraryVideos.slice(0, 3).map((v) => (
                  <div
                    key={v.id}
                    onClick={() => handleQuickStartVideo(v)}
                    className="group p-2.5 rounded-xl bg-[#1f1f1f] hover:bg-[#282828] border border-[#2e2e2e] hover:border-[#3ea6ff] cursor-pointer transition flex flex-col gap-2"
                  >
                    <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-[#333333]">
                      {v.thumbnail_url && (
                        <img
                          src={v.thumbnail_url}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                      )}
                      <span className="absolute bottom-1 right-1 px-1 rounded bg-black/80 font-mono text-[9px] text-white">
                        {v.duration_formatted}
                      </span>
                      <span
                        className={`absolute top-1 left-1 px-1 rounded text-[8px] font-bold ${
                          v.is_shorts ? "bg-[#cc0000] text-white" : "bg-[#065fd4] text-white"
                        }`}
                      >
                        {v.is_shorts ? "9:16" : "16:9"}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-[#f1f1f1] truncate group-hover:text-[#3ea6ff] transition">
                      {v.title || v.filename}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Media Picker Modal */}
        {showPickerModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-3xl bg-[#1f1f1f] border border-[#383838] rounded-2xl flex flex-col max-h-[85vh] shadow-2xl overflow-hidden text-[#f1f1f1]">
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-[#2e2e2e] flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-base font-semibold text-[#f1f1f1]">Обрати відео для проекту</h3>
                  <p className="text-xs text-[#aaaaaa]">Виберіть одне або кілька відео, з якими будете працювати</p>
                </div>
                <button
                  onClick={() => setShowPickerModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-[#333333] text-[#aaaaaa] hover:text-white flex items-center justify-center transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search & Filter */}
              <div className="px-5 py-3 border-b border-[#2e2e2e] bg-[#181818] flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-[#aaaaaa] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Пошук серед відео каналу..."
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-full bg-[#272727] border border-[#383838] text-xs text-white placeholder:text-[#888888] outline-none focus:border-[#3ea6ff] transition"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    onClick={() => setPickerFilter("all")}
                    className={`h-7 px-3 rounded-full font-medium transition ${
                      pickerFilter === "all"
                        ? "bg-[#f1f1f1] text-black font-semibold"
                        : "bg-[#272727] text-[#aaaaaa] hover:text-white"
                    }`}
                  >
                    Всі
                  </button>
                  <button
                    onClick={() => setPickerFilter("16:9")}
                    className={`h-7 px-3 rounded-full font-medium transition ${
                      pickerFilter === "16:9"
                        ? "bg-[#3ea6ff] text-black font-semibold"
                        : "bg-[#272727] text-[#aaaaaa] hover:text-white"
                    }`}
                  >
                    16:9
                  </button>
                  <button
                    onClick={() => setPickerFilter("9:16")}
                    className={`h-7 px-3 rounded-full font-medium transition ${
                      pickerFilter === "9:16"
                        ? "bg-[#cc0000] text-white font-semibold"
                        : "bg-[#272727] text-[#aaaaaa] hover:text-white"
                    }`}
                  >
                    Shorts
                  </button>
                </div>
              </div>

              {/* Video Grid inside Picker */}
              <div className="p-5 flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3 min-h-0">
                {filteredPickerVideos.map((v) => {
                  const isSelected = selectedPickerIds.has(v.id);
                  return (
                    <div
                      key={v.id}
                      onClick={() => {
                        setSelectedPickerIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(v.id)) next.delete(v.id);
                          else next.add(v.id);
                          return next;
                        });
                      }}
                      className={`p-2 rounded-xl border transition cursor-pointer flex flex-col gap-2 relative group ${
                        isSelected
                          ? "bg-[#282828] border-[#3ea6ff] ring-1 ring-[#3ea6ff]"
                          : "bg-[#181818] border-[#2e2e2e] hover:border-[#444444]"
                      }`}
                    >
                      <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-[#333333]">
                        {v.thumbnail_url && (
                          <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        )}
                        <span className="absolute bottom-1 right-1 px-1 rounded bg-black/80 font-mono text-[9px] text-white">
                          {v.duration_formatted}
                        </span>

                        {/* Checkbox badge */}
                        <div
                          className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-md flex items-center justify-center transition ${
                            isSelected ? "bg-[#3ea6ff] text-black" : "bg-black/60 text-white group-hover:bg-black/80"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>

                      <p className="text-xs font-medium text-[#f1f1f1] truncate">{v.title || v.filename}</p>
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 border-t border-[#2e2e2e] bg-[#181818] flex items-center justify-between shrink-0">
                <span className="text-xs text-[#aaaaaa]">
                  Обрано відео: <strong className="text-white">{selectedPickerIds.size}</strong>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPickerModal(false)}
                    className="h-9 px-4 rounded-full hover:bg-[#272727] text-xs font-medium text-[#aaaaaa] hover:text-white transition"
                  >
                    Скасувати
                  </button>
                  <button
                    onClick={handleConfirmMediaSelection}
                    disabled={selectedPickerIds.size === 0}
                    className="h-9 px-5 rounded-full bg-[#3ea6ff] hover:bg-[#65b8ff] disabled:opacity-50 text-black font-semibold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <span>Додати у проект ({selectedPickerIds.size})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ACTIVE EDITOR WORKSPACE (Google / YouTube Studio Design System)
  return (
    <div
      className={`${
        isFullscreen
          ? "fixed inset-0 z-[100] w-screen h-screen"
          : "w-full h-[calc(100vh-100px)] min-h-[700px]"
      } flex flex-col bg-[#0f0f0f] text-[#f1f1f1] select-none overflow-hidden font-sans`}
      onMouseUp={() => setIsScrubbingRuler(false)}
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportLocalFiles}
        accept="video/*,audio/*"
        multiple
        className="hidden"
      />

      {/* TOP HEADER BAR (YouTube Studio Dark Aesthetic) */}
      <header className="h-12 px-4 bg-[#1f1f1f] border-b border-[#272727] flex items-center justify-between shrink-0 z-20">
        {/* Left: YouTube Studio Title & Active Project */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#272727] border border-[#383838] text-[#3ea6ff] flex items-center justify-center font-bold">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-[#f1f1f1] tracking-wide">
                  YouTube Studio • Відеоредактор
                </span>
              </div>
            </div>
          </div>
          <span className="text-[#383838] hidden sm:inline">|</span>
          <span className="text-xs text-[#aaaaaa] truncate max-w-[260px] hidden md:inline font-mono">
            {activeVideo ? (activeVideo.title || activeVideo.filename) : ""}
          </span>
        </div>

        {/* Center: Aspect Ratio Toggle & Timecode */}
        <div className="flex items-center gap-3">
          <div className="inline-flex p-0.5 bg-[#121212] rounded-full border border-[#2e2e2e] text-xs">
            <button
              onClick={() => setPreviewAspect("16:9")}
              className={`px-3 py-1 rounded-full transition font-medium text-xs cursor-pointer ${
                previewAspect === "16:9"
                  ? "bg-[#383838] text-white font-semibold"
                  : "text-[#aaaaaa] hover:text-white"
              }`}
            >
              16:9 YouTube
            </button>
            <button
              onClick={() => setPreviewAspect("9:16")}
              className={`px-3 py-1 rounded-full transition font-medium text-xs cursor-pointer ${
                previewAspect === "9:16"
                  ? "bg-[#383838] text-white font-semibold"
                  : "text-[#aaaaaa] hover:text-white"
              }`}
            >
              9:16 Shorts
            </button>
          </div>

          <div className="px-3 py-1 bg-[#121212] border border-[#2e2e2e] rounded-full font-mono text-xs text-[#3ea6ff] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#3ea6ff]" />
            <span className="font-semibold">{formatTimecode(currentTime)}</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Snap */}
          <button
            onClick={() => setIsSnapping(!isSnapping)}
            className={`h-8 px-3 rounded-full border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
              isSnapping
                ? "bg-[#272727] border-[#3ea6ff] text-[#3ea6ff]"
                : "bg-[#181818] border-[#2e2e2e] text-[#aaaaaa] hover:text-white"
            }`}
            title="Магнітне прилипання (Snap)"
          >
            <Magnet className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Snap</span>
          </button>

          {/* Fullscreen */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-8 px-3 rounded-full bg-[#272727] hover:bg-[#383838] border border-[#383838] text-[#f1f1f1] text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
            title="На весь екран (F)"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? "Згорнути" : "На весь екран"}</span>
          </button>

          {/* Export button */}
          <button
            onClick={() => setShowExportModal(true)}
            className="h-8 px-4 rounded-full bg-[#3ea6ff] hover:bg-[#65b8ff] text-black font-semibold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Зберегти / Експорт</span>
          </button>
        </div>
      </header>

      {/* MIDDLE WORKSPACE (Clean 3-column docked Google layout) */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* 1. LEFT: PROJECT MEDIA (Only selected videos, with "+ Додати") */}
        <div className="w-72 lg:w-80 bg-[#141414] border-r border-[#272727] flex flex-col shrink-0 min-h-0">
          {/* Header */}
          <div className="p-3 border-b border-[#272727] bg-[#181818] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#f1f1f1] uppercase tracking-wider">
                Кліпи проекту ({projectMedia.length})
              </span>
            </div>

            <button
              onClick={() => {
                setSelectedPickerIds(new Set());
                setShowPickerModal(true);
              }}
              className="h-7 px-2.5 rounded-full bg-[#272727] hover:bg-[#383838] border border-[#383838] text-[#3ea6ff] text-xs font-medium flex items-center gap-1 transition cursor-pointer"
              title="Додати відео в проект"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Додати</span>
            </button>
          </div>

          {/* List of project clips */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
            {projectMedia.map((v) => {
              const isLoaded = v.path === selectedVideoPath;
              return (
                <div
                  key={v.id}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/json", JSON.stringify(v));
                  }}
                  onClick={() => handleLoadVideoToPlayer(v)}
                  className={`p-2 rounded-xl border transition cursor-grab active:cursor-grabbing flex gap-2.5 items-center group ${
                    isLoaded
                      ? "bg-[#252525] border-[#3ea6ff]"
                      : "bg-[#1c1c1c] border-[#2e2e2e] hover:border-[#444444]"
                  }`}
                >
                  <div className="relative w-20 h-12 bg-black rounded-lg overflow-hidden shrink-0 border border-[#333333]">
                    {v.thumbnail_url && (
                      <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    )}
                    <span className="absolute bottom-1 right-1 px-1 rounded bg-black/80 font-mono text-[8px] text-white">
                      {v.duration_formatted}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[#f1f1f1] truncate group-hover:text-[#3ea6ff] transition">
                      {v.title || v.filename}
                    </p>
                    <span className="text-[10px] text-[#aaaaaa] font-mono">{v.resolution}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAppendToTimeline(v);
                    }}
                    className="w-7 h-7 rounded-full bg-[#272727] hover:bg-[#3ea6ff] hover:text-black text-[#aaaaaa] flex items-center justify-center transition shrink-0"
                    title="Додати на таймлайн"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. CENTER: YOUTUBE PLAYER CANVAS */}
        <div className="flex-1 min-w-0 flex flex-col bg-[#050505] min-h-0 overflow-hidden">
          {/* Cinema Player Canvas */}
          <div className="flex-1 min-h-0 flex items-center justify-center relative overflow-hidden group bg-black">
            {streamUrl ? (
              <video
                ref={videoRef}
                src={streamUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={(e) => {
                  const d = (e.target as HTMLVideoElement).duration;
                  if (d && !isNaN(d)) setVideoDuration(d);
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                muted={isMuted}
                className={`max-h-full object-contain transition-all duration-150 ${
                  previewAspect === "9:16"
                    ? "aspect-[9/16] w-auto max-w-[320px]"
                    : "w-full"
                }`}
                onClick={togglePlay}
              />
            ) : (
              <div className="text-xs text-[#aaaaaa] font-mono">Оберіть кліп зліва для відтворення</div>
            )}

            {/* Play overlay button */}
            {!isPlaying && streamUrl && (
              <div
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/35 transition cursor-pointer"
              >
                <div className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-105 transition active:scale-95">
                  <Play className="w-6 h-6 fill-black ml-1" />
                </div>
              </div>
            )}
          </div>

          {/* YouTube Style Transport Bar */}
          <div className="h-12 px-4 bg-[#141414] border-t border-[#272727] flex items-center justify-between shrink-0">
            {/* Playback Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => seekTo(0)}
                className="w-8 h-8 rounded-full hover:bg-[#272727] text-[#aaaaaa] hover:text-white flex items-center justify-center transition cursor-pointer"
                title="На початок"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={() => stepTime(-1)}
                className="w-8 h-8 rounded-full hover:bg-[#272727] text-[#aaaaaa] hover:text-white flex items-center justify-center transition cursor-pointer"
                title="-1 секунда"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={togglePlay}
                className="h-8 px-4 rounded-full bg-[#f1f1f1] hover:bg-white text-black font-semibold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-black" /> : <Play className="w-3.5 h-3.5 fill-black" />}
                <span>{isPlaying ? "Пауза" : "Відтворити"}</span>
              </button>

              <button
                onClick={() => stepTime(1)}
                className="w-8 h-8 rounded-full hover:bg-[#272727] text-[#aaaaaa] hover:text-white flex items-center justify-center transition cursor-pointer"
                title="+1 секунда"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Timecode readout */}
              <div className="text-xs text-[#aaaaaa] font-mono pl-2">
                <span className="text-white font-medium">{formatShortTime(currentTime)}</span>
                <span> / </span>
                <span>{formatShortTime(totalTimelineDuration || videoDuration)}</span>
              </div>
            </div>

            {/* Editing Tools (Split, In/Out, Volume) */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSplitSegment}
                className="h-8 px-3 rounded-full bg-[#3ea6ff] hover:bg-[#65b8ff] text-black font-semibold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                title="Розрізати кліп (S)"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Розрізати (S)</span>
              </button>

              <button
                onClick={handleSetInPoint}
                className="h-8 px-2.5 rounded-full bg-[#222222] hover:bg-[#303030] border border-[#333333] text-[#aaaaaa] hover:text-white text-xs font-mono transition cursor-pointer"
                title="Початок In (I)"
              >
                [ In (I)
              </button>
              <button
                onClick={handleSetOutPoint}
                className="h-8 px-2.5 rounded-full bg-[#222222] hover:bg-[#303030] border border-[#333333] text-[#aaaaaa] hover:text-white text-xs font-mono transition cursor-pointer"
                title="Кінець Out (O)"
              >
                ] Out (O)
              </button>

              <button
                onClick={() => setIsMuted(!isMuted)}
                className="w-8 h-8 rounded-full hover:bg-[#272727] text-[#aaaaaa] hover:text-white flex items-center justify-center transition cursor-pointer"
                title={isMuted ? "Увімкнути звук" : "Вимкнути звук"}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-[#cc0000]" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* 3. RIGHT: CLEAN GOOGLE INSPECTOR PANEL */}
        {showInspector && (
          <div className="w-64 lg:w-72 bg-[#141414] border-l border-[#272727] flex flex-col shrink-0 min-h-0 overflow-y-auto">
            <div className="p-3 border-b border-[#272727] bg-[#181818] flex items-center justify-between shrink-0">
              <span className="text-xs font-semibold text-[#f1f1f1] uppercase tracking-wider">
                Властивості фрагмента
              </span>
            </div>

            <div className="p-4 space-y-4 text-xs">
              {selectedSegment ? (
                <>
                  <div>
                    <label className="text-[11px] text-[#aaaaaa] block mb-1">Назва кліпу</label>
                    <input
                      type="text"
                      value={selectedSegment.label || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSegments((prev) =>
                          prev.map((s) => (s.id === selectedSegment.id ? { ...s, label: val } : s))
                        );
                      }}
                      className="w-full h-8 px-2.5 bg-[#1f1f1f] border border-[#333333] rounded-lg text-xs text-white focus:border-[#3ea6ff] outline-none"
                    />
                  </div>

                  <div className="p-3 bg-[#1c1c1c] border border-[#2e2e2e] rounded-xl space-y-2 font-mono text-[11px]">
                    <div className="flex justify-between text-[#aaaaaa]">
                      <span>Початок:</span>
                      <strong className="text-white">{formatShortTime(selectedSegment.startSec)}</strong>
                    </div>
                    <div className="flex justify-between text-[#aaaaaa]">
                      <span>Кінець:</span>
                      <strong className="text-white">{formatShortTime(selectedSegment.endSec)}</strong>
                    </div>
                    <div className="flex justify-between border-t border-[#2e2e2e] pt-1.5 text-white">
                      <span>Тривалість:</span>
                      <strong className="text-[#3ea6ff]">{selectedSegment.durationSec.toFixed(1)}с</strong>
                    </div>
                  </div>

                  {/* Volume Slider */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#aaaaaa]">Гучність звуку</span>
                      <span className="font-mono text-white">{Math.round((selectedSegment.volume || 1) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1.5"
                      step="0.05"
                      value={selectedSegment.volume ?? 1}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setSegments((prev) =>
                          prev.map((s) => (s.id === selectedSegment.id ? { ...s, volume: v } : s))
                        );
                      }}
                      className="w-full accent-[#3ea6ff] cursor-pointer"
                    />
                  </div>

                  {/* Playback speed */}
                  <div>
                    <span className="text-[11px] text-[#aaaaaa] block mb-1.5">Швидкість</span>
                    <div className="grid grid-cols-4 gap-1">
                      {[0.5, 1, 1.5, 2].map((spd) => (
                        <button
                          key={spd}
                          onClick={() => {
                            setSegments((prev) =>
                              prev.map((s) => (s.id === selectedSegment.id ? { ...s, speed: spd } : s))
                            );
                            if (videoRef.current) videoRef.current.playbackRate = spd;
                          }}
                          className={`py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                            (selectedSegment.speed || 1) === spd
                              ? "bg-[#3ea6ff] text-black"
                              : "bg-[#222222] text-[#aaaaaa] hover:text-white"
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-[#272727] flex flex-col gap-2">
                    <button
                      onClick={() => handleDuplicateSegment(selectedSegment)}
                      className="w-full h-8 rounded-full bg-[#222222] hover:bg-[#303030] text-white text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-[#3ea6ff]" />
                      <span>Дублювати кліп</span>
                    </button>
                    <button
                      onClick={() => handleDeleteSegment(selectedSegment.id)}
                      className="w-full h-8 rounded-full bg-[#272727] hover:bg-[#cc0000]/20 text-[#cc0000] text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Видалити (Del)</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-[#aaaaaa] space-y-2">
                  <p>Оберіть фрагмент на таймлайні нижче для налаштування.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM: YOUTUBE STUDIO MULTI-TRACK TIMELINE */}
      <div className="h-60 bg-[#121212] border-t border-[#272727] flex flex-col shrink-0 min-h-0 z-10">
        {/* Toolbar */}
        <div className="h-9 px-4 bg-[#181818] border-b border-[#272727] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSplitSegment}
              className="h-6 px-2.5 rounded-full bg-[#272727] hover:bg-[#383838] text-white font-medium text-[11px] flex items-center gap-1 transition cursor-pointer"
              title="Розрізати (S)"
            >
              <Scissors className="w-3 h-3 text-[#3ea6ff]" />
              <span>Розрізати</span>
            </button>

            <button
              onClick={() => {
                if (selectedSegmentId) handleDeleteSegment(selectedSegmentId);
              }}
              className="h-6 px-2.5 rounded-full bg-[#272727] hover:bg-[#383838] text-white font-medium text-[11px] flex items-center gap-1 transition cursor-pointer"
              title="Видалити (Del)"
            >
              <Trash2 className="w-3 h-3 text-[#cc0000]" />
              <span>Видалити</span>
            </button>

            <span className="text-[#383838]">|</span>

            {/* Zoom Slider */}
            <div className="flex items-center gap-1.5">
              <ZoomOut className="w-3 h-3 text-[#aaaaaa]" />
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                className="w-16 lg:w-24 accent-[#3ea6ff] h-1 cursor-pointer"
              />
              <ZoomIn className="w-3 h-3 text-[#aaaaaa]" />
            </div>
          </div>

          <div className="text-[11px] font-mono text-[#aaaaaa] flex items-center gap-2">
            <span>Разом: <strong className="text-white">{formatShortTime(totalTimelineDuration)}</strong></span>
            <span>•</span>
            <span>Фрагментів: <strong className="text-white">{segments.length}</strong></span>
          </div>
        </div>

        {/* Tracks View */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Headers */}
          <div className="w-16 bg-[#181818] border-r border-[#272727] flex flex-col shrink-0">
            <div className="h-6 border-b border-[#272727] bg-[#141414]" />
            <div className="h-20 border-b border-[#272727] flex flex-col items-center justify-center gap-1">
              <span className="text-xs font-bold text-[#3ea6ff] font-mono">V1</span>
              <Eye className="w-3 h-3 text-[#666666]" />
            </div>
            <div className="h-14 flex flex-col items-center justify-center gap-1">
              <span className="text-xs font-bold text-[#aaaaaa] font-mono">A1</span>
              <Music className="w-3 h-3 text-[#666666]" />
            </div>
          </div>

          {/* Canvas */}
          <div
            ref={timelineRef}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
              setIsDraggingOverTimeline(true);
            }}
            onDragLeave={() => setIsDraggingOverTimeline(false)}
            onDrop={handleTimelineDrop}
            className={`flex-1 overflow-x-auto overflow-y-hidden relative bg-[#0d0d0d] select-none ${
              isDraggingOverTimeline ? "ring-2 ring-[#3ea6ff]/60" : ""
            }`}
          >
            {/* Time Ruler */}
            <div
              ref={rulerRef}
              onMouseDown={handleRulerMouseDown}
              onMouseMove={(e) => {
                if (isScrubbingRuler) handleRulerScrub(e);
              }}
              style={{
                width: `${Math.max(1200, (totalTimelineDuration + 30) * pxPerSec)}px`,
              }}
              className="h-6 border-b border-[#272727] bg-[#161616] relative cursor-pointer"
            >
              {rulerTicks.map((t) => (
                <div
                  key={t.sec}
                  style={{ left: `${t.sec * pxPerSec}px` }}
                  className="absolute top-0 bottom-0 flex flex-col justify-between"
                >
                  <span className="text-[9px] font-mono text-[#888888] pl-1 select-none">
                    {t.label}
                  </span>
                  <div
                    className={`w-px ${
                      t.isMajor ? "h-3 bg-[#555555]" : "h-1.5 bg-[#333333]"
                    }`}
                  />
                </div>
              ))}
            </div>

            {/* Tracks Body */}
            <div
              style={{
                width: `${Math.max(1200, (totalTimelineDuration + 30) * pxPerSec)}px`,
              }}
              className="relative min-h-[140px]"
            >
              {/* Red YouTube Playhead */}
              <div
                style={{
                  left: `${currentTime * pxPerSec}px`,
                }}
                className="absolute top-[-24px] bottom-0 w-px bg-[#cc0000] z-30 pointer-events-none"
              >
                <div className="absolute top-0 left-[-5px] w-2.5 h-2.5 rounded-full bg-[#cc0000]" />
              </div>

              {/* V1 Track */}
              <div className="h-20 border-b border-[#272727] relative flex items-center px-1">
                {segments.map((seg, idx) => {
                  const clipWidth = Math.max(80, seg.durationSec * pxPerSec);
                  const isSelected = seg.id === selectedSegmentId;

                  return (
                    <div
                      key={seg.id}
                      draggable={true}
                      onDragStart={() => setDraggedSegmentIndex(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedSegmentIndex !== null && draggedSegmentIndex !== idx) {
                          const updated = [...segments];
                          const [moved] = updated.splice(draggedSegmentIndex, 1);
                          updated.splice(idx, 0, moved);
                          setSegments(updated);
                          setDraggedSegmentIndex(null);
                        }
                      }}
                      onClick={() => {
                        setSelectedSegmentId(seg.id);
                        if (seg.sourcePath !== selectedVideoPath) {
                          setSelectedVideoPath(seg.sourcePath);
                        }
                        seekTo(seg.startSec);
                      }}
                      style={{ width: `${clipWidth}px` }}
                      className={`h-16 rounded-lg border relative overflow-hidden cursor-pointer transition shrink-0 ${
                        isSelected
                          ? "border-[#3ea6ff] bg-[#2a2a2a] ring-1 ring-[#3ea6ff]"
                          : "border-[#383838] bg-[#222222] hover:border-[#555555]"
                      }`}
                    >
                      {/* Subdued filmstrip */}
                      <div className="absolute inset-0 opacity-25 mix-blend-overlay flex overflow-hidden pointer-events-none">
                        {Array.from({ length: Math.ceil(clipWidth / 50) }).map((_, i) => (
                          <div
                            key={i}
                            className="w-[50px] h-full border-r border-black/50 bg-cover bg-center shrink-0"
                            style={{
                              backgroundImage: activeVideo?.thumbnail_url
                                ? `url(${activeVideo.thumbnail_url})`
                                : "none",
                            }}
                          />
                        ))}
                      </div>

                      <div className="relative z-10 p-1.5 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#f1f1f1] truncate max-w-[130px]">
                          {seg.label || `Кліп ${idx + 1}`}
                        </span>
                        <span className="text-[9px] font-mono px-1 rounded bg-black/70 text-[#aaaaaa]">
                          {seg.durationSec.toFixed(1)}s
                        </span>
                      </div>

                      <div className="absolute bottom-1 left-1.5 right-1.5 z-10 flex justify-between text-[8px] font-mono text-[#888888]">
                        <span>{formatShortTime(seg.startSec)}</span>
                        <span>{formatShortTime(seg.endSec)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* A1 Track */}
              <div className="h-14 relative flex items-center px-1">
                {segments.map((seg, idx) => {
                  const clipWidth = Math.max(80, seg.durationSec * pxPerSec);
                  const isSelected = seg.id === selectedSegmentId;

                  return (
                    <div
                      key={`a_${seg.id}`}
                      style={{ width: `${clipWidth}px` }}
                      className={`h-10 rounded-lg border relative overflow-hidden transition flex items-center px-2 shrink-0 ${
                        isSelected
                          ? "border-[#3ea6ff]/60 bg-[#1e2836]"
                          : "border-[#2e2e2e] bg-[#181818]"
                      }`}
                    >
                      <div className="w-full flex items-center justify-between gap-0.5 opacity-60">
                        {Array.from({ length: Math.min(60, Math.ceil(clipWidth / 6)) }).map(
                          (_, i) => {
                            const h = 4 + Math.sin(i * 0.7 + idx) * 6 + Math.cos(i * 1.3) * 4;
                            return (
                              <div
                                key={i}
                                style={{ height: `${Math.max(3, Math.min(18, h))}px` }}
                                className="w-1 bg-[#3ea6ff] rounded-full shrink-0"
                              />
                            );
                          }
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EXPORT MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#1f1f1f] border border-[#383838] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2e2e2e]">
              <h3 className="font-semibold text-[#f1f1f1] text-base">Експорт готового відео</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="w-7 h-7 rounded-full hover:bg-[#333333] text-[#aaaaaa] hover:text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {renderedResult ? (
              <div className="space-y-4 py-2 text-center">
                <div className="w-12 h-12 rounded-full bg-[#3ea6ff]/20 text-[#3ea6ff] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-semibold text-white text-base">Відео успішно збережено</h4>
                  <p className="text-xs text-[#aaaaaa] mt-1 font-mono">{renderedResult.filename}</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleOpenInPostDrawer}
                    className="flex-1 h-10 rounded-full bg-[#3ea6ff] hover:bg-[#65b8ff] text-black font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Опублікувати на YouTube (AI)</span>
                  </button>
                  <button
                    onClick={() => {
                      setRenderedResult(null);
                      setShowExportModal(false);
                    }}
                    className="h-10 px-4 rounded-full bg-[#272727] hover:bg-[#383838] text-[#f1f1f1] text-xs font-medium transition"
                  >
                    Закрити
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-[#aaaaaa] block mb-1.5">Формат</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setExportTargetFormat("16:9")}
                      className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                        exportTargetFormat === "16:9"
                          ? "bg-[#282828] border-[#3ea6ff] text-white"
                          : "bg-[#181818] border-[#2e2e2e] text-[#aaaaaa] hover:text-white"
                      }`}
                    >
                      <Film className="w-4 h-4 text-[#3ea6ff]" />
                      <span className="font-semibold text-xs">16:9 YouTube</span>
                      <span className="text-[10px] text-[#aaaaaa]">1920x1080</span>
                    </button>
                    <button
                      onClick={() => setExportTargetFormat("9:16")}
                      className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                        exportTargetFormat === "9:16"
                          ? "bg-[#282828] border-[#cc0000] text-white"
                          : "bg-[#181818] border-[#2e2e2e] text-[#aaaaaa] hover:text-white"
                      }`}
                    >
                      <Zap className="w-4 h-4 text-[#cc0000]" />
                      <span className="font-semibold text-xs">9:16 Shorts</span>
                      <span className="text-[10px] text-[#aaaaaa]">1080x1920</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#aaaaaa] block mb-1.5">Назва файлу</label>
                  <input
                    type="text"
                    value={exportFilename}
                    onChange={(e) => setExportFilename(e.target.value)}
                    className="w-full h-9 px-3 bg-[#121212] border border-[#333333] rounded-lg text-xs text-white outline-none focus:border-[#3ea6ff] transition font-mono"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={handleExportTimeline}
                    disabled={isExporting}
                    className="flex-1 h-10 rounded-full bg-[#3ea6ff] hover:bg-[#65b8ff] disabled:opacity-50 text-black font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Рендеринг...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Зберегти відео</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowExportModal(false)}
                    disabled={isExporting}
                    className="h-10 px-4 rounded-full bg-[#272727] hover:bg-[#383838] text-[#f1f1f1] text-xs font-medium transition"
                  >
                    Скасувати
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
