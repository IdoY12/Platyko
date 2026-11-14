import type { Request, Response } from "express";
import type { ExplainMistakeResponse, JudgeCodeResponse } from "@project/api-contract";
import { prisma } from "@project/db";
import { judgeCodeWrite } from "@project/code-sandbox";
import type { AuthenticatedRequest } from "../../@types/auth.js";
import { loadContentMap, loadItems, loadLessonContent } from "../../services/content/contentCatalog.js";
import { explainMistake } from "../../services/content/explainMistake.js";
import { recordItemFeedback } from "../../services/content/itemFeedback.js";
import type { ItemFeedbackBody, ItemParams, ItemsQuery, JudgeCodeBody, LessonParams } from "../../validators/contentValidators.js";

const NOT_FOUND = { error: "Not found" };

export async function getContentMap(_request: Request, response: Response): Promise<void> {
  response.json(await loadContentMap());
}

export async function getLessonContent(request: Request, response: Response): Promise<void> {
  const { lessonId } = request.validatedParams as LessonParams;
  const lesson = await loadLessonContent(lessonId);
  if (!lesson) response.status(404).json(NOT_FOUND);
  else response.json(lesson);
}

export async function getItems(request: Request, response: Response): Promise<void> {
  const { ids } = request.validatedQuery as ItemsQuery;
  response.json({ items: await loadItems(ids) });
}

/** Judges a `CODE_WRITE` answer in the sandbox. Guests may call it: the verdict pays nothing by itself. */
export async function postJudgeCode(request: Request, response: Response): Promise<void> {
  const { itemId } = request.validatedParams as ItemParams;
  const { source } = request.validatedBody as JudgeCodeBody;
  const [item] = await loadItems([itemId]);
  const { entry, tests } = item?.solution ?? {};
  if (!item || item.format !== "CODE_WRITE" || !entry || !tests) {
    response.status(404).json(NOT_FOUND);
    return;
  }
  const verdict: JudgeCodeResponse = await judgeCodeWrite(entry, source, tests);
  response.json(verdict);
}

/** "Explain my mistake" (PRD 15.9): an explanation, or null for the pre-written one; never an error. */
export async function postExplainMistake(request: AuthenticatedRequest, response: Response): Promise<void> {
  const { itemId } = request.validatedParams as ItemParams;
  const { source } = request.validatedBody as JudgeCodeBody;
  const [[item], user] = await Promise.all([loadItems([itemId]), prisma.user.findUnique({ where: { id: request.user!.userId }, select: { language: true } })]);
  const body: ExplainMistakeResponse = { explanation: item ? await explainMistake(item, source, user?.language ?? "en") : null };
  response.json(body);
}

export async function postItemFeedback(request: AuthenticatedRequest, response: Response): Promise<void> {
  const { itemId } = request.validatedParams as ItemParams;
  const outcome = await recordItemFeedback(request.user!.userId, itemId, request.validatedBody as ItemFeedbackBody);
  if (outcome === "item-not-found") response.status(404).json(NOT_FOUND);
  else response.status(204).send();
}
