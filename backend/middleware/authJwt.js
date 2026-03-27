const jwt = require("jsonwebtoken");

/**
 * ============================================================
 * Практики 7–10: где живут "секреты" и "сроки жизни" токенов
 * ============================================================
 *
 * Практики 7–8:
 * - используем accessToken (JWT) для доступа к защищённым маршрутам
 * - этот middleware проверяет accessToken из Authorization: Bearer ...
 *
 * Практика 9 (НОВОЕ):
 * - появляется refreshToken → для него отдельный секрет и отдельный TTL
 * - refreshToken НЕ проверяется этим middleware (он проверяется в /api/auth/refresh) (cм. auth.js строка 314)
 *
 * Практика 10 (на фронте):
 * - если accessToken протух → сервер вернёт 401
 * - фронт вызывает /api/auth/refresh (по refreshToken) и получает новый accessToken
 * - дальше запрос повторяется и снова проходит через этот middleware
 */

const JWT_SECRET = process.env.JWT_SECRET || "access_secret";

const REFRESH_SECRET = process.env.REFRESH_SECRET || "refresh_secret";

const ACCESS_EXPIRES_IN = process.env.ACCESS_EXPIRES_IN || "15m";
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || "7d";

/**
 * authMiddleware — "охранник" перед защищёнными маршрутами.
 *
 * Он проверяет ТОЛЬКО accessToken из заголовка:
 *   Authorization: Bearer <accessToken>
 *
 * refreshToken сюда НЕ передают.
 * refreshToken используется только в /api/auth/refresh (Практика 9).
 */
function authMiddleware(req, res, next) {
  // Забираем заголовок Authorization (если его нет — будет пустая строка)
  const header = req.headers.authorization || "";

  // header должен быть вида: "Bearer eyJhbGciOi..."
  const [scheme, token] = header.split(" ");

  // 1) Нет "Bearer" или нет токена → сразу 401
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      error: "auth_header_missing",
      message: "Нужен заголовок Authorization: Bearer <token>",
    });
  }

  try {
    // 2) Проверяем подпись accessToken и срок действия (exp)
    // jwt.verify выбросит ошибку, если токен:
    // - подделан
    // - протух (expired)
    // - подписан другим секретом
    const payload = jwt.verify(token, JWT_SECRET);

    // payload — то, что мы подписали при логине:
    // например { sub: userId, email, iat, exp }
    req.user = payload;

    // 3) Пропускаем запрос дальше → к защищённому обработчику
    next();
  } catch (err) {
    return res.status(401).json({
      error: "token_invalid",
      message: "Токен недействителен или срок действия истёк",
    });
  }
}

/**
 * requireRole(role) — middleware для ролевой модели (Практика 11).
 *
 * Как работает:
 * - authMiddleware уже положил payload accessToken в req.user
 * - в payload мы кладём role (см. generateAccessToken в routes/auth.js)
 * - requireRole("admin") пропускает только тех, у кого req.user.role === "admin"
 *
 * Важно (учебное ограничение):
 * - если роль пользователя поменять на сервере, старый accessToken всё равно содержит старую роль
 *   → новую роль пользователь увидит после login/refresh (будет выдан новый токен).
 */
function requireRole(requiredRole) {
  return (req, res, next) => {
    const actualRole = req.user?.role;
    if (actualRole !== requiredRole) {
      return res.status(403).json({
        error: "forbidden",
        message: `Доступ запрещён. Нужна роль: ${requiredRole}`,
      });
    }
    next();
  };
}

module.exports = {
  authMiddleware,
  requireRole,
  JWT_SECRET,
  REFRESH_SECRET,
  ACCESS_EXPIRES_IN,
  REFRESH_EXPIRES_IN,
};