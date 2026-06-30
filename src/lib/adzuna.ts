const APP_ID = import.meta.env.VITE_ADZUNA_APP_ID as string;
const APP_KEY = import.meta.env.VITE_ADZUNA_APP_KEY as string;

export type AdzunaJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  url: string;
  created: string;
};

export async function fetchAdzunaJobs(
  keywords: string[],
  opts: { country?: string; resultsPerPage?: number; page?: number; where?: string; salaryMin?: number; salaryMax?: number } = {},
): Promise<AdzunaJob[]> {
  if (!APP_ID || !APP_KEY) {
    return [];
  }

  const country = opts.country ?? "in";
  const page = opts.page ?? 1;
  const what = keywords.filter(Boolean).join(" ").trim() || "software";
  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/${page}`);
  url.searchParams.set("app_id", APP_ID);
  url.searchParams.set("app_key", APP_KEY);
  url.searchParams.set("results_per_page", String(opts.resultsPerPage ?? 12));
  url.searchParams.set("what", what);
  if (opts.where) url.searchParams.set("where", opts.where);
  if (opts.salaryMin) url.searchParams.set("salary_min", String(opts.salaryMin));
  if (opts.salaryMax) url.searchParams.set("salary_max", String(opts.salaryMax));
  url.searchParams.set("content-type", "application/json");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Adzuna error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return (data.results ?? []).map((j: any) => ({
    id: String(j.id),
    title: j.title ?? "Untitled",
    company: j.company?.display_name ?? "Unknown",
    location: j.location?.display_name ?? "",
    salary:
      j.salary_min || j.salary_max
        ? `${j.salary_min ? Math.round(j.salary_min).toLocaleString() : "?"} – ${j.salary_max ? Math.round(j.salary_max).toLocaleString() : "?"}`
        : undefined,
    description: j.description ?? "",
    url: j.redirect_url ?? "#",
    created: j.created ?? "",
  }));
}

export function scoreJobAgainstSkills(job: AdzunaJob, skills: string[]): number {
  if (!skills.length) return 0;
  const hay = `${job.title} ${job.description}`.toLowerCase();
  let hits = 0;
  const matched: string[] = [];
  for (const skill of skills) {
    const key = skill.toLowerCase().trim();
    if (key.length < 2) continue;
    if (hay.includes(key)) {
      hits += 1;
      matched.push(skill);
    }
  }
  const ratio = hits / skills.length;
  const score = Math.min(100, Math.round(ratio * 100));
  (job as AdzunaJob & { matchedSkills?: string[] }).matchedSkills = matched;
  return score;
}
