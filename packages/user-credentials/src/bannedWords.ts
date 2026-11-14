/**
 * Usernames and bios are the only free text another user sees (there is no chat, PRD 11.2), so
 * they are checked against word lists. Matching undoes common letter swaps (`a$$` -> `ass`) and
 * ignores separators. Words that only offend on their own ("ass", "cock") must stand alone, so
 * names like "classic" or "peacock" pass. The Hebrew list waits for the owner's decision on where
 * it is stored (PRD Q13).
 */

/** Offensive wherever they appear inside a name. */
const ANYWHERE = [
  "fuck", "shit", "cunt", "nigger", "nigga", "faggot", "bitch", "whore", "slut", "twat", "wanker",
  "cocksucker", "asshole", "bastard", "bullshit", "dickhead", "retard", "rapist", "hitler", "nazi",
  "porn", "pussy", "kike",
];
/** Offensive only as a word of their own. */
const WHOLE_WORD = ["ass", "cum", "tit", "tits", "sex", "fag", "dick", "cock", "rape", "paki", "spic", "chink", "penis", "vagina", "tranny", "spastic", "bollocks"];

const LOOKALIKES: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s", "!": "i" };

function normalised(text: string): string {
  return [...text.toLowerCase()].map((character) => LOOKALIKES[character] ?? character).join("");
}

/** Whether the text contains a banned word. */
export function containsBannedWord(text: string): boolean {
  const plain = normalised(text);
  const lettersOnly = plain.replace(/[^\p{L}]/gu, "");
  const words = new Set(plain.split(/[^\p{L}]+/u).filter(Boolean));
  return ANYWHERE.some((word) => lettersOnly.includes(word)) || WHOLE_WORD.some((word) => words.has(word) || lettersOnly === word);
}
