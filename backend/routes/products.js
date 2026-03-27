const express = require("express");
const { nanoid } = require("nanoid");
const { authMiddleware, requireRole } = require("../middleware/authJwt");

const productsStore = require("../store/productsStore");

const router = express.Router();


/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - title
 *         - price
 *       properties:
 *         id:
 *           type: string
 *           description: Уникальный ID товара
 *         title:
 *           type: string
 *           description: Название товара
 *         category:
 *           type: string
 *           description: Категория товара
 *         description:
 *           type: string
 *           description: Описание товара
 *         price:
 *           type: number
 *           description: Цена товара
 *         stock:
 *           type: integer
 *           description: Количество на складе
 *         rating:
 *           type: number
 *           description: Рейтинг (опционально)
 *         imageUrl:
 *           type: string
 *           description: URL картинки (опционально)
 *       example:
 *         id: "p1"
 *         title: "Печенье"
 *         category: "Сладости"
 *         description: "Хрустящее печенье к чаю."
 *         price: 79
 *         stock: 20
 *         rating: 4.6
 *         imageUrl: ""
 */

/**
 * @swagger
 * /api/products:
 *  get:
 *    summary: получить список всех товаров
 *    tags: [Products]
 *    responses:
 *      200:
 *        description: Список товаров
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                  $ref: '#/components/schemas/Product'
 */

