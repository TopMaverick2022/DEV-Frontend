import apiClient, { tokenStore } from "../../lib/api-client";
import {
  AuthRequest,
  AuthResponse,
  RegisterRequest,
  VerificationRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from "../../types/auth";
import { AxiosError } from "axios";

interface ApiError {
  userMessage: string;
}

const handleError = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiError;
    if (apiError?.userMessage) {
      return apiError.userMessage;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred.";
};

export const authService = {
  async login(request: AuthRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>("/auth/login", request);
      tokenStore.set(response.data.accessToken);
      return response.data;
    } catch (error) {
      throw new Error(handleError(error));
    }
  },

  async register(request: RegisterRequest): Promise<string> {
    try {
      const response = await apiClient.post<string>("/auth/register", request);
      return response.data;
    } catch (error) {
      throw new Error(handleError(error));
    }
  },

  async verifyEmail(request: VerificationRequest): Promise<string> {
    try {
      const response = await apiClient.post<string>("/auth/verify-email", request);
      return response.data;
    } catch (error) {
      throw new Error(handleError(error));
    }
  },

  async resendVerification(email: string): Promise<string> {
    try {
      const response = await apiClient.post<string>(`/auth/resend-verification?email=${email}`);
      return response.data;
    } catch (error) {
      throw new Error(handleError(error));
    }
  },

  async forgotPassword(request: ForgotPasswordRequest): Promise<string> {
    try {
      const response = await apiClient.post<string>("/auth/forgot-password", request);
      return response.data;
    } catch (error) {
      throw new Error(handleError(error));
    }
  },

  async resetPassword(request: ResetPasswordRequest): Promise<string> {
    try {
      const response = await apiClient.post<string>("/auth/reset-password", request);
      return response.data;
    } catch (error) {
      throw new Error(handleError(error));
    }
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      tokenStore.clear();
    }
  },

  isAuthenticated(): boolean {
    return !!tokenStore.get();
  },
};

export const login = authService.login;
export const register = authService.register;
