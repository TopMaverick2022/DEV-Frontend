import axios from "axios";

// Access token lives in memory only — never in localStorage
let inMemoryAccessToken: string | null = null;

export const tokenStore = {
  get: () => inMemoryAccessToken,
  set: (token: string) => { inMemoryAccessToken = token; },
  clear: () => { inMemoryAccessToken = null; },
};

const apiClient = axios.create({
  baseURL: "http://localhost:8080/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // sends httpOnly refresh token cookie automatically
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh interceptor: on 401, try /auth/refresh-token using the cookie
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/")
    ) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post(
          "http://localhost:8080/api/auth/refresh-token",
          {},
          { withCredentials: true }
        );
        tokenStore.set(data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch {
        tokenStore.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
