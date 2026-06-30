require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const { logger } = require('./utils/logger');

async function testDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        logger.info('✅ Connected to MongoDB');

        // Test create user
        const testUser = new User({
            userId: 'test123',
            username: 'TestUser'
        });
        await testUser.save();
        logger.info('✅ Test user created');

        // Test find user
        const found = await User.findOne({ userId: 'test123' });
        logger.info(`✅ Found user: ${found.username}`);

        // Test add coins
        found.addCoins(1000);
        await found.save();
        logger.info(`✅ Added 1000 coins, new balance: ${found.coins}`);

        // Test add exp
        found.addExp(50);
        await found.save();
        logger.info(`✅ Added 50 EXP, new level: ${found.level}`);

        // Cleanup
        await User.deleteOne({ userId: 'test123' });
        logger.info('✅ Test user cleaned up');

        await mongoose.disconnect();
        logger.info('✅ Test completed successfully');
    } catch (error) {
        logger.error('❌ Test failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    testDatabase();
}

module.exports = { testDatabase };s
