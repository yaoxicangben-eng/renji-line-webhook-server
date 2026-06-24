export const seminarCookieNames = {
  viewerId: "seminar_viewer_id",
  startedAt: "seminar_started_at",
  expiresAt: "seminar_expires_at",
} as const;

export const seminarHeaderNames = {
  viewerId: "x-seminar-viewer-id",
  startedAt: "x-seminar-started-at",
  expiresAt: "x-seminar-expires-at",
} as const;

export type SeminarDeadlineState = {
  viewerId: string;
  startedAt: string;
  expiresAt: string;
  isExpired: boolean;
  serverNow: string;
};

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function isValidIsoDate(value: string | undefined) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function isExpiredAt(expiresAt: string, now: Date) {
  return Date.parse(expiresAt) <= now.getTime();
}
