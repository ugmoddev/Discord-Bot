const { logger } = require('../utils/logger');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        const prefix = process.env.PREFIX || '!';
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = client.commands.get(commandName);
        if (!command) return;

        if (typeof command.execute !== 'function') return;

        try {
            await command.execute(message, args, client);
        } catch (error) {
            logger.error(`Error executing prefix command ${commandName}:`, error);
            await message.reply('❌ There was an error executing that command!');
        }
    }
};
