# Starter: Практики 11–12 — Ролевая модель (RBAC) + контрольная

Этот репозиторий — **учебная заготовка** (не готовое решение).

## Контекст (на базе ПР7–10)

- ПР7–8: регистрация/вход, bcrypt, JWT, защищённые маршруты
- ПР9: refresh-токены + `/api/auth/refresh`
- ПР10: фронтенд + хранение токенов + авто-refresh при 401 (axios interceptors)

## Что добавлено в ПР11

- **Роли:** `admin` и `user`
- **RBAC middleware:** `requireRole("admin")`
- **Admin API:**
  - `GET /api/admin/users`
  - `PATCH /api/admin/users/:id/role`
- **Товары:**
  - просмотр доступен user/admin
  - изменения доступны только admin

## ПР12

Контрольная демонстрация: RBAC + refresh‑механика (см. `docs/student-handout.md`).

---

## Быстрый старт

### Backend

```bash
cd backend
npm i
npm run dev
```

- API: http://localhost:3000
- Swagger UI: http://localhost:3000/api-docs

### Frontend

```bash
cd frontend
npm i
npm run dev
```

- Frontend: http://localhost:3001

---

## Структура

Backend:

- `backend/app.js` — точка входа, Swagger, роуты
- `backend/middleware/authJwt.js` — `authMiddleware` + `requireRole`
- `backend/routes/auth.js` — register/login/refresh/me (в токены кладётся `role`)
- `backend/routes/admin.js` — admin‑эндпоинты (RBAC)
- `backend/routes/products.js` — товары (просмотр: user/admin, изменение: admin)
- `backend/store/usersStore.js` — users[] в памяти (учебно)
- `backend/store/productsStore.js` — товары в JSON (не тема ПР11, осталось из прошлых практик)

Frontend:

- `frontend/src/api/apiClient.js` — axios + interceptors (auto refresh)
- `frontend/src/api/authApi.js` — login/register/me
- `frontend/src/api/adminApi.js` — список пользователей + смена роли
- `frontend/src/App.jsx` — demo‑панель (логин + товары + admin)

Docs:

- `docs/student-handout.md` — методичка по работе с репозиторием по ПР11–12

---

## Важно (учебные ограничения)

- Пользователи хранятся в памяти (`users[]`) → после перезапуска бэка всё очищается.
- Refresh‑токены тоже в памяти (`Set`) → после перезапуска refresh станет недействительным.
- Роль хранится в токене → после смены роли лучше перелогиниться/refresh.
