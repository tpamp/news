const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cron = require('node-cron');

require('dotenv').config();

// Загружаем переменные из .env
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const NEWS_API_KEY = process.env.NEWS_API_KEY;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log("Бот запущен!");

// Функция для перевода текста
async function translateText(text, targetLang = 'ru') {
    try {
        const response = await axios.get('https://api.mymemory.translated.net/get', {
            params: {
                q: text,
                langpair: `en|${targetLang}`
            }
        });

        return response.data.responseData.translatedText;
    } catch (error) {
        console.error('Ошибка при переводе:', error.response?.data || error.message);
        return text; // Возвращаем оригинал, если перевод не сработал
    }
}

// Функция для получения новостей
async function getNews() {
    try {
        const response = await axios.get('https://newsapi.org/v2/top-headlines', {
            params: {
                category: 'general',
                language: 'en',
                apiKey: NEWS_API_KEY
            }
        });

        const articles = response.data.articles;
        if (!articles.length) {
            console.log('Нет свежих новостей.');
            return null;
        }

        // Берём первую новость
        const news = articles[0];

        // Переводим заголовок и описание
        const title = await translateText(news.title);
        const description = news.description ? await translateText(news.description) : '';

        return `📰 *${title}*\n\n${description}\n[Читать дальше](${news.url})`;
    } catch (error) {
        console.error('Ошибка при получении новостей:', error);
        return null;
    }
}

// Функция отправки новости в канал
async function sendNewsToChannel() {
    const news = await getNews();
    if (news) {
        await bot.sendMessage(CHANNEL_ID, news, { parse_mode: 'Markdown' });
        console.log('Новость отправлена!');
    } else {
        console.log('Не удалось отправить новость.');
    }
}

// Запускаем отправку новостей каждый час
cron.schedule('0 * * * *', () => {
    console.log('Запускаем отправку новостей...');
    sendNewsToChannel();
});

// Команда /start для ввода данных пользователем
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Привет! Введи API ключ для новостей:');
    
    bot.once('message', async (msg) => {
        const apiKey = msg.text;
        process.env.NEWS_API_KEY = apiKey;
        bot.sendMessage(chatId, 'API ключ сохранён! Теперь введи ID канала:');

        bot.once('message', async (msg) => {
            const channelId = msg.text;
            process.env.CHANNEL_ID = channelId;
            bot.sendMessage(chatId, 'ID канала сохранён! Бот готов отправлять новости.');
        });
    });
});

// Запускаем первую отправку сразу после старта
sendNewsToChannel();
