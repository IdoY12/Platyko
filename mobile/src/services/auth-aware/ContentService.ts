import type { ContentMapResponse, ItemsResponse, JudgeCodeResponse, LessonContentResponse, ItemFeedbackRequest } from "@project/api-contract";
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

  async sendItemFeedback(itemId: string, feedback: ItemFeedbackRequest): Promise<void> {
    await this.axiosInstance.post(`/content/items/${encodeURIComponent(itemId)}/feedback`, feedback);
  }
}
