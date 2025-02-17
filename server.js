const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/gamepasses', async (req, res) => {
    try {
        const { gameId } = req.query;
        if (!gameId) {
            return res.status(400).json({ error: 'Missing gameId parameter' });
        }

       const browser = await puppeteer.launch({
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium",
          args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });

        const page = await browser.newPage();
        const url = `https://www.roblox.com/games/${gameId}/#!/store`;
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        const gamepasses = await page.evaluate(() => {
            const items = [];
            document.querySelectorAll('.store-card').forEach(card => {
                const id = card.querySelector('a')?.href.match(/game-pass\/(\d+)/)?.[1];
                const name = card.querySelector('.text-overflow.store-card-name')?.getAttribute('title');
                const price = card.querySelector('.store-card-price .text-robux')?.textContent.trim();
                const img = card.querySelector('img')?.src;

                if (id && name && price && img) {
                    items.push({ id, name, price, img });
                }
            });
            return items;
        });

        await browser.close();
        res.json({ success: true, gamepasses });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
