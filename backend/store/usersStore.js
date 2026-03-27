/**
 * usersStore.js — учебное хранилище пользователей в памяти процесса Node.js.
 *
 * Практики 7–8:
 * - хранение пользователей без БД (users[])
 *
 * Практика 11:
 * - добавляем role (admin/user)
 *
 * Ограничение:
 * - после перезапуска сервера массив очищается.
 * - в реальном проекте: БД (Postgres/Mongo) или хотя бы файл.
 */
const users = [];

function publicUser(u) {
  // Никогда не отдаём passwordHash наружу
  // eslint-disable-next-line no-unused-vars
  const { passwordHash, ...rest } = u;
  return rest;
}

module.exports = { users, publicUser };
