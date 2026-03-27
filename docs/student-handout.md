# Методичка для студентов: практики 11–12 (Ролевая модель / RBAC + контрольная)

Этот репозиторий — **учебная заготовка**, а не готовое решение.  
В коде есть **TODO**, которые нужно закрыть самостоятельно.

## Контекст (что уже было раньше)
- Практики 7–8: регистрация/вход, bcrypt, JWT, защищённые маршруты
- Практика 9: refresh-токены + `/api/auth/refresh`
- Практика 10: фронтенд + хранение токенов + авто-refresh при 401 (axios interceptors)

> Если вы забыли базу — откройте `README.md` и методичку прошлых практик в репозитории ПР9–10.

---

## 0) Как запустить проект

### Backend
```bash
cd backend
npm i
npm run dev
```
- API: http://localhost:3000  
- Swagger UI: http://localhost:3000/api-docs  

### Frontend (React, Vite)
```bash
cd frontend
npm i
npm run dev
```
- Frontend: http://localhost:3001

---

## 1) Практика 11 — Ролевая модель (RBAC)

### Цель
Реализовать и продемонстрировать **2 роли**:
- **admin** — управляет ролями пользователей + полный доступ к товарам
- **user** — может **только просматривать** товары

### Правила доступа (минимум)
| Эндпоинт | Кто может |
|---|---|
| `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh` | все |
| `GET /api/auth/me` | любой залогиненный (user/admin) |
| `GET /api/products`, `GET /api/products/:id` | user + admin |
| `POST /api/products`, `PUT/PATCH/DELETE /api/products/:id` | **только admin** |
| `GET /api/admin/users` | **только admin** |
| `PATCH /api/admin/users/:id/role` | **только admin** |

### Как устроено в коде (где смотреть)
Backend:
- `backend/routes/auth.js`
  - выдаёт **access+refresh**, в payload кладёт `role`
- `backend/middleware/authJwt.js`
  - `authMiddleware` проверяет **accessToken**
  - `requireRole("admin")` запрещает доступ не‑admin
- `backend/routes/products.js`
  - просмотр доступен всем залогиненным
  - операции изменения — только `admin`
- `backend/routes/admin.js`
  - список пользователей и смена роли (RBAC)

Frontend:
- `frontend/src/api/apiClient.js`
  - подставляет `Authorization: Bearer <accessToken>`
  - делает refresh при 401
- `frontend/src/api/adminApi.js`
  - запросы к `/api/admin/...` (только admin)
- `frontend/src/App.jsx`
  - минимальная админ‑панель: список пользователей и выбор роли

### TODO студентам (Практика 11)
1) Сделать ограничения доступа **строго** по таблице выше (проверьте, что нигде не “протекло”).
2) В Swagger добавить `security: bearerAuth` для защищённых эндпоинтов.
3) Добавить сообщения об ошибках на русском (как минимум 401/403).
4) (Доп.) Реализовать “logout” на бэкенде: отзыв refresh‑токена.

---

## 2) Практика 12 — Контрольная (проверка понимания)

### Что показать/сдать
1) Демонстрация RBAC:
- user не может создать/удалить товар (403)
- admin может
2) Демонстрация refresh‑механики:
- сломали accessToken → получили 401 → фронт сделал refresh → повторил запрос → 200

### Формат отчёта
Ссылка на ваш репозиторий (GitHub/GitVerse/др.), кратко:
- какие эндпоинты защищены и чем
- как проверяли (скриншоты Swagger/браузера)
