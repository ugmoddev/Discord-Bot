const { logger } = require('../utils/logger');
const cron = require('node-cron');

class SystemHandler {
    constructor(client) {
        this.client = client;
        this.systems = new Map();
    }

    async initializeAll() {
        try {
            this.initializeEconomySystem();
            this.initializeBattleSystem();
            this.initializeGamblingSystem();
            this.initializePetSystem();

            this.startBackgroundJobs();
            logger.info('✅ All systems initialized successfully');
        } catch (error) {
            logger.error('❌ Error initializing systems:', error);
            throw error;
        }
    }

    initializeEconomySystem() {
        this.systems.set('economy', {
            daily: { reward: parseInt(process.env.DAILY_REWARD) || 5000 },
            weekly: { reward: parseInt(process.env.WEEKLY_REWARD) || 25000 },
            monthly: { reward: parseInt(process.env.MONTHLY_REWARD) || 100000 }
        });
        logger.info('💰 Economy system initialized');
    }

    initializeBattleSystem() {
        this.systems.set('battle', {
            maxLevel: parseInt(process.env.MAX_LEVEL) || 999,
            expMultiplier: parseFloat(process.env.BASE_EXP_MULTIPLIER) || 1.5
        });
        logger.info('⚔️ Battle system initialized');
    }

    initializeGamblingSystem() {
        this.systems.set('gambling', {
            maxBet: parseInt(process.env.MAX_BET) || 1000000,
            minBet: parseInt(process.env.MIN_BET) || 100,
            houseEdge: parseFloat(process.env.HOUSE_EDGE) || 0.05
        });
        logger.info('🎲 Gambling system initialized');
    }

    initializePetSystem() {
        this.systems.set('pet', {
            maxLevel: 100,
            maxEvolution: 5,
            catchRate: 0.3
        });
        logger.info('🐾 Pet system initialized');
    }

    startBackgroundJobs() {
        // Regen stamina every minute
        cron.schedule('* * * * *', async () => {
            // Implement stamina regeneration
        });

        // Daily reset at midnight
        cron.schedule('0 0 * * *', async () => {
            // Reset daily quests
        });

        logger.info('⏰ Background jobs scheduled');
    }

    getSystem(name) {
        return this.systems.get(name);
    }
}

module.exports = { SystemHandler };
