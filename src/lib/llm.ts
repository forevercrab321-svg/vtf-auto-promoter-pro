// ============================================================================
// LLM ABSTRACTION  — one interface, swappable providers.
//
// Providers: "none" (default), "anthropic", "openai", "gemini".
// With no key configured, `complete()` returns null and callers fall back to
// deterministic templates. The system is fully functional without any LLM.
//
// Safety: this layer only ever produces TEXT (hypotheses, report drafts,
// summaries). It never executes network requests against targets.
// ============================================================================

export type LlmProvider = "none" | "anthropic" | "openai" | "gemini";

export interface LlmMessage {
  role: "system" | "user";
  content: string;
}

export function getProvider(): LlmProvider {
  const p = (process.env.LLM_PROVIDER || "none").toLowerCase();
  if (p === "anthropic" || p === "openai" || p === "gemini") return p;
  return "none";
}

export function llmConfigured(): boolean {
  const p = getProvider();
  if (p === "anthropic") return !!process.env.ANTHROPIC_API_KEY;
  if (p === "openai") return !!process.env.OPENAI_API_KEY;
  if (p === "gemini") return !!process.env.GEMINI_API_KEY;
  return false;
}

/**
 * Best-effort text completion. Returns null on any failure or when no provider
 * is configured, so callers must always have a deterministic fallback.
 */
export async function complete(
  system: string,
  user: string,
  opts: { maxTokens?: number } = {},
): Promise<string | null> {
  const provider = getProvider();
  if (!llmConfigured()) return null;
  const maxTokens = opts.maxTokens ?? 1200;

  try {
    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY as string,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
          max_tokens: maxTokens,
          system,
          messages: [{ role: "user", content: user }],
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.content?.[0]?.text ?? null;
    }

    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          max_tokens: maxTokens,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.choices?.[0]?.message?.content ?? null;
    }

    if (provider === "gemini") {
      const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: user }] }],
            generationConfig: { maxOutputTokens: maxTokens },
          }),
        },
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    }
  } catch {
    return null;
  }
  return null;
}
