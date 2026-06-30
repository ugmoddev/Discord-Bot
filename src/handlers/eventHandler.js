const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');

class EventHandler {
    constructor(client) {
        this.client = client;
    }

    async loadEvents() {
        const eventsPath = path.join(__dirname, '..', 'events');
        try {
            const files = await fs.readdir(eventsPath);
            const jsFiles = files.filter(file => file.endsWith('.js'));

            for (const file of jsFiles) {
                const filePath = path.join(eventsPath, file);
                const event = require(filePath);
                
                if (event.once) {
                    this.client.once(event.name, (...args) => event.execute(...args, this.client));
                } else {
                    this.client.on(event.name, (...args) => event.execute(...args, this.client));
                }
                
                logger.info(`✅ Loaded event: ${event.name}`);
            }
        } catch (error) {
            logger.error('❌ Error loading events:', error);
        }
    }
}

module.exports = { EventHandler };
