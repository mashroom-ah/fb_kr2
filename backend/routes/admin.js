const express = require("express");
const { authMiddleware, requireRole } = require("../middleware/authJwt");

const { users, publicUser } = require("../store/usersStore");

const router = express.Router();

/**
 * =========================
 * Практика 11: Ролевая модель (RBAC)
 * =========================
 *
 * Роли:
 * - admin: может управлять ролями пользователей + имеет полный доступ к товарам
 * - user : может только просматривать товары
 *
 * Здесь — минимальный административный API:
 * - GET  /api/admin/users            → список пользователей (admin)
 * - PATCH /api/admin/users/:id/role  → сменить роль (admin)
 *
 * Учебное ограничение:
 * - users[] в памяти процесса Node.js (после перезапуска всё очищается)
 * - роли в accessToken “закешированы” в токене → после смены роли лучше перелогиниться/refresh
 */

/**
 * @swagger
 * tags:
 *   - name: "Admin"
 *     description: "Админские операции (Практика 11: RBAC)"
 */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Список пользователей (только admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Массив пользователей
 *       403:
 *         description: Доступ запрещён (не admin)
 */
router.get("/users", authMiddleware, requireRole("admin"), (req, res) => {
  res.json(users.map(publicUser));
});

/**
 * @swagger
 * /api/admin/users/{id}/role:
 *   patch:
 *     summary: Изменить роль пользователя (только admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         'application/json':
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 example: admin
 *     responses:
 *       200:
 *         description: Роль обновлена
 *       400:
 *         description: Некорректная роль
 *       404:
 *         description: Пользователь не найден
 */
router.patch("/users/:id/role", authMiddleware, requireRole("admin"), (req, res) => {
  
  const { role } = req.body || {};

  if (role !== "admin" && role !== "user") {
    return res.status(400).json({
      error: "validation_error",
      message: "role должен быть 'admin' или 'user'",
    });
  }

  const u = users.find((x) => x.id === req.params.id);
  if (!u) {
    return res.status(404).json({ error: "user_not_found", message: "Пользователь не найден" });
  }

  u.role = role;

  // Важно: текущие токены пользователя НЕ изменятся автоматически.
  // Он увидит новую роль после login/refresh (получит новый accessToken).
  return res.json(publicUser(u));
});

module.exports = router;
