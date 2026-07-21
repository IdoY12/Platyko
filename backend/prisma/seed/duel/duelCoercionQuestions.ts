/**
 * Coercion and array-method duel questions for the flat pool.
 *
 * Responsibility: five unique MCQ rows on type coercion and built-in methods.
 * Layer: backend prisma seed
 * Depends on: buildDuelQuestions
 * Consumers: persistDuelQuestions.ts
 */

import type { Prisma } from "@prisma/client";
import { buildDuelQuestions } from "./buildDuelQuestions.js";

export function buildCoercionQuestions(): Prisma.DuelQuestionCreateManyInput[] {
  return buildDuelQuestions([
    {
      questionText: "What does this code print?",
      codeSnippet: "const nums = [10, 9, 100, 21];\nconsole.log(nums.sort());",
      options: ["[10, 100, 21, 9]", "[9, 10, 21, 100]", "[10, 9, 100, 21]", "[100, 21, 10, 9]", "[9, 10, 100, 21]"],
      correctAnswer: "[10, 100, 21, 9]",
      explanation: "Array.sort() with no comparator coerces elements to strings and sorts by UTF-16 order, so '100' precedes '21'.",
    },
    {
      questionText: "What is the output?",
      codeSnippet: "console.log(1 + 2 + '3' + 4);",
      options: ["334", "1234", "10", "634", "NaN"],
      correctAnswer: "334",
      explanation: "Evaluated left to right: 1 + 2 is 3, then 3 + '3' becomes the string '33', then '33' + 4 becomes '334'.",
    },
    {
      questionText: "What is the output?",
      codeSnippet: "console.log(['1', '2', '3'].map(parseInt));",
      options: ["[1, NaN, NaN]", "[1, 2, 3]", "[NaN, NaN, NaN]", "[1, NaN, 3]", "[0, 1, 2]"],
      correctAnswer: "[1, NaN, NaN]",
      explanation: "map passes (value, index), so parseInt runs with radix 0, 1 and 2: radix 0 defaults to 10 giving 1, radix 1 is invalid, and '3' is not a base-2 digit.",
    },
    {
      questionText: "What is the output?",
      codeSnippet: "console.log([] == ![]);",
      options: ["true", "false", "TypeError", "undefined", "NaN"],
      correctAnswer: "true",
      explanation: "![] is false, then [] == false coerces both sides to 0: [] becomes '' then 0, and false becomes 0, so 0 == 0 is true.",
    },
    {
      questionText: "What does this code print?",
      codeSnippet: "console.log([NaN].indexOf(NaN));",
      options: ["-1", "0", "1", "NaN", "undefined"],
      correctAnswer: "-1",
      explanation: "indexOf uses strict equality and NaN === NaN is always false, so the value is never found and -1 is returned.",
    },
  ]);
}
