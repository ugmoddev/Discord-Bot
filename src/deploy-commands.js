require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { logger } = require('./utils/logger');

async function deployCommands() {
    const commands = [];
    const commandFiles = [
        'gambling.js',
        'battle.js',
        'pet.js',
        'adventure.js',
        'economy.js',
        'progression.js',
        'admin.js'
    ];

    for (const file of commandFiles) {
        const filePath = path.join(__dirname, 'commands', file);
        try {
            const command = require(filePath);
            if (command.data) {
                commands.push(command.data.toJSON());
                logger.info(`✅ Loaded command: ${command.data.name}`);
            }
        } catch (error) {
            logger.error(`❌ Error loading command ${file}:`, error);
        }
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        logger.info(`🔄 Deploying ${commands.length} commands...`);

        if (process.env.GUILD_ID) {
            // Deploy to specific guild
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands }
            );
            logger.info(`✅ Deployed ${commands.length} commands to guild ${process.env.GUILD_ID}`);
        } else {
            // Deploy globally
            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands }
            );
            logger.info(`✅ Deployed ${commands.length} commands globally`);
        }
    } catch (error) {
        logger.error('❌ Error deploying commands:', error);
    }
}

// Run if called directly
if (require.main === module) {
    deployCommands().then(() => {
        process.exit(0);
    }).catch((error) => {
        logger.error('Deployment failed:', error);
        process.exit(1);
    });
}

module.exports = { deployCommands };
