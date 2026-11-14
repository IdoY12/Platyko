import { withPositionalNames } from "../bank/codeTokens.js";
import type { CodeToken } from "../bank/codeTokens.js";

/** Lower-cased words with punctuation stripped. */
export function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .split(/\s+/)
    .filter((word) => word !== "");
}

function windows<Element>(elements: Element[], size: number): Element[][] {
  return Array.from({ length: Math.max(0, elements.length - size + 1) }, (_, start) => elements.slice(start, start + size));
}

/** Every run of `size` consecutive words. A text shorter than `size` words has none. */
export function wordGrams(text: string, size: number): Set<string> {
  return new Set(windows(wordsOf(text), size).map((gram) => gram.join(" ")));
}

/**
 * Every run of `size` consecutive tokens, with author-chosen names numbered inside the run, so a
 * fragment matches wherever it sits in a longer snippet and whatever its variables are called.
 */
export function codeGrams(tokens: CodeToken[], size: number): Set<string> {
  return new Set(windows(tokens, size).map((gram) => withPositionalNames(gram, "exact").join(" ")));
}

/** Share of `grams` that also occur in `other`: 1 when all of them do, 0 when `grams` is empty. */
export function containment(grams: Set<string>, other: Set<string>): number {
  if (grams.size === 0) return 0;
  let shared = 0;
  for (const gram of grams) if (other.has(gram)) shared++;
  return shared / grams.size;
}

export type GramDocument = { label: string; grams: Set<string> };
export type GramIndex = { labels: string[]; documentsByGram: Map<string, number[]> };

/** Lets one set of grams be compared with many documents without visiting each document. */
export function indexGrams(documents: GramDocument[]): GramIndex {
  const documentsByGram = new Map<string, number[]>();
  documents.forEach(({ grams }, documentIndex) => {
    for (const gram of grams) {
      const holders = documentsByGram.get(gram);
      if (holders) holders.push(documentIndex);
      else documentsByGram.set(gram, [documentIndex]);
    }
  });
  return { labels: documents.map(({ label }) => label), documentsByGram };
}

export type ClosestDocument = { similarity: number; label: string | null };

/** The indexed document that contains the largest share of `grams`, and that share. */
export function closestDocument(grams: Set<string>, index: GramIndex): ClosestDocument {
  const sharedByDocument = new Map<number, number>();
  for (const gram of grams) {
    for (const documentIndex of index.documentsByGram.get(gram) ?? []) {
      sharedByDocument.set(documentIndex, (sharedByDocument.get(documentIndex) ?? 0) + 1);
    }
  }
  let closest: ClosestDocument = { similarity: 0, label: null };
  for (const [documentIndex, shared] of sharedByDocument) {
    const similarity = shared / grams.size;
    if (similarity > closest.similarity) closest = { similarity, label: index.labels[documentIndex] };
  }
  return closest;
}
