import { api } from "./apiClient";

/**
 * adminApi.js — запросы для админских операций (Практика 11: RBAC).
 * Все запросы требуют accessToken (Authorization подставит interceptor).
 */

export async function getUsers() {
  return (await api.get("/admin/users")).data;
}

export async function setUserRole(userId, role) {
  return (await api.patch(`/admin/users/${userId}/role`, { role })).data;
}
