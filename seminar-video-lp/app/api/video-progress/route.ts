import { headers } from "next/headers";
import { NextResponse } from "next/server";
import lpConfig from "../../../content/lp-config.json";
import { isExpiredAt, seminarHeaderNames } from "../../../lib/deadline";
import {
  getSeminarVideoProgress,
  saveSeminarVideoProgress,
} from "../../../lib/supabase-progress";

function numberFromBody(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

async function getRequestState() {
  const requestHeaders = await headers();
  const viewerId = requestHeaders.get(seminarHeaderNames.viewerId) ?? "";
  const expiresAt = requestHeaders.get(seminarHeaderNames.expiresAt);
  const isExpired = expiresAt ? isExpiredAt(expiresAt, new Date()) : false;

  return {
    viewerId,
    isExpired,
  };
}

export async function GET() {
  const { viewerId, isExpired } = await getRequestState();

  if (isExpired) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  const progress = await getSeminarVideoProgress(viewerId, lpConfig.mux.videoId);
  return NextResponse.json(progress);
}

export async function POST(request: Request) {
  const { viewerId, isExpired } = await getRequestState();

  if (isExpired) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const progress = await saveSeminarVideoProgress({
    viewerId,
    videoId: lpConfig.mux.videoId,
    currentPositionSeconds: numberFromBody(body.currentPositionSeconds),
    maxWatchedSeconds: numberFromBody(body.maxWatchedSeconds),
    salesUnlockVideoSeconds: lpConfig.timing.salesUnlockVideoSeconds,
  });

  return NextResponse.json(progress);
}
