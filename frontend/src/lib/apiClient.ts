// src/lib/apiClient.ts
import axios, {
  InternalAxiosRequestConfig,
  AxiosHeaders,
} from "axios";

const apiClient = axios.create({
  baseURL: "http://localhost:5000/api",
});

// Use InternalAxiosRequestConfig in interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = sessionStorage.getItem("token");

    if (token) {
      // headers is AxiosRequestHeaders (which extends AxiosHeaders)
      const headers = config.headers as AxiosHeaders;
      headers.set("Authorization", `Bearer ${token}`);
      config.headers = headers;
    }

    return config;
  }
);

export default apiClient;
