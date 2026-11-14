export type FindingGate = "PRECHECK" | "A" | "B" | "C" | "D";

export type Finding = { gate: FindingGate; check: string; itemId: string | null; unit: string; message: string };

/** `unit` of a finding that concerns the bank as a whole instead of one unit file. */
export const WHOLE_BANK = "*";

export type FindingReporter = (check: string, message: string) => void;

/** Collects the findings of one checker about one unit and, when given, one item. */
export function reporterFor(
  findings: Finding[],
  gate: FindingGate,
  unit: string,
  itemId: string | null = null,
): FindingReporter {
  return (check, message) => findings.push({ gate, check, itemId, unit, message });
}
