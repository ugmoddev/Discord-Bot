const { REST, Routes } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');
const { CooldownManager } = require('../utils/cooldown');

class CommandHandler {
    constructor(client) {
        this.client = client;
        this.commands = client.commands;
        this.cooldowns = client.cooldowns;
        this.cooldownManager = new CooldownManager();
        this.rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    }

    async loadCommands() {
        const commandFiles = [
            'gambling.js',
            'battle.js',
            'pet.js',
            'adventure.js',
            'economy.js',
            'progression.js',
            'admin.js'
        ];

        const commands = [];

        for (const file of commandFiles) {
            const filePath = path.join(__dirname, '..', 'commands', file);
            try {
                const command = require(filePath);
                if (!command.data) {
                    logger.warn(`⚠️ Command ${file} missing data property`);
                    continue;
                }
                this.commands.set(command.data.name, command);
                commands.push(command.data.toJSON());
                logger.info(`✅ Loaded command: ${command.data.name}`);
            } catch (error) {
                logger.error(`❌ Error loading command ${file}:`, error);
            }
        }

        try {
            await this.rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands }
            );
            logger.info(`✅ Registered ${commands.length} slash commands`);
        } catch (error) {
            logger.error('❌ Failed to register slash commands:', error);
        }
    }

    async handleInteraction(interaction) {
        if (!interaction.isCommand()) return;

        const command = this.commands.get(interaction.commandName);
        if (!command) {
            await interaction.reply({
                content: '❌ Command not found!',
                ephemeral: true
            });
            return;
        }

        if (this.client.maintenance && !command.adminOnly) {
            await interaction.reply({
                content: '🔧 Bot is currently under maintenance. Please try again later.',
                ephemeral: true
            });
            return;
        }

        const cooldownResult = await this.cooldownManager.checkCooldown(interaction, command);
        if (!cooldownResult.allowed) {
            await interaction.reply({
                content: `⏰ ${cooldownResult.message}`,
                ephemeral: true
            });
            return;
        }

        try {
            await command.execute(interaction, this.client);
            logger.info(`📝 Command executed: ${command.data.name} by ${interaction.user.tag}`);
        } catch (error) {
            logger.error(`❌ Error executing command ${interaction.commandName}:`, error);
            const errorMessage = {
                content: '❌ An error occurred while executing this command!',
                ephemeral: true
            };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage).catch(() => {});
            } else {
                await interaction.reply(errorMessage).catch(() => {});
            }
        }
    }
}

module.exports = { CommandHandler };
