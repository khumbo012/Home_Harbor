import { createClient } from "@supabase/supabase-js";
import type { AnalyticsSummary, AppData, AppProfile, FeedbackItem } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export async function loadCloudPortfolio(userId: string) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase
    .from("user_portfolios")
    .select("profile,data,onboarded")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as { profile: AppProfile | null; data: AppData | null; onboarded: boolean | null } | null;
}

export async function saveCloudPortfolio(userId: string, profile: AppProfile, data: AppData, onboarded: boolean) {
  if (!supabase) return;

  const { error } = await supabase
    .from("user_portfolios")
    .upsert({
      user_id: userId,
      profile,
      data,
      onboarded,
    }, { onConflict: "user_id" });

  if (error) throw error;
}

export async function uploadDocumentFile(userId: string, file: File, documentId: string) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${userId}/${documentId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from("documents").upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });

  if (error) throw error;
  return path;
}

export async function openDocumentFile(filePath: string) {
  if (!supabase) return;

  const { data, error } = await supabase.storage.from("documents").createSignedUrl(filePath, 60);
  if (error) throw error;

  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

export async function submitFeedback(userId: string, feedback: FeedbackItem) {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { error } = await supabase.from("feedback").insert({
    user_id: userId,
    type: feedback.type,
    message: feedback.message,
    email: feedback.email || null,
    page: feedback.page || null,
    user_agent: navigator.userAgent,
  });

  if (error) throw error;
}

export async function recordAnalyticsEvent(userId: string | undefined, eventName: string, metadata: Record<string, unknown> = {}) {
  if (!supabase || !userId || localStorage.getItem("home-harbor-analytics-enabled") === "false") return;

  await supabase.from("analytics_events").insert({
    user_id: userId,
    event_name: eventName,
    metadata,
    path: window.location.pathname,
    user_agent: navigator.userAgent,
  });
}

export async function loadAnalyticsSummary(userId: string): Promise<AnalyticsSummary> {
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase
    .from("analytics_events")
    .select("event_name,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) throw error;

  const counts = new Map<string, number>();
  for (const event of data || []) counts.set(event.event_name, (counts.get(event.event_name) || 0) + 1);

  return {
    totalEvents: data?.length || 0,
    lastEventAt: data?.[0]?.created_at || null,
    topEvents: [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  };
}
