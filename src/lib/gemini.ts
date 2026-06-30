const KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const MODEL = "gemini-1.5-flash";

function normalizeSkills(skills: string[]): string[] {
  return Array.from(
    new Set(
      skills
        .map((skill) => skill.trim())
        .filter((skill) => skill.length > 1 && skill.length < 50)
        .map((skill) => skill.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, ""))
        .filter(Boolean),
    ),
  ).slice(0, 25);
}

function inferSkillsFromText(resumeText: string): string[] {
  const lower = resumeText.toLowerCase();
  const candidates = [
    "react",
    "typescript",
    "javascript",
    "node",
    "python",
    "java",
    "go",
    "aws",
    "docker",
    "kubernetes",
    "postgres",
    "sql",
    "tailwind",
    "nextjs",
    "vite",
    "graphql",
    "redis",
    "supabase",
    "azure",
    "terraform",
    "ci/cd",
    "testing",
    "jest",
    "playwright",
    "git",
    "linux",
    "api",
    "rest",
    "microservices",
    "system design",
  ];

  return normalizeSkills(candidates.filter((candidate) => lower.includes(candidate)));
}

export async function extractSkillsFromResume(resumeText: string): Promise<string[]> {
  const prompt = `Extract a JSON array of distinct technical skills, tools, frameworks, languages, and notable keywords from this resume. Return ONLY a JSON array of short strings, max 25 items, no prose.\n\nResume:\n${resumeText.slice(0, 15000)}`;

  const isApiKey = KEY.startsWith("AIza");
  const url = isApiKey
    ? `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`
    : `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!isApiKey) headers["Authorization"] = `Bearer ${KEY}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      }),
    });
    if (!res.ok) {
      throw new Error(`Gemini error: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return normalizeSkills(parsed.map((s: unknown) => String(s)));
      }
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed)) return normalizeSkills(parsed.map((s: unknown) => String(s)));
        } catch {}
      }
    }
  } catch {
    // Fallback to heuristic extraction when the provider is unavailable or returns no useful data.
  }

  return inferSkillsFromText(resumeText);
}
