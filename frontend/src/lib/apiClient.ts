import axios, { InternalAxiosRequestConfig, AxiosHeaders } from "axios";

const apiBase =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD
    ? "https://codesync-api-2l8n.onrender.com/api"
    : "http://localhost:5000/api");

const apiClient = axios.create({
  baseURL: apiBase,
  withCredentials: false, // ✅ IMPORTANT (Bearer token only, no cookies)
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = sessionStorage.getItem("token");

  if (token) {
    let headers = config.headers as AxiosHeaders | undefined;

    if (!headers || !(headers instanceof AxiosHeaders)) {
      headers = new AxiosHeaders(headers);
      config.headers = headers;
    }

    headers.set("Authorization", `Bearer ${token}`);
  }

  return config;
});

export default apiClient;
