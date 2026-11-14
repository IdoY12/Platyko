import type { ContentMapResponse, ExplainMistakeResponse, ItemFeedbackRequest, ItemsResponse, JudgeCodeResponse, LessonContentResponse } from "@project/api-contract";
import AuthAware from "./AuthAware";

/** The question bank: the skill map, lessons, items, the code judge and item feedback. */
export default class ContentService extends AuthAware {
  async getMap(): Promise<ContentMapResponse> {
    const { data } = await this.axiosInstance.get<ContentMapResponse>("/content/map");
    return data;
  }

  async getLesson(lessonId: string): Promise<LessonContentResponse> {
    const { data } = await this.axiosInstance.get<LessonContentResponse>(`/content/lessons/${encodeURIComponent(lessonId)}`);
    return data;
  }

  async getItems(itemIds: string[]): Promise<ItemsResponse> {
    const { data } = await this.axiosInstance.get<ItemsResponse>("/content/items", { params: { ids: itemIds.join(",") } });
    return data;
  }

  async judgeCode(itemId: string, source: string): Promise<JudgeCodeResponse> {
    const { data } = await this.axiosInstance.post<JudgeCodeResponse>(`/content/items/${encodeURIComponent(itemId)}/judge`, { source });
    return data;
  }

  /** "Explain my mistake" (PRD 15.9): null means no live explanation; any failure counts as null too. */
  async explainMistake(itemId: string, source: string): Promise<string | null> {
    const { data } = await this.axiosInstance.post<ExplainMistakeResponse>(`/content/items/${encodeURIComponent(itemId)}/explain`, { source });
    return data.explanation;
  }

  async sendItemFeedback(itemId: string, feedback: ItemFeedbackRequest): Promise<void> {
    await this.axiosInstance.post(`/content/items/${encodeURIComponent(itemId)}/feedback`, feedback);
  }
}
