const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const mindustrySchematic = require('mindustry-schematic');
const Schematic = mindustrySchematic.Schematic;
const canvas = require('canvas');
const createCanvas = canvas.createCanvas;
const loadImage = canvas.loadImage;

const token = '8707325317:AAE40DE6jDEclv9MfjU_2ICi_HRCE-o65u0';
const bot = new TelegramBot(token, { polling: true });

const SPRITES_DIR = path.join(__dirname, 'sprites');

bot.onText(/^\/start|\/help/, (msg) => {
    const welcomeText = "Привет!\nОтправь мне:\n🔸 Код схемы (bXNjaA...)\n🔸 Файл схемы .msch\n🔸 Файл карты .msav";
    bot.sendMessage(msg.chat.id, welcomeText);
});

bot.onText(/^bXNjaA/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        const schematic = Schematic.decode(msg.text);
        const imageBuffer = await renderSchematic(schematic);
        const caption = `📌 **Схема:** ${schematic.name || 'Без названия'}\n👤 **Автор:** ${schematic.author || 'Неизвестен'}\n📝 **Описание:** ${schematic.description || 'Нет'}\n📐 **Размер:** ${schematic.width}x${schematic.height}`;
        await bot.sendPhoto(chatId, imageBuffer, { caption: caption, parse_mode: 'Markdown' });
    } catch (err) {
        bot.sendMessage(chatId, '❌ Ошибка при чтении схемы.');
    }
});

bot.on('document', async (msg) => {
    const chatId = msg.chat.id;
    const fileName = msg.document.file_name;

    if (fileName.endsWith('.msch')) {
        try {
            const fileLink = await bot.getFileLink(msg.document.file_id);
            const response = await fetch(fileLink);
            const buffer = await response.arrayBuffer();
            const schematic = Schematic.decode(Buffer.from(buffer));
            const imageBuffer = await renderSchematic(schematic);
            const caption = `📌 **Схема:** ${schematic.name}\n📐 **Размер:** ${schematic.width}x${schematic.height}`;
            await bot.sendPhoto(chatId, imageBuffer, { caption: caption, parse_mode: 'Markdown' });
        } catch (err) {
            bot.sendMessage(chatId, '❌ Ошибка при чтении .msch');
        }
    } else if (fileName.endsWith('.msav')) {
        bot.sendMessage(chatId, 'Карты .msav пока в разработке.');
    }
});

async function renderSchematic(schematic) {
    const tileSize = 32;
    const cvs = createCanvas(schematic.width * tileSize, schematic.height * tileSize);
    const ctx = cvs.getContext('2d');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    for (const tile of schematic.tiles) {
        const imagePath = path.join(SPRITES_DIR, `${tile.block.name}.png`);
        if (fs.existsSync(imagePath)) {
            const img = await loadImage(imagePath);
            ctx.drawImage(img, tile.x * tileSize, (schematic.height - 1 - tile.y) * tileSize, tileSize, tileSize);
        }
    }
    return cvs.toBuffer('image/png');
}