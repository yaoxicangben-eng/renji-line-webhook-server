import { getSupabaseAccessConfig } from "./supabase-access";

export type SeminarVideoProgressRecord = {
  viewerId: string;
  videoId: string;
  currentPositionSeconds: number;
  maxWatchedSeconds: number;
  salesUnlocked: boolean;
  updatedAt: string;
};

export type SeminarVideoProgressInput = {
  viewerId: string;
  videoId: string;
  currentPositionSeconds: number;
  maxWatchedSeconds: number;
  salesUnlockVideoSeconds: number;
};

const DEFAULT_PROGRESS_TABLE = "seminar_video_progress";
const MAX_PROGRESS_INCREMENT_SECONDS = 15;

function getProgressTable() {
  return process.env.SUPABASE_PROGRESS_TABLE?.trim() || DEFAULT_PROGRESS_TABLE;
}

function normalizeSeconds(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function toRecord(row: Record<string, unknown>): SeminarVideoProgressRecord {
  return {
    viewerId: String(row.viewer_id ?? ""),
    videoId: String(row.video_id ?? ""),
    currentPositionSeconds: normalizeSeconds(row.current_position_seconds),
    maxWatchedSeconds: normalizeSeconds(row.max_watched_seconds),
    salesUnlocked: Boolean(row.sales_unlocked),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export function emptyVideoProgress(
  viewerId: string,
  videoId: string,
): SeminarVideoProgressRecord {
  return {
    viewerId,
    videoId,
    currentPositionSeconds: 0,
    maxWatchedSeconds: 0,
    salesUnlocked: false,
    updatedAt: "",
  };
}

export async function getSeminarVideoProgress(
  viewerId: string,
  videoId: string,
  fetchImpl: typeof fetch = fetch,
) {
  const config = getSupabaseAccessConfig();

  if (!config || !viewerId || !videoId) {
    return emptyVideoProgress(viewerId, videoId);
  }

  const table = getProgressTable();
  const response = await fetchImpl(
    `${config.url}/rest/v1/${encodeURIComponent(table)}?viewer_id=eq.${encodeURIComponent(
      viewerId,
    )}&video_id=eq.${encodeURIComponent(
      videoId,
    )}&select=viewer_id,video_id,current_position_seconds,max_watched_seconds,sales_unlocked,updated_at&limit=1`,
    {
      headers: {
        apikey: config.serviceRoleKey,
        authorization: `Bearer ${config.serviceRoleKey}`,
      },
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Supabaseから視聴進捗を取得できませんでした: ${response.status} ${message}`);
  }

  const rows = (await response.json()) as Array<Record<string, unknown>>;
  return rows[0] ? toRecord(rows[0]) : emptyVideoProgress(viewerId, videoId);
}

export async function saveSeminarVideoProgress(
  input: SeminarVideoProgressInput,
  fetchImpl: typeof fetch = fetch,
) {
  const config = getSupabaseAccessConfig();

  if (!config) {
    return emptyVideoProgress(input.viewerId, input.videoId);
  }

  const existing = await getSeminarVideoProgress(input.viewerId, input.videoId, fetchImpl);
  const requestedCurrent = normalizeSeconds(input.currentPositionSeconds);
  const requestedMax = Math.max(requestedCurrent, normalizeSeconds(input.maxWatchedSeconds));
  const allowedMax = Math.min(
    requestedMax,
    existing.maxWatchedSeconds + MAX_PROGRESS_INCREMENT_SECONDS,
  );
  const maxWatchedSeconds = Math.max(existing.maxWatchedSeconds, allowedMax);
  const currentPositionSeconds = Math.min(requestedCurrent, maxWatchedSeconds);
  const salesUnlocked =
    existing.salesUnlocked || maxWatchedSeconds >= input.salesUnlockVideoSeconds;
  const updatedAt = new Date().toISOString();
  const table = getProgressTable();
  const body = {
    viewer_id: input.viewerId,
    video_id: input.videoId,
    current_position_seconds: currentPositionSeconds,
    max_watched_seconds: maxWatchedSeconds,
    sales_unlocked: salesUnlocked,
    updated_at: updatedAt,
  };

  const hasExistingRow = existing.updatedAt !== "";
  const response = await fetchImpl(
    hasExistingRow
      ? `${config.url}/rest/v1/${encodeURIComponent(table)}?viewer_id=eq.${encodeURIComponent(
          input.viewerId,
        )}&video_id=eq.${encodeURIComponent(input.videoId)}`
      : `${config.url}/rest/v1/${encodeURIComponent(table)}`,
    {
      method: hasExistingRow ? "PATCH" : "POST",
      headers: {
        apikey: config.serviceRoleKey,
        authorization: `Bearer ${config.serviceRoleKey}`,
        "content-type": "application/json",
        prefer: "return=representation",
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Supabaseへ視聴進捗を保存できませんでした: ${response.status} ${message}`);
  }

  const rows = (await response.json()) as Array<Record<string, unknown>>;
  return rows[0] ? toRecord(rows[0]) : { ...existing, ...body, updatedAt };
}
