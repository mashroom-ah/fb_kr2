const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { nanoid } = require("nanoid");

const {
  authMiddleware,
  JWT_SECRET,
  REFRESH_SECRET,
  ACCESS_EXPIRES_IN,
  REFRESH_EXPIRES_IN,
} = require("../middleware/authJwt");

const router = express.Router();

/**
 * =========================
 * Практики 7–10: что делает этот файл
 * =========================
 *
 * Практики 7–8 (база):
 * - /register: создаём пользователя, пароль хешируем через bcrypt (пароль НЕ храним в открытом виде)
 * - /login: проверяем пароль (bcrypt.compare) и выдаём accessToken (JWT)
 * - /me: защищённый маршрут, возвращает текущего пользователя (по accessToken)
 *
 * Практика 9 (НОВОЕ):
 * - вводим refreshToken (долгоживущий токен)
 * - добавляем /refresh: по refreshToken выдаём НОВУЮ пару токенов
 * - реализуем "ротацию refresh-токенов": старый refresh становится недействительным, выдаём новый
 *
 * Практика 10 (НОВОЕ, но на фронте):
 * - клиент хранит accessToken + refreshToken (в учебной раелизации в localStorage)
 * - клиент автоматически подставляет accessToken в Authorization
 * - если сервер вернул 401 (access протух/невалиден) → клиент вызывает /refresh
 *   и повторяет исходный запрос уже с новым accessToken
 *
 * Кратко и по сути:
 * 1) login выдаёт токены
 * 2) me требует accessToken
 * 3) refresh выдаёт новую пару токенов
 * 4) на фронте это происходит автоматически (interceptors) — но этот файл обеспечивает бэкенд-логику
 */

const { users } = require("../store/usersStore");


const refreshTokens = new Set();

function generateAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, // <-- роль в accessToken
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}


function generateRefreshToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
} 


/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Регистрация и вход (практики 7–10)
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация пользователя
 *     description: |
 *       Создаёт нового пользователя с хешированием пароля через bcrypt.
 *       Первый зарегистрированный пользователь получает роль "admin", 
 *       последующие — "user".
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - first_name
 *               - last_name
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email пользователя (будет приведён к нижнему регистру)
 *                 example: "ivan@mail.ru"
 *               first_name:
 *                 type: string
 *                 description: Имя пользователя (только буквы, дефисы, пробелы, 2-50 символов)
 *                 example: "Иван"
 *                 minLength: 2
 *                 maxLength: 50
 *               last_name:
 *                 type: string
 *                 description: Фамилия пользователя (только буквы, дефисы, пробелы, 2-50 символов)
 *                 example: "Иванов"
 *                 minLength: 2
 *                 maxLength: 50
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Пароль (минимум 6 символов)
 *                 example: "qwerty123"
 *                 minLength: 6
 *     responses:
 *       201:
 *         description: Пользователь успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: Уникальный идентификатор пользователя
 *                   example: "abc12345"
 *                 email:
 *                   type: string
 *                   description: Email пользователя
 *                   example: "ivan@mail.ru"
 *                 first_name:
 *                   type: string
 *                   description: Имя пользователя
 *                   example: "Иван"
 *                 last_name:
 *                   type: string
 *                   description: Фамилия пользователя
 *                   example: "Иванов"
 *       400:
 *         description: Ошибка валидации данных
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   enum: [validation_error, user_exists]
 *                   description: Код ошибки
 *                 message:
 *                   type: string
 *                   description: Описание ошибки
 *             examples:
 *               missingFields:
 *                 summary: Отсутствуют обязательные поля
 *                 value:
 *                   error: "validation_error"
 *                   message: "Нужны поля: email, first_name, last_name, password"
 *               invalidEmail:
 *                 summary: Некорректный формат email
 *                 value:
 *                   error: "validation_error"
 *                   message: "Некорректный формат email"
 *               weakPassword:
 *                 summary: Слишком короткий пароль
 *                 value:
 *                   error: "validation_error"
 *                   message: "Пароль должен содержать минимум 6 символов"
 *               invalidName:
 *                 summary: Некорректное имя/фамилия
 *                 value:
 *                   error: "validation_error"
 *                   message: "Имя должно содержать только буквы, дефисы или пробелы (от 2 до 50 символов)"
 *               emailExists:
 *                 summary: Email уже зарегистрирован
 *                 value:
 *                   error: "user_exists"
 *                   message: "Пользователь с таким email уже зарегистрирован"
 */
