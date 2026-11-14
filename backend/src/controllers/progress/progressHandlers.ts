import type { Response } from "express";
import { prisma } from "@project/db";
import type { AttemptRecord } from "@project/learning-logic";
import type { AuthenticatedRequest } from "../../@types/auth.js";
import { readProgress, submitProgress } from "../../services/progress/submitProgress.js";
import type { ProgressQuery, SaveResumeBody, SubmitProgressBody } from "../../validators/progressValidators.js";

const USER_NOT_FOUND = { error: "User not found" };

export async function getProgress(request: AuthenticatedRequest, response: Response): Promise<void> {
  const { date } = request.validatedQuery as ProgressQuery;
  const progress = await readProgress(request.user!.userId, date);
  if (!progress) response.status(404).json(USER_NOT_FOUND);
  else response.json(progress);
}

export async function postProgressAttempts(request: AuthenticatedRequest, response: Response): Promise<void> {
  const body = request.validatedBody as SubmitProgressBody;
  const result = await submitProgress(request.user!.userId, { ...body, attempts: body.attempts as AttemptRecord[] });
  if (!result) response.status(404).json(USER_NOT_FOUND);
  else response.json(result);
}

export async function putLessonResume(request: AuthenticatedRequest, response: Response): Promise<void> {
  const { lessonId, session } = request.validatedBody as SaveResumeBody;
  const data = { lessonId, position: session.position, state: session };
  await prisma.lessonResume.upsert({ where: { userId: request.user!.userId }, create: { userId: request.user!.userId, ...data }, update: data });
  response.status(204).send();
}

export async function deleteLessonResume(request: AuthenticatedRequest, response: Response): Promise<void> {
  await prisma.lessonResume.deleteMany({ where: { userId: request.user!.userId } });
  response.status(204).send();
}
