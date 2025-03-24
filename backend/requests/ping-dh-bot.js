const fetch = require('node-fetch');

const pingBot = () => {
    const BOT_URL = 'https://design-heaven-bot.onrender.com/ping';

    setInterval(async () => {
        try {
            const response = await fetch(BOT_URL, {
                method: 'GET',
            });
            if (!response.ok) {
                console.error(`Bot ping failed with status: ${response.status}`);
            } else {
                console.log('Successfully pinged the bot!');
            }
        } catch (error) {
            console.error(`Error pinging the bot: ${error.message}`);
        }
    }, 5 * 60 * 1000);
};

module.exports = { pingBot };
