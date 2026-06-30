require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const mongoose = require('mongoose');
const express = require('express');
const { logger } = require('./utils/logger');
const { CommandHandler } = require('./handlers/commandHandler');
const { EventHandler } = require('./handlers/eventHandler');
const { SystemHandler } = require('./handlers/systemHandler');

class CowoncyBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildPresences,
                GatewayIntentBits.DirectMessages
            ]
        });

        this.client.commands = new Collection();
        this.client.cooldowns = new Collection();
        this.client.systems = new Map();
        this.client.activeGames = new Map();
        this.client.battles = new Map();
        this.client.maintenance = false;

        this.commandHandler = new CommandHandler(this.client);
        this.eventHandler = new EventHandler(this.client);
        this.systemHandler = new SystemHandler(this.client);

        // Setup health check
        this.app = express();
        this.setupHealthCheck();
    }

    setupHealthCheck() {
        this.app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'OK',
                uptime: process.uptime(),
                timestamp: Date.now(),
                commands: this.client.commands.size,
                guilds: this.client.guilds.cache.size,
                users: this.client.users.cache.size
            });
        });

        const port = process.env.PORT || 3000;
        this.app.listen(port, () => {
            logger.info(`Health check server running on port ${port}`);
        });
    }

    async initialize() {
        try {
            await mongoose.connect(process.env.MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            logger.info('✅ Connected to MongoDB');

            await this.systemHandler.initializeAll();
            await this.commandHandler.loadCommands();
            await this.eventHandler.loadEvents();

            await this.client.login(process.env.DISCORD_TOKEN);

            logger.info(`✅ Bot ${this.client.user.tag} is online!`);
            logger.info(`📊 Loaded ${this.client.commands.size} commands`);
            logger.info(`🌐 Serving ${this.client.guilds.cache.size} guilds`);

            this.setBotStatus();

        } catch (error) {
            logger.error('❌ Failed to initialize bot:', error);
            process.exit(1);
        }
    }

    setBotStatus() {
        const statuses = [
            { name: `${this.client.guilds.cache.size} servers | /help`, type: 3 },
            { name: `${this.client.users.cache.size} users`, type: 3 },
            { name: '🎮 Cowoncy RPG', type: 0 },
            { name: '⚔️ Battle & Adventure', type: 3 },
            { name: '🎲 Gambling Paradise', type: 3 }
        ];

        let index = 0;
        setInterval(() => {
            const status = statuses[index % statuses.length];
            this.client.user.setPresence({
                activities: [status],
                status: 'online'
            });
            index++;
        }, 60000);
    }
}

const bot = new CowoncyBot();
bot.initialize();

process.on('unhandledRejection', (error) => {
    logger.error('Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

module.exports = bot;