router.post("/register", async (req, res) => {
  const { email, first_name, last_name, password } = req.body;

  if (!email || !first_name || !last_name || !password) {
    return res.status(400).json({
      error: "validation_error",
      message: "Нужны поля: email, first_name, last_name, password",
    });
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(String(email).trim())) {
    return res.status(400).json({
      error: "validation_error",
      message: "Некорректный формат email"
    });
  }

  const passwordStr = String(password);
  if (passwordStr.length < 6) {
    return res.status(400).json({
      error: "validation_error",
      message: "Пароль должен быть минимум 6 символов"
    });
  }

  if (passwordStr.trim().length === 0) {
    return res.status(400).json({
      error: "validation_error",
      message: "Пароль не может состоять только из пробелов",
    });
  }

  const nameRegex = /^[A-Za-zА-Яа-яЁё\s\-]{2,50}$/;
  const firstNameStr = String(first_name).trim();
  const lastNameStr = String(last_name).trim();

  if (!nameRegex.test(firstNameStr)) {
    return res.status(400).json({
      error: "validation_error",
      message: "Имя должно содержать только буквы, дефисы или пробелы (от 2 до 50 символов)"
    });
  }

  if (!nameRegex.test(lastNameStr)) {
    return res.status(400).json({
      error: "validation_error",
      message: "Фамилия должна содержать только буквы, дефисы или пробелы (от 2 до 50 символов)",
    });
  }

  const normalizedEmail = String(email).toLowerCase();
  const exists = users.find((u) => u.email === normalizedEmail);
  if (exists) {
    return res.status(400).json({
      error: "user_exists",
      message: "Пользователь с таким email уже зарегистрирован",
    });
  }

  const passwordHash = await bcrypt.hash(String(password), 10);

  const user = {
    id: nanoid(8),
    email: normalizedEmail,
    first_name: String(first_name),
    last_name: String(last_name),
    passwordHash,
    role: users.length === 0 ? "admin" : "user", // роль (Практика 11): первый пользователь становится admin
  };

  users.push(user);

  return res.status(201).json({
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
  });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход в систему
 *     description: Проверяет пароль и возвращает пару токенов (access + refresh).
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: "ivan@mail.ru" }
 *               password: { type: string, example: "qwerty123" }
 *     responses:
 *       200:
 *         description: Успешный вход (токены выданы)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 refreshToken: { type: string }
 *       400:
 *         description: Некорректные данные (не хватает email/password)
 *       401:
 *         description: Неверные учётные данные
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // 1) Базовая проверка входных данных
  if (!email || !password) {
    return res.status(400).json({
      error: "validation_error",
      message: "Нужны поля: email, password",
    });
  }

  // 2) Находим пользователя по email
  const normalizedEmail = String(email).toLowerCase();
  const user = users.find((u) => u.email === normalizedEmail);
  if (!user) {
    // Важно: одинаковая ошибка и для “нет пользователя”, и для “неверный пароль”
    // чтобы не давать атакующему понять, существует ли email.
    return res.status(401).json({
      error: "invalid_credentials",
      message: "Неверный email или пароль",
    });
  }

  // 3) bcrypt.compare сравнивает “введённый пароль” с “хешем из хранилища”
  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) {
    return res.status(401).json({
      error: "invalid_credentials",
      message: "Неверный email или пароль",
    });
  }

  // 4) Генерируем токены согласно настройкам (секреты и TTL в middleware/authJwt.js)
  const accessToken = generateAccessToken(user);     // короткоживущий
  const refreshToken = generateRefreshToken(user);   // долгоживущий

  // 5) Сохраняем refreshToken в "whitelist" (учебное хранилище в памяти)
  refreshTokens.add(refreshToken);

  // 6) Возвращаем пару токенов клиенту (Практика 9)
  return res.json({ accessToken, refreshToken });
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Обновление пары токенов (access + refresh)
 *     description: Принимает refresh-токен и возвращает новую пару токенов.
 *     tags: [Auth]
 *     parameters:
 *       - in: header
 *         name: x-refresh-token
 *         required: false
 *         schema: { type: string }
 *         description: Refresh-токен (учебный вариант). Можно также передать в body как refreshToken.
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Новая пара токенов
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 refreshToken: { type: string }
 *       400:
 *         description: Не передан refresh-токен
 *       401:
 *         description: Refresh-токен невалиден/протух/не найден
 */
router.post("/refresh", (req, res) => {
  const headerToken = req.headers["x-refresh-token"];
  const refreshToken = headerToken || req.body?.refreshToken;

  if (!refreshToken) {
    return res.status(400).json({
      error: "refresh_token_required",
      message: "Нужен refreshToken",
    });
  }

  if (!refreshTokens.has(refreshToken)) {
    return res.status(401).json({
      error: "invalid_refresh_token",
      message: "Refresh-токен недействителен",
    });
  }

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);

    const user = users.find((u) => u.id === payload.sub);
    if (!user) {
      return res.status(401).json({
        error: "user_not_found",
        message: "Пользователь не найден",
      });
    }

    // 🔥 сначала создаём новые токены
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // 🔥 потом атомарно обновляем Set
    refreshTokens.delete(refreshToken);
    refreshTokens.add(newRefreshToken);

    return res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });

  } catch (err) {
    refreshTokens.delete(refreshToken);

    return res.status(401).json({
      error: "refresh_token_invalid_or_expired",
      message: "Refresh-токен недействителен или истёк",
    });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Возвращает текущего пользователя (по JWT)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Пользователь
 *       401:
 *         description: Нет токена или токен невалиден
 */
router.get("/me", authMiddleware, (req, res) => {
  // authMiddleware уже проверил JWT и положил payload в req.user
  // req.user = { sub, email, iat, exp }
  const userId = req.user.sub;

  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({
      error: "user_not_found",
      message: "Пользователь не найден",
    });
  }

  // Возвращаем “профиль”
  return res.json({
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
  });
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Выход из системы
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-refresh-token
 *         required: true
 *         schema:
 *           type: string
 *         description: Refresh-токен для отзыва
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Успешный выход
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully"
 *       400:
 *         description: Не передан refresh-токен
 *       401:
 *         description: Не авторизован (access-токен недействителен)
 */

router.post("/logout", authMiddleware, (req, res) => {
  // Поддерживаем два способа передачи refresh-токена (как в /refresh)
  const headerToken = req.headers["x-refresh-token"];
  const refreshToken = headerToken || req.body?.refreshToken;

  if (!refreshToken) {
    return res.status(400).json({
      error: "refresh_token_required",
      message: "Для выхода нужен refreshToken (в заголовке x-refresh-token или в теле запроса)",
    });
  }

  if (refreshTokens.has(refreshToken)) {
    refreshTokens.delete(refreshToken);
  }

  // Всегда возвращаем успех, даже если токена не было в хранилище
  // (иначе злоумышленник мог бы проверять валидность токенов)
  res.json({ 
    message: "Logged out successfully",
  });
});

module.exports = router;