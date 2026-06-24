export type SeminarViewerAccessRecord = {
  viewerId: string;
  firstAccessedAt: string;
  expiresAt: string;
};

export type SupabaseAccessSaveResult =
  | { status: "saved" }
  | { status: "skipped"; reason: "not_configured" };

type SupabaseEnv = Partial<Record<string, string | undefined>> & {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_VIEWER_TABLE?: string;
};

type FetchLike = typeof fetch;

const DEFAULT_VIEWER_TABLE = "seminar_viewers";

export function getSupabaseAccessConfig(env: SupabaseEnv = process.env) {
  const url = env.SUPABASE_URL?.trim().replace(/\/rest\/v1\/?$/, "");
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const viewerTable = env.SUPABASE_VIEWER_TABLE?.trim() || DEFAULT_VIEWER_TABLE;

  if (!url || !serviceRoleKey) {
    return undefined;
  }

  return {
    url: url.replace(/\/$/, ""),
    serviceRoleKey,
    viewerTable,
  };
}

export async function saveSeminarViewerAccess(
  record: SeminarViewerAccessRecord,
  fetchImpl: FetchLike = fetch,
): Promise<SupabaseAccessSaveResult> {
  const config = getSupabaseAccessConfig();

  if (!config) {
    return { status: "skipped", reason: "not_configured" };
  }

  const response = await fetchImpl(
    `${config.url}/rest/v1/${encodeURIComponent(config.viewerTable)}`,
    {
      method: "POST",
      headers: {
        apikey: config.serviceRoleKey,
        authorization: `Bearer ${config.serviceRoleKey}`,
        "content-type": "application/json",
        prefer: "resolution=ignore-duplicates,return=minimal",
      },
      body: JSON.stringify({
        viewer_id: record.viewerId,
        first_accessed_at: record.firstAccessedAt,
        expires_at: record.expiresAt,
      }),
    },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Supabaseへの閲覧期限保存に失敗しました: ${response.status} ${message}`);
  }

  return { status: "saved" };
}
