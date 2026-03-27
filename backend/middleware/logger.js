/**
 * Простейший middleware для логирования запросов.
 * Важно: middleware ДОЛЖЕН вызвать next(), иначе запрос "зависнет" и не дойдёт до роутов.
 */
module.exports = function logger(req, res, next) {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
};
