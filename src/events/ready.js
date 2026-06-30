const { logger } = require('../utils/logger');

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        logger.info(`✅ Bot is ready! Logged in as ${client.user.tag}`);
        logger.info(`📊 Serving ${client.guilds.cache.size} guilds`);
        logger.info(`👥 Watching ${client.users.cache.size} users`);
        logger.info(`📝 Loaded ${client.commands.size} commands`);
        
        client.user.setPresence({
            activities: [
                {
                    name: `${client.guilds.cache.size} servers | /help`,
                    type: 3
                }
            ],
            status: 'online'
        });
    }
};
