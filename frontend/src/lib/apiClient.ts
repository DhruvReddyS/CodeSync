// src/lib/apiClient.ts
import axios, {
  InternalAxiosRequestConfig,
  AxiosHeaders,
} from "axios";

const apiClient = axios.create({
  baseURL: "http://localhost:5000/api",
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = sessionStorage.getItem("token");

  if (token) {
    let headers = config.headers as AxiosHeaders | undefined;

    // If headers isn't an AxiosHeaders instance yet, create one
    if (!headers || !(headers instanceof AxiosHeaders)) {
      headers = new AxiosHeaders(headers); // seed with existing values if any
      config.headers = headers;
    }

    headers.set("Authorization", `Bearer ${token}`);
  }

  return config;
});

export default apiClient;
