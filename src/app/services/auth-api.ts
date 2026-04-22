import axios, { AxiosResponse } from 'axios';
import {
  ForgotPasswordStartRequest,
  ForgotPasswordStartResponse,
  MessageResponse,
  ResetPasswordRequest,
} from '../models/auth';

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/$/, '') ?? 'https://localhost:53005/api';

function getApiBaseCandidates(): string[] {
  const candidates: string[] = [];

  if (API_BASE_URL) {
    candidates.push(API_BASE_URL);
  }

  if (API_BASE_URL.endsWith('/api')) {
    candidates.push(API_BASE_URL.slice(0, -4));
  } else {
    candidates.push(`${API_BASE_URL}/api`);
  }

  return Array.from(new Set(candidates.map((value) => value.replace(/\/$/, ''))));
}

async function postWithApiFallback<TResponse, TRequest>(
  path: string,
  body: TRequest,
): Promise<AxiosResponse<TResponse>> {
  const bases = getApiBaseCandidates();
  let lastError: unknown;

  const shouldRetryWithNextBase = (error: unknown): boolean => {
    if (!axios.isAxiosError(error)) {
      return false;
    }

    // Retry only when this appears to be a route/base mismatch, not a business-level 404.
    if (error.response?.status !== 404) {
      return false;
    }

    const payload = error.response.data as
      | {
          message?: string;
          error?: string;
          detail?: string;
          title?: string;
        }
      | string
      | undefined;

    if (typeof payload === 'string') {
      return /not\s*found/i.test(payload);
    }

    if (!payload || typeof payload !== 'object') {
      return true;
    }

    if (payload.message || payload.error) {
      return false;
    }

    return /not\s*found/i.test(payload.title || payload.detail || '');
  };

  for (const base of bases) {
    try {
      const response = await axios.post<TResponse>(`${base}${path}`, body, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response;
    } catch (error) {
      if (shouldRetryWithNextBase(error)) {
        lastError = error;
        continue;
      }

      throw error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error('Unable to reach authentication service.');
}

export async function forgotPasswordStart(email: string): Promise<ForgotPasswordStartResponse> {
  const payload: ForgotPasswordStartRequest = { email };
  const response = await postWithApiFallback<ForgotPasswordStartResponse, ForgotPasswordStartRequest>(
    '/auth/forgot-password/start',
    payload,
  );

  return response.data;
}

export async function resetPassword(
  email: string,
  newPassword: string,
  confirmPassword: string,
): Promise<MessageResponse> {
  const payload: ResetPasswordRequest = {
    email,
    newPassword,
    confirmPassword,
  };

  const response = await postWithApiFallback<MessageResponse, ResetPasswordRequest>(
    '/auth/forgot-password/reset',
    payload,
  );

  return response.data;
}
