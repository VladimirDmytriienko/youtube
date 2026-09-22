"use client";

import React from "react";
import { Trash2, AlertTriangle, Loader2, Archive } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onArchive?: () => void;
  filename: string;
  isDeleting?: boolean;
  isArchiving?: boolean;
}

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  onArchive,
  filename,
  isDeleting = false,
  isArchiving = false,
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card border border-border text-card-foreground rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-full bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-foreground">
              Видалити локальний файл?
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Файл <span className="font-mono font-medium text-foreground bg-muted px-1.5 py-0.5 rounded text-[11px] break-all">{filename}</span> буде безповоротно видалено з жорсткого диска вашого комп&apos;ютера.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Цю дію неможливо скасувати. Відео зникне з медіатеки.</span>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting || isArchiving}
            className="h-9 px-4 rounded-full border border-border hover:bg-accent text-foreground text-xs font-medium transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            Скасувати
          </button>
          {onArchive && (
            <button
              type="button"
              onClick={onArchive}
              disabled={isDeleting || isArchiving}
              className="h-9 px-4 rounded-full bg-secondary hover:bg-accent text-foreground text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isArchiving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>В архів...</span>
                </>
              ) : (
                <>
                  <Archive className="w-3.5 h-3.5" />
                  <span>В архів (безпечно)</span>
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting || isArchiving}
            className="h-9 px-4 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Видалення...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Видалити назавжди</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
