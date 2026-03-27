import { useEffect, useState } from "react";
import { getAccessToken, clearTokens } from "./api/apiClient";
import { getMe, loginUser, registerUser, logoutUser } from "./api/authApi";
import { getProducts, createProduct, updateProduct, patchProduct, deleteProduct } from "./api/productsApi";
import { getUsers, setUserRole } from "./api/adminApi";
import "./App.css";

export default function App() {
  // Auth state
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  // Products state
  const [products, setProducts] = useState([]);

  // Product form state (все поля)
  const [newTitle, setNewTitle] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newStock, setNewStock] = useState("");
  const [newRating, setNewRating] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");

  // Admin state
  const [users, setUsers] = useState([]);

  // UI state
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingProduct, setEditingProduct] = useState(null); // для редактирования

  const isAdmin = user?.role === "admin";

  // Загрузка пользователя при старте
  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      getMe()
        .then(setUser)
        .catch(() => {
          clearTokens();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Загрузка товаров
  useEffect(() => {
    if (user) {
      loadProducts();
    }
  }, [user]);

  // Загрузка пользователей для админа
  useEffect(() => {
    if (isAdmin) {
      getUsers().then(setUsers).catch(console.error);
    }
  }, [isAdmin]);

  const clearMessages = () => {
    setTimeout(() => {
      setError("");
      setMessage("");
    }, 3000);
  };

  async function loadProducts() {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (err) {
      setError("Ошибка загрузки товаров");
    }
  }

  async function handleAuth(e) {
    e.preventDefault();
    setError("");
    setMessage("");  // ← ОЧИЩАЕМ СТАРЫЕ СООБЩЕНИЯ
    setLoading(true);

    try {
      if (isLogin) {
        await loginUser({ email, password });
        const userData = await getMe();
        setUser(userData);
        setMessage(`Добро пожаловать, ${userData.first_name}!`);
        clearMessages();
        setEmail("");
        setPassword("");
      } else {
        await registerUser({ email, first_name: firstName, last_name: lastName, password });
        setIsLogin(true);
        setMessage("Регистрация успешна! Теперь войдите.");
        clearMessages();
        setEmail("");
        setPassword("");
        setFirstName("");
        setLastName("");
        return;
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Ошибка");
      clearMessages();
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logoutUser();
    setUser(null);
    setProducts([]);
    setUsers([]);
    setMessage("Вы вышли из системы");
  }

  async function handleCreateProduct(e) {
    e.preventDefault();

    // Проверяем только обязательные поля
    if (!newTitle || !newPrice) {
      setError("Название и цена обязательны для заполнения");
      return;
    }

    const productData = {
      title: newTitle.trim(),
      price: Number(newPrice),
    };

    // Добавляем необязательные поля, если они заполнены
    if (newCategory.trim()) productData.category = newCategory.trim();
    if (newDescription.trim()) productData.description = newDescription.trim();
    if (newStock) productData.stock = Number(newStock);
    if (newRating) productData.rating = Number(newRating);
    if (newImageUrl.trim()) productData.imageUrl = newImageUrl.trim();

    try {
      await createProduct(productData);
      // Очищаем форму
      setNewTitle("");
      setNewPrice("");
      setNewCategory("");
      setNewDescription("");
      setNewStock("");
      setNewRating("");
      setNewImageUrl("");
      await loadProducts();
      setMessage("Товар создан");
    } catch (err) {
      setError(err?.response?.data?.message || "Ошибка создания товара");
      clearMessages();
    }
  }

  async function handleUpdateProduct(id, updatedData) {
    try {
      await updateProduct(id, updatedData);
      await loadProducts();
      setEditingProduct(null);
      setMessage("Товар обновлён");
    } catch (err) {
      setError(err?.response?.data?.message || "Ошибка обновления");
      clearMessages();
    }
  }

  async function handleUpdatePrice(id, currentPrice) {
    try {
      await patchProduct(id, { price: currentPrice + 10 });
      await loadProducts();
      setMessage("Цена обновлена");
    } catch (err) {
      setError(err?.response?.data?.message || "Ошибка");
      clearMessages();
    }
  }

  async function handleDeleteProduct(id) {
    if (!confirm("Удалить товар?")) return;

    try {
      await deleteProduct(id);
      await loadProducts();
      setMessage("Товар удален");
    } catch (err) {
      setError(err?.response?.data?.message || "Ошибка");
      clearMessages();
    }
  }

  async function handleChangeRole(userId, currentRole) {
    const newRole = currentRole === "admin" ? "user" : "admin";
    if (!confirm(`Сменить роль на "${newRole}"?`)) return;

    try {
      await setUserRole(userId, newRole);
      const updatedUsers = await getUsers();
      setUsers(updatedUsers);
      setMessage("Роль изменена");
    } catch (err) {
      setError(err?.response?.data?.message || "Ошибка");
      clearMessages();
    }
  }

  // Функция для форматирования рейтинга
  function formatRating(rating) {
    if (!rating && rating !== 0) return "—";
    return `${rating}`;
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-card fade-in">
          <h1 className="auth-title">Добро пожаловать</h1>

          <div className="auth-tabs">
            <button
              className={`tab ${isLogin ? "active" : ""}`}
              onClick={() => {
                setIsLogin(true);
                setError("");
                setMessage("");
              }}
            >
              Вход
            </button>
            <button
              className={`tab ${!isLogin ? "active" : ""}`}
              onClick={() => {
                setIsLogin(false);
                setError("");
                setMessage("");
              }}
            >
              Регистрация
            </button>
          </div>

          <form onSubmit={handleAuth} className="auth-form">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {!isLogin && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label>Имя</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Фамилия</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div className="form-group">
              <label>Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && <div className="error">{error}</div>}
            {message && <div className="success">{message}</div>}

            <button type="submit" className="btn btn-primary">
              {isLogin ? "Войти" : "Зарегистрироваться"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>Управление товарами</h1>
          <div className="user-info">
            <div>
              <div className="user-name">{user.first_name} {user.last_name}</div>
              <div className="user-email">{user.email}</div>
              <div className={`user-role role-${user.role}`}>
                {user.role === "admin" ? "Администратор" : "Пользователь"}
              </div>
            </div>
            <button onClick={handleLogout} className="btn btn-secondary">Выйти</button>
          </div>
        </div>
      </header>

      <main className="main">
        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        {/* Форма создания товара (только для админа) */}
        {isAdmin && (
          <section className="section">
            <div className="section-header">
              <h2>Создать новый товар</h2>
            </div>

            <form onSubmit={handleCreateProduct} className="product-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Название *</label>
                  <input
                    type="text"
                    placeholder="Введите название товара"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Цена *</label>
                  <input
                    type="number"
                    placeholder="Цена в рублях"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Категория</label>
                <input
                  type="text"
                  placeholder="Например: Электроника, Одежда, Книги"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Описание</label>
                <textarea
                  placeholder="Подробное описание товара"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Количество на складе</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Рейтинг (0-5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    placeholder="4.5"
                    value={newRating}
                    onChange={(e) => setNewRating(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>URL изображения</label>
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary">Создать товар</button>
            </form>
          </section>
        )}

        {/* Список товаров */}
        <section className="section">
          <div className="section-header">
            <h2>Товары ({products.length})</h2>
            <button onClick={loadProducts} className="btn btn-secondary">Обновить</button>
          </div>

          <div className="products-grid">
            {products.map(product => (
              <div key={product.id} className="product-card">
                {product.imageUrl && (
                  <div className="product-image">
                    <img src={product.imageUrl} alt={product.title} />
                  </div>
                )}

                <div className="product-details">
                  <h3 className="product-title">{product.title}</h3>

                  {product.category && (
                    <span className="product-category">{product.category}</span>
                  )}

                  <div className="product-price">{product.price} ₽</div>

                  {product.description && (
                    <p className="product-description">{product.description}</p>
                  )}

                  <div className="product-meta">
                    {product.stock !== undefined && (
                      <span className={`product-stock ${product.stock === 0 ? 'out-of-stock' : ''}`}>
                        {product.stock === 0 ? 'Нет в наличии' : `${product.stock} шт.`}
                      </span>
                    )}

                    {product.rating !== undefined && (
                      <span className="product-rating">
                        Рейтинг: {formatRating(product.rating)}
                      </span>
                    )}
                  </div>
                </div>

                {isAdmin && (
                  <div className="product-actions">
                    <button
                      onClick={() => handleUpdatePrice(product.id, product.price)}
                      className="btn btn-sm btn-secondary"
                      title="Увеличить цену на 10 ₽"
                    >
                      +10 ₽
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="btn btn-sm btn-danger"
                    >
                      Удалить
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {products.length === 0 && (
            <div className="empty">Нет товаров. {isAdmin && "Создайте первый товар!"}</div>
          )}
        </section>

        {/* Админ панель */}
        {isAdmin && users.length > 0 && (
          <section className="section">
            <div className="section-header">
              <h2>Управление пользователями</h2>
              <button onClick={() => getUsers().then(setUsers)} className="btn btn-secondary">
                Обновить
              </button>
            </div>

            <div className="users">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Имя</th>
                    <th>Роль</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>{u.email}</td>
                      <td>{u.first_name} {u.last_name}</td>
                      <td>
                        <span className={`role-badge role-${u.role}`}>
                          {u.role === "admin" ? "Администратор" : "Пользователь"}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleChangeRole(u.id, u.role)}
                          className="btn btn-sm btn-secondary"
                        >
                          Сменить роль
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}