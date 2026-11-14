/** What a README badge shows (PRD 14.3): who, which track, the ranked tier once placed, and the streak. */
export type BadgeFacts = { username: string; track: string; tier: string | null; streak: number };

const WIDTH = 360;
const HEIGHT = 64;
/** The app's own palette, so the badge reads as Platyko on any README. */
const COLOUR = { background: "#080930", text: "#F4F3FF", muted: "#B6B8DE", accent: "#FF8A3D" };

const escapeXml = (text: string) => text.replace(/[<>&"']/g, (character) => `&#${character.charCodeAt(0)};`);

/** A self-contained SVG card; every value is escaped, so a username cannot inject markup. */
export function badgeSvg(facts: BadgeFacts): string {
  const detail = [facts.track, facts.tier, `${facts.streak}-day streak`].filter(Boolean).join(" · ");
  const title = `${facts.username} on Platyko: ${detail}`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeXml(title)}">`,
    `<title>${escapeXml(title)}</title>`,
    `<rect width="${WIDTH}" height="${HEIGHT}" rx="12" fill="${COLOUR.background}"/>`,
    `<rect x="12" y="12" width="40" height="40" rx="10" fill="${COLOUR.accent}"/>`,
    `<text x="32" y="40" text-anchor="middle" font-family="Verdana,sans-serif" font-size="22" font-weight="700" fill="${COLOUR.background}">P</text>`,
    `<text x="64" y="29" font-family="Verdana,sans-serif" font-size="15" font-weight="700" fill="${COLOUR.text}">${escapeXml(facts.username)}</text>`,
    `<text x="64" y="48" font-family="Verdana,sans-serif" font-size="12" fill="${COLOUR.muted}">${escapeXml(detail)}</text>`,
    "</svg>",
  ].join("");
}
