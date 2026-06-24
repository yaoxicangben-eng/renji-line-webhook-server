import { NextRequest, NextResponse } from "next/server";
import lpConfig from "./content/lp-config.json";
import {
  addMinutes,
  isValidIsoDate,
  seminarCookieNames,
  seminarHeaderNames,
} from "./lib/deadline";
import { saveSeminarViewerAccess } from "./lib/supabase-access";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 60;
const DEADLINE_RESET_PARAM = "resetDeadline";

function getCookieOptions() {
  return {
    httpOnly: true,
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function proxy(request: NextRequest) {
  if (
    (process.env.NODE_ENV !== "production" || process.env.ALLOW_DEADLINE_RESET === "1") &&
    request.nextUrl.searchParams.get(DEADLINE_RESET_PARAM) === "1"
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.searchParams.delete(DEADLINE_RESET_PARAM);
    const response = NextResponse.redirect(redirectUrl);

    response.cookies.delete(seminarCookieNames.viewerId);
    response.cookies.delete(seminarCookieNames.startedAt);
    response.cookies.delete(seminarCookieNames.expiresAt);

    return response;
  }

  const now = new Date();
  const existingViewerId = request.cookies.get(seminarCookieNames.viewerId)?.value;
  const existingStartedAt = request.cookies.get(seminarCookieNames.startedAt)?.value;
  const existingExpiresAt = request.cookies.get(seminarCookieNames.expiresAt)?.value;

  const hasValidSession =
    typeof existingViewerId === "string" &&
    existingViewerId.length > 0 &&
    isValidIsoDate(existingStartedAt) &&
    isValidIsoDate(existingExpiresAt);

  const viewerId = hasValidSession ? existingViewerId : crypto.randomUUID();
  const startedAt = hasValidSession ? existingStartedAt! : now.toISOString();
  const expiresAt = hasValidSession
    ? existingExpiresAt!
    : addMinutes(now, lpConfig.timing.accessDurationMinutes).toISOString();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(seminarHeaderNames.viewerId, viewerId);
  requestHeaders.set(seminarHeaderNames.startedAt, startedAt);
  requestHeaders.set(seminarHeaderNames.expiresAt, expiresAt);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (!hasValidSession) {
    const saveResult = await saveSeminarViewerAccess({
      viewerId,
      firstAccessedAt: startedAt,
      expiresAt,
    });
    const cookieOptions = getCookieOptions();

    response.cookies.set(seminarCookieNames.viewerId, viewerId, cookieOptions);
    response.cookies.set(seminarCookieNames.startedAt, startedAt, cookieOptions);
    response.cookies.set(seminarCookieNames.expiresAt, expiresAt, cookieOptions);
    response.headers.set("x-seminar-access-save", saveResult.status);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};
