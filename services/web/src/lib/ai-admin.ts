import { apiFetch } from "./api-fetch";

export interface ManagedPrompt {
  id: string;
  name: string;
  personalityPrompt: string;
  executionPrompt: string;
  outputSchemaJson: Record<string, unknown>;
  enabled: boolean;
  revision: number;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}
export class AiAdminError extends Error {
  status: number;
  constructor(status: number) {
    super("AI administration request failed");
    this.status = status;
  }
}
export async function aiAdminRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await apiFetch("/api/admin/ai" + path, init);
  if (!response.ok) throw new AiAdminError(response.status);
  return response.json();
}
export function parseOutputSchema(text: string): Record<string, unknown> {
  const value = JSON.parse(text);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Schema object required");
  return value;
}
