const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Подключаем бота
require('./bot');

// Пинг-сервер
app.get('/', (req, res) => {
  res.send('Бот работает 👍');
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});