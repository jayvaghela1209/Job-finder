import { supabase, type JobMatch } from "@/integrations/supabase/client";
import { fetchAdzunaJobs, scoreJobAgainstSkills, type AdzunaJob } from "./adzuna";

export type RankedJob = AdzunaJob & { matchScore: number; matchedSkills: string[] };

export async function findAndStoreMatches(
  userId: string,
  userEmail: string,
  skills: string[],
): Promise<RankedJob[]> {
  const jobs = await fetchAdzunaJobs(skills);
  const ranked: RankedJob[] = jobs
    .map((j) => {
      const score = scoreJobAgainstSkills(j, skills);
      return { ...j, matchScore: score, matchedSkills: (j as any).matchedSkills ?? [] };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  const top = ranked.slice(0, 10);
  if (top.length) {
    await supabase.from("job_matches").insert(
      top.map((j) => ({
        user_id: userId,
        job_title: j.title,
        company: j.company,
        location: j.location,
        salary: j.salary ?? null,
        match_score: j.matchScore,
        job_url: j.url,
        alerted: false,
      })),
    );
  }

  const strong = ranked.filter((j) => j.matchScore >= 70).slice(0, 5);
  if (strong.length) {
    try {
      await supabase.functions.invoke("send-alert", {
        body: {
          to: userEmail,
          jobs: strong.map((j) => ({
            title: j.title,
            company: j.company,
            location: j.location,
            score: j.matchScore,
            url: j.url,
          })),
        },
      });
      await supabase.from("job_matches").update({ alerted: true }).eq("user_id", userId).gte("match_score", 70);
    } catch (error) {
      console.warn("Email alert failed (deploy send-alert edge function):", error);
    }
  }

  return ranked;
}

export async function loadRecentMatches(userId: string): Promise<JobMatch[]> {
  const { data } = await supabase
    .from("job_matches")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data as JobMatch[]) ?? [];
}

export async function saveJob(userId: string, job: { title: string; company: string; location: string; salary?: string; url: string }) {
  return supabase.from("saved_jobs").insert({
    user_id: userId,
    job_title: job.title,
    company: job.company,
    location: job.location,
    salary: job.salary ?? null,
    job_url: job.url,
  });
}

export async function loadSavedJobs(userId: string) {
  const { data } = await supabase.from("saved_jobs").select("*").eq("user_id", userId).order("saved_at", { ascending: false });
  return data ?? [];
}

export async function addUserSkill(userId: string, skill: string) {
  const normalized = skill.trim();
  if (!normalized) return;
  const { data } = await supabase.from("profiles").select("skills").eq("id", userId).maybeSingle();
  const current = ((data?.skills as string[] | null) ?? []).filter(Boolean);
  if (current.includes(normalized)) return;
  await supabase.from("profiles").update({ skills: [...current, normalized] }).eq("id", userId);
}

export async function removeUserSkill(userId: string, skill: string) {
  const { data } = await supabase.from("profiles").select("skills").eq("id", userId).maybeSingle();
  const current = ((data?.skills as string[] | null) ?? []).filter(Boolean);
  await supabase.from("profiles").update({ skills: current.filter((value) => value !== skill) }).eq("id", userId);
}
