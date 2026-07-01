import axios from "axios";

// Access token lives in memory only — never in localStorage
let inMemoryAccessToken: string | null = null;

// Single in-flight promise to prevent race: multiple 401s all trigger one refresh
let refreshPromise: Promise<string> | null = null;

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
  let token = tokenStore.get();
  if (!token) {
    token = localStorage.getItem("token") || localStorage.getItem("auth_token") || localStorage.getItem("accessToken");
  }
  
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
        // Reuse an in-flight refresh so parallel 401s don't all call the endpoint
        if (!refreshPromise) {
          refreshPromise = axios
            .post(
              "http://localhost:8080/api/auth/refresh-token",
              {},
              { withCredentials: true }
            )
            .then((res) => res.data.accessToken)
            .finally(() => { refreshPromise = null; });
        }
        const newAccessToken = await refreshPromise;
        tokenStore.set(newAccessToken);
        localStorage.setItem("accessToken", newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch {
        tokenStore.clear();
        localStorage.removeItem("accessToken");
        localStorage.removeItem("username");
        if (window.location.pathname !== '/login') {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
