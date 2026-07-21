/**
 * Scope, closure and modern-syntax duel questions for the flat pool.
 *
 * Responsibility: five unique MCQ rows on runtime scoping and operators.
 * Layer: backend prisma seed
 * Depends on: buildDuelQuestions
 * Consumers: persistDuelQuestions.ts
 */

import type { Prisma } from "@prisma/client";
import { buildDuelQuestions } from "./buildDuelQuestions.js";

export function buildRuntimeQuestions(): Prisma.DuelQuestionCreateManyInput[] {
  return buildDuelQuestions([
    {
      questionText: "What does this code print?",
      codeSnippet: "const fns = [];\nfor (var i = 0; i < 3; i++) {\n  fns.push(() => i);\n}\nconsole.log(fns.map((f) => f()));",
      options: ["[3, 3, 3]", "[0, 1, 2]", "[1, 2, 3]", "[0, 0, 0]", "[3, 3, 3, 3]"],
      correctAnswer: "[3, 3, 3]",
      explanation: "var has a single function-scoped binding shared by every closure, so after the loop ends each function reads the final i of 3.",
    },
    {
      questionText: "What is the output?",
      codeSnippet: "const result = [1, 2, 3, 4].reduce((acc, n) => acc + n, 10);\nconsole.log(result);",
      options: ["20", "10", "16", "24", "NaN"],
      correctAnswer: "20",
      explanation: "The initial accumulator is 10 and the four elements sum to 10, giving 20.",
    },
    {
      questionText: "What is the output?",
      codeSnippet: "const user = { profile: null };\nconsole.log(user.profile?.name ?? 'guest');",
      options: ["guest", "undefined", "null", "TypeError", "name"],
      correctAnswer: "guest",
      explanation: "profile is null so optional chaining short-circuits to undefined, and the nullish coalescing operator then yields the 'guest' fallback.",
    },
    {
      questionText: "What is the result of running this code?",
      codeSnippet: "console.log(typeof score);\nlet score = 5;",
      options: ["ReferenceError", "undefined", "number", "5", "TypeError"],
      correctAnswer: "ReferenceError",
      explanation: "score is a let binding in the temporal dead zone until its declaration, and even typeof throws a ReferenceError when accessing it early.",
    },
    {
      questionText: "What does this code print?",
      codeSnippet: "let cache;\ncache ??= 10;\ncache ??= 20;\nconsole.log(cache);",
      options: ["10", "20", "undefined", "30", "NaN"],
      correctAnswer: "10",
      explanation: "The first ??= assigns 10 because cache is undefined; the second is skipped since cache is no longer nullish.",
    },
  ]);
}
