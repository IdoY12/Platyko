// Shared by the git hooks in this folder (CLAUDE.md rule 9).
const HEBREW_CHARACTERS = /\p{Script=Hebrew}/u;

const findFirstHebrewLineNumber = (text) => {
  const lineIndex = text.split("\n").findIndex((line) => HEBREW_CHARACTERS.test(line));
  return lineIndex === -1 ? null : lineIndex + 1;
};

module.exports = { HEBREW_CHARACTERS, findFirstHebrewLineNumber };
