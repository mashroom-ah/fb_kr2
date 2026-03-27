import { api, setTokens, clearTokens } from "./apiClient";

export async function registerUser(payload) {
  return (await api.post("/auth/register", payload)).data;
}

export async function loginUser(payload) {
  const data = (await api.post("/auth/login", payload)).data;

  setTokens(data);

  return data;
}

export async function logoutUser() {
  clearTokens();
}

export async function getMe() {
  return (await api.get("/auth/me")).data;
}