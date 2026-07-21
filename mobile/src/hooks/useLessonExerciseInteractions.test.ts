import { beforeEach, describe, expect, it, vi } from "vitest";
import type Exercise from "@/models/Exercise";
import type LearningService from "@/services/auth-aware/LearningService";
import { runLessonExerciseCheck, type LessonCheckSetters } from "@/hooks/useLessonExerciseInteractions";
import { SUBMIT_FAILED_MESSAGE } from "@/constants/feedbackMessages";

(globalThis as { __DEV__?: boolean }).__DEV__ = false;

const exercise: Exercise = {
  id: "ex-1", type: "MCQ", prompt: "p", codeSnippet: "", correctAnswer: "42", explanation: "because", options: [],
};

function makeSetters(): LessonCheckSetters {
  return {
    setServerResult: vi.fn(), setIsAnswerCorrect: vi.fn(), setHasChecked: vi.fn(), setSubmitError: vi.fn(),
  };
}

const submitExercise = vi.fn();
const learning = { submitExercise } as unknown as LearningService;

beforeEach(() => {
  submitExercise.mockReset();
});

describe("runLessonExerciseCheck", () => {
  it("authenticated + correct + server failure: shows submit error, never commits success or XP", async () => {
    submitExercise.mockRejectedValue(new Error("network down"));
    const s = makeSetters();
    await runLessonExerciseCheck(learning, "token", exercise, "42", s);
    expect(s.setSubmitError).toHaveBeenLastCalledWith(SUBMIT_FAILED_MESSAGE);
    expect(s.setServerResult).not.toHaveBeenCalled();
    expect(s.setIsAnswerCorrect).not.toHaveBeenCalled();
    expect(s.setHasChecked).not.toHaveBeenCalled();
  });

  it("authenticated + correct + server success: commits the server-confirmed result", async () => {
    submitExercise.mockResolvedValue({ xpEarned: 250, streakCurrent: 3 });
    const s = makeSetters();
    await runLessonExerciseCheck(learning, "token", exercise, "42", s);
    expect(submitExercise).toHaveBeenCalledWith("ex-1", "42");
    expect(s.setServerResult).toHaveBeenCalledWith({ xpEarned: 250, explanation: "because", streakCurrent: 3 });
    expect(s.setIsAnswerCorrect).toHaveBeenCalledWith(true);
    expect(s.setHasChecked).toHaveBeenCalledWith(true);
  });

  it("guest + correct: commits locally with no server call", async () => {
    const s = makeSetters();
    await runLessonExerciseCheck(learning, null, exercise, "42", s);
    expect(submitExercise).not.toHaveBeenCalled();
    expect(s.setServerResult).toHaveBeenCalledWith({ xpEarned: 250, explanation: "because" });
    expect(s.setIsAnswerCorrect).toHaveBeenCalledWith(true);
    expect(s.setHasChecked).toHaveBeenCalledWith(true);
  });

  it("authenticated + wrong answer: commits locally with no server call and no XP", async () => {
    const s = makeSetters();
    await runLessonExerciseCheck(learning, "token", exercise, "41", s);
    expect(submitExercise).not.toHaveBeenCalled();
    expect(s.setServerResult).toHaveBeenCalledWith({ xpEarned: 0, explanation: "because" });
    expect(s.setIsAnswerCorrect).toHaveBeenCalledWith(false);
  });
});
