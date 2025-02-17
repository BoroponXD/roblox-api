const express = require("express");
const axios = require("axios");
const puppeteer = require("puppeteer");

const app = express();
const PORT = 3000;

app.use(express.json());

async function getUserPlaces(userId) {
    try {
        const url = `https://games.roblox.com/v2/users/${userId}/games?accessFilter=Public`;
        const { data } = await axios.get(url);
        
        // Достаем rootPlace.id вместо id
        return data.data.map(game => game.rootPlace.id);
    } catch (error) {
        console.error("Ошибка при получении плейсов:", error);
        return [];
    }
}

async function getGamePasses(gameId) {
    const url = `https://www.roblox.com/games/${gameId}#!/store`;
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "networkidle2" });

    // Ждем загрузки карточек
    await page.waitForSelector(".store-card", { timeout: 5000 }).catch(() => {});

    const gamePasses = await page.evaluate(() => {
        return Array.from(document.querySelectorAll(".store-card")).map(card => {
            const link = card.querySelector("a")?.getAttribute("href");
            const idMatch = link?.match(/\/game-pass\/(\d+)\//);
            const id = idMatch ? idMatch[1] : null;

            return {
                id,
                name: card.querySelector(".store-card-name")?.getAttribute("title") || "Неизвестно",
                price: card.querySelector(".text-robux")?.innerText.trim() || "0",
                image: card.querySelector("img")?.getAttribute("src") || "Нет изображения"
            };
        });
    });

    await browser.close();
    return gamePasses;
}

app.get("/get-gamepasses/:userId", async (req, res) => {
    const userId = req.params.userId;
    
    if (!userId) {
        return res.status(400).json({ error: "User ID не указан" });
    }

    console.log(`Получаем геймпассы для пользователя ${userId}`);

    // 1. Получаем публичные плейсы
    const places = await getUserPlaces(userId);
    if (places.length === 0) {
        return res.json({ error: "У пользователя нет публичных плейсов" });
    }

    // 2. Парсим геймпассы каждого плейса
    let allGamePasses = [];
    for (const placeId of places) {
        console.log(`Парсим геймпассы для плейса ${placeId}...`);
        const gamePasses = await getGamePasses(placeId);
        allGamePasses.push(...gamePasses);
    }

    res.json({ userId, gamePasses: allGamePasses });
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});
