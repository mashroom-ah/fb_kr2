const express = require("express");
const cors = require("cors");

// Swagger (OpenAPI)
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

// Наши модули
const logger = require("./middleware/logger");
const productsRouter = require("./routes/products");
const authRouter = require("./routes/auth");
const adminRouter = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Конвейер обработки запроса (pipeline) в Express:
 * - middleware выполняются сверху вниз
 * - затем роуты (router.get/post/...)
 * - если никто не ответил, доходим до 404
 *
 * Важно:
 * Порядок app.use(...) имеет значение.
 *
 * Практики 7–10 (что добавилось по шагам):
 * - 7–8: /api/auth/register, /api/auth/login, /api/auth/me + JWT middleware
 * - 9:   /api/auth/refresh (refresh-токен → новая пара токенов)
 * - 10:  фронтенд хранит токены (localStorage) и авто-refresh при 401 (axios interceptors)
 */

// 1) CORS: разрешаем браузеру (React dev server) ходить на API.
// Если фронт стартует на другом порту (например 5173/3001), добавьте его сюда.
// В учебном проекте достаточно одного origin, но при необходимости можно расширить:
app.use(
  cors({
    origin: "http://localhost:3001",
  })
);

// 2) JSON parser: без этого req.body будет undefined
// Все POST/PUT/PATCH, где вы отправляете JSON (login/register/refresh/products), зависят от этой строки.
app.use(express.json());

// 3) Логирование запросов (для отладки)
// Удобно показывать на паре: видно, какие endpoint'ы реально вызываются с фронта,
// особенно в момент 401 → refresh → повтор исходного запроса.
app.use(logger);

/**
 * Swagger/OpenAPI:
 * - swagger-jsdoc читает JSDoc-комментарии @swagger в routes/*.js
 * - генерирует OpenAPI JSON (спеку)
 * - swagger-ui-express показывает UI на /api-docs
 *
 * bearerAuth нужен, чтобы Swagger UI умел подставлять JWT через кнопку Authorize.
 *
 * Практики 9–10:
 * - В Swagger можно руками проверить: login → получить токены → refresh → новая пара → me.
 * - На фронте это делается автоматически (axios interceptors), но Swagger помогает отлаживать бэкенд.
 */
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Products API",
      version: "1.0.0",
      description:
        "Учебный REST API (товары + аутентификация) для практик 7–10: auth (bcrypt+JWT), refresh tokens, frontend token storage",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Локальный сервер",
      },
    ],
  },
  // Где искать @swagger аннотации:
  // - routes/*.js: описание endpoint'ов (auth/products)
  // - middleware/*.js: можно документировать схемы/ошибки, если нужно
  apis: ["./routes/*.js", "./middleware/*.js", "./app.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// UI документации
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Healthcheck: быстрый индикатор “сервер жив”
app.get("/", (req, res) => {
  res.send("Express API is running. Try /api/products");
});

/**
 * Роуты API:
 *
 * /api/auth
 * - POST /register  (Практика 7)
 * - POST /login     (Практики 7–8; в 9-й практике начинает возвращать access+refresh)
 * - POST /refresh   (Практика 9)
 * - GET  /me        (Практика 8)
 *
 * /api/products
 * - CRUD товаров (используется как защищённый ресурс для проверки JWT и refresh-механизма)
 */
app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/admin", adminRouter);

// Error handler: если в async-роуте случилась ошибка — вернём 500, а не “упадём”
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// 404: если ни один маршрут не подошёл
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server started: http://localhost:${PORT}`);
  console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
});