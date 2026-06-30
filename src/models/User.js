const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, index: true },
    username: String,
    displayName: String,
    avatar: String,

    // Level & Progression
    level: { type: Number, default: 1 },
    exp: { type: Number, default: 0 },
    expToNext: { type: Number, default: 100 },
    prestige: { type: Number, default: 0 },
    ascension: { type: Number, default: 0 },

    // Economy
    coins: { type: Number, default: 10000 },
    gems: { type: Number, default: 50 },
    bank: { type: Number, default: 0 },
    bankCapacity: { type: Number, default: 1000000 },
    totalEarned: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },

    // Stats
    stats: {
        hp: { type: Number, default: 100 },
        maxHp: { type: Number, default: 100 },
        mana: { type: Number, default: 50 },
        maxMana: { type: Number, default: 50 },
        stamina: { type: Number, default: 100 },
        maxStamina: { type: Number, default: 100 },
        energy: { type: Number, default: 50 },
        maxEnergy: { type: Number, default: 50 },
        atk: { type: Number, default: 10 },
        def: { type: Number, default: 5 },
        crit: { type: Number, default: 5 },
        dodge: { type: Number, default: 5 },
        accuracy: { type: Number, default: 90 },
        luck: { type: Number, default: 10 }
    },

    // Equipment
    equipment: {
        weapon: { type: mongoose.Schema.Types.Mixed, default: null },
        armor: { type: mongoose.Schema.Types.Mixed, default: null },
        helmet: { type: mongoose.Schema.Types.Mixed, default: null },
        boots: { type: mongoose.Schema.Types.Mixed, default: null },
        gloves: { type: mongoose.Schema.Types.Mixed, default: null },
        ring: { type: mongoose.Schema.Types.Mixed, default: null },
        necklace: { type: mongoose.Schema.Types.Mixed, default: null },
        pet: { type: mongoose.Schema.Types.Mixed, default: null }
    },

    // Inventory
    inventory: [{
        id: { type: String, default: () => `item_${Date.now()}` },
        name: String,
        type: String,
        rarity: String,
        quantity: { type: Number, default: 1 },
        stats: mongoose.Schema.Types.Mixed,
        price: Number,
        equipped: { type: Boolean, default: false }
    }],

    // Pets
    pets: [{
        id: { type: String, default: () => `pet_${Date.now()}` },
        name: String,
        type: String,
        level: { type: Number, default: 1 },
        exp: { type: Number, default: 0 },
        evolution: { type: Number, default: 0 },
        rarity: String,
        stats: {
            hp: Number,
            atk: Number,
            def: Number
        },
        skills: [String],
        equipped: { type: Boolean, default: false },
        happiness: { type: Number, default: 100 },
        hunger: { type: Number, default: 100 }
    }],

    // PvP
    pvp: {
        elo: { type: Number, default: 1000 },
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        draws: { type: Number, default: 0 },
        streak: { type: Number, default: 0 },
        highestElo: { type: Number, default: 1000 }
    },

    // Statistics
    statistics: {
        totalBattles: { type: Number, default: 0 },
        totalWins: { type: Number, default: 0 },
        totalLosses: { type: Number, default: 0 },
        totalBossKills: { type: Number, default: 0 },
        totalDungeons: { type: Number, default: 0 },
        totalQuests: { type: Number, default: 0 },
        totalGambling: { type: Number, default: 0 },
        totalGamblingWins: { type: Number, default: 0 },
        totalAdventures: { type: Number, default: 0 },
        dailyStreak: { type: Number, default: 0 },
        totalDailyClaims: { type: Number, default: 0 }
    },

    // Battle Pass
    battlePass: {
        tier: { type: Number, default: 0 },
        exp: { type: Number, default: 0 },
        premium: { type: Boolean, default: false },
        claimed: [String]
    },

    // Cooldowns
    cooldowns: {
        daily: Date,
        weekly: Date,
        monthly: Date,
        work: Date,
        beg: Date,
        crime: Date,
        rob: Date,
        fish: Date,
        mine: Date,
        hunt: Date,
        explore: Date,
        battle: Date,
        boss: Date,
        dungeon: Date,
        gamble: Date,
        lottery: Date,
        pet: Date
    },

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now }
}, { timestamps: true });

// Indexes
userSchema.index({ userId: 1 });
userSchema.index({ level: -1 });
userSchema.index({ coins: -1 });
userSchema.index({ 'pvp.elo': -1 });

// Virtuals
userSchema.virtual('rank').get(function() {
    const elo = this.pvp.elo;
    if (elo >= 2400) return 'Grandmaster';
    if (elo >= 2200) return 'Master';
    if (elo >= 2000) return 'Diamond';
    if (elo >= 1800) return 'Platinum';
    if (elo >= 1600) return 'Gold';
    if (elo >= 1400) return 'Silver';
    if (elo >= 1200) return 'Bronze';
    return 'Unranked';
});

// Methods
userSchema.methods.addExp = function(amount) {
    this.exp += amount;
    let leveledUp = false;
    
    while (this.exp >= this.expToNext) {
        this.exp -= this.expToNext;
        this.level++;
        this.expToNext = Math.floor(this.expToNext * 1.5);
        leveledUp = true;
        
        // Level up bonuses
        this.stats.maxHp += 10;
        this.stats.maxMana += 5;
        this.stats.maxStamina += 2;
        this.stats.atk += 2;
        this.stats.def += 1;
        this.stats.crit += 0.5;
        this.stats.dodge += 0.5;
    }
    
    return leveledUp;
};

userSchema.methods.addCoins = function(amount) {
    this.coins += amount;
    this.totalEarned += amount;
};

userSchema.methods.removeCoins = function(amount) {
    if (this.coins >= amount) {
        this.coins -= amount;
        this.totalSpent += amount;
        return true;
    }
    return false;
};

userSchema.methods.isOnCooldown = function(action) {
    const cooldown = this.cooldowns[action];
    if (!cooldown) return false;
    const timeSince = Date.now() - cooldown.getTime();
    return timeSince < this.getCooldownTime(action);
};

userSchema.methods.getCooldownTime = function(action) {
    const cooldowns = {
        daily: 86400000,
        weekly: 604800000,
        monthly: 2592000000,
        work: 60000,
        beg: 30000,
        crime: 120000,
        rob: 300000,
        fish: 60000,
        mine: 60000,
        hunt: 90000,
        explore: 120000,
        battle: 10000,
        boss: 300000,
        dungeon: 600000,
        gamble: 5000,
        lottery: 600000,
        pet: 10000
    };
    return cooldowns[action] || 60000;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
