/**
 * Unified API Client for YouTube Scheduler
 * Connects directly to FastAPI backend (port 8000) to eliminate Next.js rewrite
 * proxy 30-second timeouts during large video uploads and FFmpeg processing.
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : "http://127.0.0.1:8000");

export function getApiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}

export function getThumbnailUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${API_BASE}/api/thumbnail?path=${encodeURIComponent(path)}`;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = getApiUrl(path);
  try {
    return await fetch(url, init);
  } catch (err: any) {
    throw new Error(
      err?.message?.includes("Failed to fetch")
        ? "Не вдалося з'єднатися з сервером (порт 8000). Перевірте чи запущено Python сервер."
        : err?.message || "Мережева помилка підключення до сервера"
    );
  }
}

export async function apiFetchJson<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  const text = await res.text();

  let data: any = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // Response is not valid JSON (e.g. plain text or HTML error from server/proxy)
    if (!res.ok) {
      throw new Error(
        text.includes("Internal Server Error")
          ? "Внутрішня помилка сервера. Перевірте логи backend."
          : text.slice(0, 300) || `Помилка сервера HTTP ${res.status}`
      );
    }
    return text as unknown as T;
  }

  if (!res.ok) {
    const errorMsg =
      data?.detail ||
      data?.message ||
      data?.error ||
      `Помилка сервера HTTP ${res.status}`;
    throw new Error(typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg));
  }

  return data as T;
}
