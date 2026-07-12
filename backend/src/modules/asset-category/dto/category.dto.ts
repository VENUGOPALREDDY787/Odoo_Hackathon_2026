export interface CreateCategoryDTO {
  name: string;
  customFields?: Record<string, any> | null;
}

export interface UpdateCategoryDTO {
  name?: string;
  customFields?: Record<string, any> | null;
}
