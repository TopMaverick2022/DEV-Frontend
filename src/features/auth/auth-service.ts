import apiClient from "../../lib/api-client";
import { 
  AuthRequest, 
  AuthResponse, 
  RegisterRequest, 
  VerificationRequest, 
  RefreshTokenRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest
} from "../../types/auth";

export const authService = {
  async login(request: AuthRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/auth/login", request);
    const { accessToken, refreshToken } = response.data;
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    return response.data;
  },

  async register(request: RegisterRequest): Promise<string> {
    const response = await apiClient.post<string>("/auth/register", request);
    return response.data;
  },

  async verifyEmail(request: VerificationRequest): Promise<string> {
    const response = await apiClient.post<string>("/auth/verify-email", request);
    return response.data;
  },

  async resendVerification(email: string): Promise<string> {
    const response = await apiClient.post<string>(`/auth/resend-verification?email=${email}`);
    return response.data;
  },

  async refreshToken(request: RefreshTokenRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/auth/refresh-token", request);
    const { accessToken } = response.data;
    localStorage.setItem("accessToken", accessToken);
    return response.data;
  },

  async forgotPassword(request: ForgotPasswordRequest): Promise<string> {
    const response = await apiClient.post<string>("/auth/forgot-password", request);
    return response.data;
  },

  async resetPassword(request: ResetPasswordRequest): Promise<string> {
    const response = await apiClient.post<string>("/auth/reset-password", request);
    return response.data;
  },

  logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem("accessToken");
  }
};

// Also export individual functions to match user's requested style if needed
export const login = authService.login;
export const register = authService.register;
