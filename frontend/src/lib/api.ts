import axios, { AxiosError } from "axios";

type TokenGetter = () => Promise<string | null>;

let tokenGetter: TokenGetter | null = null;

export function setAuthTokenGetter(getter: TokenGetter | null): void {
  tokenGetter = getter;
}

const baseURL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  "http://localhost:8000";

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  if (tokenGetter) {
    try {
      const token = await tokenGetter();
      if (token) {
        config.headers.set("Authorization", `Bearer ${token}`);
      }
    } catch {
      // If token retrieval fails, request continues without Authorization;
      // backend will return 401 and the UI surfaces the error.
    }
  }
  return config;
});

export interface ApiError {
  status: number;
  message: string;
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string | { msg: string }[] }>) => {
    let message = "Error de red";
    if (error.response) {
      const data = error.response.data;
      if (typeof data?.detail === "string") {
        message = data.detail;
      } else if (Array.isArray(data?.detail) && data.detail.length > 0) {
        message = data.detail.map((d) => d.msg).join(", ");
      } else {
        message = `Error ${error.response.status}`;
      }
    } else if (error.message) {
      message = error.message;
    }
    const apiError: ApiError = {
      status: error.response?.status ?? 0,
      message,
    };
    return Promise.reject(apiError);
  },
);