// GET /api/products — список товаров (публичный)
router.get("/", async (req, res, next) => {
  try {
    const list = await productsStore.readAll();
    res.json(list);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получить товар по ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *     responses:
 *       200:
 *         description: Товар найден
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       401:
 *         description: Не авторизован
 *       404:
 *         description: Товар не найден
 */

// GET /api/products/:id — один товар (защищённый)
router.get("/:id", authMiddleware, async (req, res, next) => {
  try {
    const list = await productsStore.readAll();
    const product = list.find((p) => p.id === req.params.id) || null;

    if (!product) return res.status(404).json({ error: "product_not_found", message: "Товар не найден" });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать новый товар
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - price
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Новый товар"
 *               category:
 *                 type: string
 *                 example: "Категория"
 *               description:
 *                 type: string
 *                 example: "Описание товара"
 *               price:
 *                 type: number
 *                 example: 100
 *               stock:
 *                 type: integer
 *                 example: 10
 *               rating:
 *                 type: number
 *                 example: 4.5
 *               imageUrl:
 *                 type: string
 *                 example: "https://example.com/image.jpg"
 *     responses:
 *       201:
 *         description: Товар создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Ошибка валидации
 */

// POST /api/products — добавить товар
router.post("/", authMiddleware, requireRole("admin"), async (req, res, next) => {
  try {
    const { title, category, description, price, stock, rating, imageUrl } = req.body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return res.status(400).json({
        error: "validation_error",
        message: "Поле title обязательно и должно быть не пустой строкой"
      });
    }

    if (title.length < 2 || title.length > 100) {
      return res.status(400).json({
        error: "validation_error",
        message: "Название должно быть от 2 до 100 символов"
      });
    }

    const parsedPrice = Number(price);
    if (price === undefined || isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        error: "validation_error",
        message: "Поле price должно быть положительным числом"
      });
    }

    let parsedStock = 0;
    if (stock !== undefined) {
      parsedStock = Number(stock);
      if (isNaN(parsedStock) || parsedStock < 0 || !Number.isInteger(parsedStock)) {
        return res.status(400).json({ 
          error: "validation_error", 
          message: "Поле stock должно быть целым неотрицательным числом" 
        });
      }
    }

    let parsedRating = undefined;
    if (rating !== undefined) {
      parsedRating = Number(rating);
      if (isNaN(parsedRating) || parsedRating < 0 || parsedRating > 5) {
        return res.status(400).json({ 
          error: "validation_error", 
          message: "Поле rating должно быть числом от 0 до 5" 
        });
      }
    }

    const newProduct = {
      id: nanoid(8),
      title: title.trim(),
      category: typeof category === "string" ? category.trim() : "Без категории",
      description: typeof description === "string" ? description.trim() : "",
      price: parsedPrice,
      stock: parsedStock,
      rating: parsedRating,
      imageUrl: typeof imageUrl === "string" ? imageUrl.trim() : "",
    };

    await productsStore.add(newProduct);
    res.status(201).json(newProduct);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Полное обновление товара
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - price
 *             properties:
 *               title:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               rating:
 *                 type: number
 *               imageUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Товар обновлён
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Ошибка валидации (отсутствуют обязательные поля или неверные типы)
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Доступ запрещён (требуется роль admin)
 *       404:
 *         description: Товар не найден
 */

// PUT /api/products/:id — полное обновление (защищённый маршрут в Практике 8)
router.put("/:id", authMiddleware, requireRole("admin"), async (req, res, next) => {
  try {
    const { title, category, description, price, stock, rating, imageUrl } = req.body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return res.status(400).json({
        error: "validation_error",
        message: "Поле title обязательно и должно быть непустой строкой"
      });
    }

    if (title.length < 2 || title.length > 100) {
      return res.status(400).json({
        error: "validation_error",
        message: "Поле title должно быть от 2 до 100 символов"
      });
    }

    let parsedPrice = Number(price);
    if (price === undefined || isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        error: "validation_error",
        message: "Поле price обязательно и должно быть неотрицательным"
      });
    }

    let parsedStock = 0;
    if (stock !== undefined) {
      parsedStock = Number(stock);
      if (isNaN(parsedStock) || parsedStock < 0 || !Number.isInteger(parsedStock)) {
        return res.status(400).json({
          error: "validation_error",
          message: "Поле stock должно быть целым неотрицательным числом"
        });
      }
    }

    let parsedRating = undefined;
    if (rating !== undefined) {
      parsedRating = Number(rating);
      if (isNaN(parsedRating) || parsedRating < 0 || parsedRating > 5) {
        return res.status(400).json({
          error: "validation_error",
          message: "Рейтинг должен быть числом от 0 до 5"
        });
      }
    }

    const list = await productsStore.readAll();
    const existingProduct = list.find(p => p.id === req.params.id);

    if (!existingProduct) {
      return res.status(404).json({
        error: "product_not_found",
        message: "Товар не найден"
      });
    }

    const updatedProduct = {
      id: existingProduct.id,
      title: title.trim(),
      category: typeof category === "string" && category.trim() ? category.trim() : "Без категории",
      description: typeof description === "string" ? description.trim() : "",
      price: parsedPrice,
      stock: parsedStock,
      rating: parsedRating,
      imageUrl: typeof imageUrl === "string" ? imageUrl.trim() : ""
    };

    const result = await productsStore.patch(req.params.id, updatedProduct);
    res.json(result);

  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     summary: Частичное обновление товара
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               rating:
 *                 type: number
 *               imageUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Товар обновлён
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Доступ запрещён (требуется роль admin)
 *       404:
 *         description: Товар не найден
 */

// PATCH /api/products/:id — частичное обновление защищено в результате выполнения практики 8
router.patch("/:id", authMiddleware, requireRole("admin"), async (req, res, next) => {
  try {
    const updated = await productsStore.patch(req.params.id, req.body);

    if (!updated) return res.status(404).json({ error: "product_not_found", message: "Товар не найден" });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *     responses:
 *       200:
 *         description: Товар удалён
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Не авторизован
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "auth_header_missing"
 *                 message:
 *                   type: string
 *                   example: "Нужен заголовок Authorization: Bearer <token>"
 *       403:
 *         description: Доступ запрещён (требуется роль admin)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "forbidden"
 *                 message:
 *                   type: string
 *                   example: "Доступ запрещён. Нужна роль: admin"
 *       404:
 *         description: Товар не найден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "product_not_found"
 *                 message:
 *                   type: string
 *                   example: "Товар не найден"
 */

// DELETE /api/products/:id — удалить товар (защищённый)
router.delete("/:id", authMiddleware, requireRole("admin"), async (req, res, next) => {
  try {
    const ok = await productsStore.remove(req.params.id);

    if (!ok) return res.status(404).json({ error: "product_not_found", message: "Товар не найден" });

    // Обычно делают 204 No Content, но для наглядности вернём JSON
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
