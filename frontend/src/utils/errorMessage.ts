import axios from 'axios';

type ErrorPayload = {
  error?: {
    message?: string;
  };
  message?: string;
};

export const resolveErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as ErrorPayload | undefined;
    if (payload?.error?.message) {
      return payload.error.message;
    }
    if (payload?.message) {
      return payload.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return fallback;
};
