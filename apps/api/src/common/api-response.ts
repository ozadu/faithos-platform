export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
  meta: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  message: string;
  errors: unknown[];
}

export interface MessageResponse<T> {
  data: T;
  message: string;
  meta?: Record<string, unknown>;
}

export function apiResponse<T>(message: string, data: T): MessageResponse<T> {
  return { data, message };
}
