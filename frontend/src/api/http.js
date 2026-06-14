import axios from "axios";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("jwt");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => {
    const payload = response?.data;
    if (payload && (payload.message === "error" || payload.error)) {
      const err = new Error(payload.error || "Request failed");
      err.response = response;
      return Promise.reject(err);
    }
    return response;
  },
  (error) => Promise.reject(error),
);
