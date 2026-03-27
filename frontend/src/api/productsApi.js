import { api } from "./apiClient";

/**
 * productsApi.js — функции-обёртки над HTTP-запросами к /api/products
 * productsApi.js — это просто функции для запросов
 *
 * Практика 10:
 * - CRUD товаров на фронте
 * - часть маршрутов защищена JWT (см. backend/routes/products.js)
 * - токен подставляется автоматически через axios interceptors (apiClient.js)
 */

export async function getProducts() {
  return (await api.get("/products")).data;
}

export async function getProductById(id) {
  return (await api.get(`/products/${id}`)).data;
}

export async function createProduct(payload) {
  return (await api.post("/products", payload)).data;
}

// По заданию Практики 10 обновление товара — PUT /api/products/:id
export async function updateProduct(id, payload) {
  return (await api.put(`/products/${id}`, payload)).data;
}

// Оставим PATCH как доп. вариант (для сравнения PUT vs PATCH)
// TODO (студентам): если решите использовать PATCH, защитите маршрут на бэкенде так же, как PUT/DELETE.
export async function patchProduct(id, patch) {
  return (await api.patch(`/products/${id}`, patch)).data;
}

export async function deleteProduct(id) {
  return (await api.delete(`/products/${id}`)).data;
}
