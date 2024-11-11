require('dotenv').config();
const puppeteer = require('puppeteer');
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel]
});

const token = process.env.DISCORD_TOKEN;
const channelId = process.env.CHANNEL_ID;

// Biến để lưu tiêu đề meme cuối cùng đã gửi
let lastMemeTitle = null;

// Hàm lấy danh sách meme từ trang web
async function fetchMemeList() {
    const browser = await puppeteer.launch({ headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    // Mở trang Steam và chờ nội dung tải xong
    await page.goto('https://steamcommunity.com/?subsection=screenshots', { waitUntil: 'networkidle2' });

    // Đợi và thu thập URL ảnh và tên game
    const screenshots = await page.evaluate(() => {
        const screenshotElements = document.querySelectorAll('.apphub_Card'); // Chọn tất cả các thẻ .apphub_Card
        const screenshotList = [];

        screenshotElements.forEach((element) => {
            const imageUrl = element.querySelector('.apphub_CardContentPreviewImage')?.src; // Lấy URL ảnh
            const gameName = element.querySelector('.apphub_CardContentAppName a')?.innerText.trim(); // Lấy tên game
            const gameLink = element.querySelector('.apphub_CardContentAppName a')?.href;
            const gameLike = element.querySelector('.apphub_CardRating')?.innerText.trim();
            const gameTitle = element.querySelector('.apphub_CardContentTitle')?.innerText.trim();


            

            if (imageUrl && gameName) {
                screenshotList.push({ gameName, imageUrl,gameLink,gameLike,gameTitle });
            }
        });

        return screenshotList;
    });

    await browser.close();
    return screenshots;
}

// Hàm gửi meme vào kênh nếu có meme mới
async function postMemeToChannel() {
    try {
        const memes = await fetchMemeList(); // Lấy danh sách meme
        if (memes.length > 0) { // Kiểm tra xem có meme nào không
            const meme = memes[0]; // Chỉ lấy meme đầu tiên

            const title = meme.gameName || 'Không có tiêu đề';
            const imageUrl = meme.imageUrl || null;
            const link = meme.gameLink || '#';
            const description = meme.gameTitle || '...';
            const like = meme.gameLike || '0';

            const memeEmbed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setImage(imageUrl)
                .setURL(link)
                .setColor('#0099ff')
                .setFooter({ text: `${like} 👍` });

            const channel = client.channels.cache.get(channelId);
            if (channel) {
                await channel.send({ embeds: [memeEmbed] });
            } else {
                console.error('Channel not found');
            }
        } else {
            console.log('No memes found');
        }
    } catch (error) {
        console.error('Error posting meme to channel:', error);
    }
}


// Sự kiện bot khởi động và kiểm tra meme mới mỗi 10 phút
client.once('ready', () => {
    console.log('Bot is online!');
    
    postMemeToChannel();
    setInterval(postMemeToChannel, 6*60*60*1000); 
});

client.login(token);
