const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const DISCORD_API_URL = 'https://discord.com/api/v10';


async function fetchFromDiscord(endpoint, token) {
    const response = await fetch(`${DISCORD_API_URL}${endpoint}`, {
        headers: {
            Authorization: `Bot ${process.env.BOT_TOKEN}`
        }
    });

    if (!response.ok) {
        throw new Error(`Discord API returned status ${response.status}`);
    }

    return response.json();
}


async function getGuildRoles(guildId) {
    return fetchFromDiscord(`/guilds/${guildId}/roles`, process.env.BOT_TOKEN);
}


async function getGuildChannels(guildId) {
    return fetchFromDiscord(`/guilds/${guildId}/channels`, process.env.BOT_TOKEN);
}

module.exports = {
    getGuildRoles,
    getGuildChannels,
};
