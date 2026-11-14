import config from "config";
import { EXPLANATION_MAX_WORDS } from "@project/api-contract";
import type { Item } from "@project/content-model";
import { logError } from "../../utils/logger.js";

/** An OpenAI-compatible chat endpoint, described only by configuration (PRD 15.9). */
type Provider = { baseUrl: string; apiKey: string; model: string };
type AiExplainConfig = { enabled: boolean; primary: Provider; secondary: Provider };

const TIMEOUT_MS = 8000;
const LANGUAGE_NAME: Record<string, string> = { en: "English", he: "Hebrew" };
/** A reference line this short (a brace, `return x;`) says nothing on its own and is not checked. */
const SHORTEST_CHECKED_LINE = 10;

const collapse = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * The automated check on a reply (PRD 15.9): at most the word limit, and no reference solution in
 * it, whole or any meaningful line of it, compared after normalising whitespace.
 */
export function isSafeExplanation(reply: string, referenceLines: readonly string[]): boolean {
  const text = collapse(reply);
  if (text.length === 0 || text.split(" ").length > EXPLANATION_MAX_WORDS) return false;
  const reference = collapse(referenceLines.join("\n"));
  const lines = referenceLines.map(collapse).filter((line) => line.length >= SHORTEST_CHECKED_LINE);
  return !text.includes(reference) && !lines.some((line) => text.includes(line));
}

function configuredProviders(): Provider[] {
  const settings = config.get<AiExplainConfig>("app.aiExplain");
  if (!settings.enabled) return [];
  return [settings.primary, settings.secondary].filter((provider) => provider.baseUrl && provider.apiKey && provider.model);
}

/** Only the item, the reference solution and the learner's code are sent: no personal identifiers. */
function messagesFor(item: Item, source: string, language: string) {
  const system = [
    "You are a JavaScript tutor. A learner's code does not solve the task.",
    `In at most ${EXPLANATION_MAX_WORDS} words, in ${LANGUAGE_NAME[language] ?? "English"}, explain what is wrong with the learner's code and what idea to reconsider.`,
    "Never write the corrected code, the reference solution or any line of it. Keep identifiers and code terms as they are.",
  ].join(" ");
  const user = [`Task: ${item.prompt}`, `Reference solution (never reveal it):\n${(item.solution.reference ?? []).join("\n")}`, `Learner's code:\n${source}`].join("\n\n");
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

async function ask(provider: Provider, messages: ReturnType<typeof messagesFor>): Promise<string | null> {
  const response = await fetch(`${provider.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${provider.apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ model: provider.model, messages, max_tokens: 220, temperature: 0.2 }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`provider answered ${response.status}`);
  const body = (await response.json()) as { choices?: { message?: { content?: unknown } }[] };
  const content = body.choices?.[0]?.message?.content;
  return typeof content === "string" ? content : null;
}

/**
 * "Explain my mistake" for a `CODE_WRITE` item (PRD 15.9, owner decision D6): each configured
 * provider in turn until one answers; a reply that fails the check is dropped. Null in every other
 * case (flag off, no provider, provider errors or timeouts), and the app shows the pre-written
 * explanation and hints instead, with no error message.
 */
export async function explainMistake(item: Item, source: string, language: string): Promise<string | null> {
  if (item.format !== "CODE_WRITE" || !item.solution.reference) return null;
  const messages = messagesFor(item, source, language);
  for (const [slot, provider] of configuredProviders().entries()) {
    try {
      const reply = await ask(provider, messages);
      if (reply === null) continue;
      return isSafeExplanation(reply, item.solution.reference) ? collapse(reply) : null;
    } catch (error) {
      // The slot, not the URL: a provider URL can carry an account id.
      logError("[AI]", error, { phase: "explain-mistake", providerSlot: slot + 1 });
    }
  }
  return null;
}
