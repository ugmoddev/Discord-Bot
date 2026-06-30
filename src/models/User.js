const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, index: true },
    username: String,
    displayName: String,
    avatar: String,

    level: { type: Number, default: 1 },
    exp: { type: Number, default: 0 },
    expToNext: { type: Number, default: 100 },
    prestige: { type: Number, default: 0 },

    coins: { type: Number, default: 10000 },
    gems: { type: Number, default: 50 },
    bank: { type: Number, default: 0 },
    bankCapacity: { type: Number, default: 1000000 },
    totalEarned: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },

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

    equipment: {
        weapon: { type: mongoose.Schema.Types.Mixed, default: null },
        armor: { type: mongoose.Schema.Types.Mixed, default: null },
        helmet: { type: mongoose.Schema.Types.Mixed, default: null },
        boots: { type: mongoose.Schema.Types.Mixed, default: null },
        gloves: { type: mongoose.Schema.Types.Mixed, default: null },
        ring: { type: mongoose.Schema.Types.Mixed, default: null },
        necklace: { type: mongoose.Schema.Types.Mixed, default: null }
    },

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

    pvp: {
        elo: { type: Number, default: 1000 },
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        draws: { type: Number, default: 0 },
        streak: { type: Number, default: 0 },
        highestElo: { type: Number, default: 1000 }
    },

    statistics: {
        totalBattles: { type: Number, default: 0 },
        totalWins: { type: Number, default: 0 },
        totalLosses: { type: Number, default: 0 },
        totalBossKills: { type: Number, default: 0 },
        totalDungeons: { type: Number, default: 0 },
        totalAdventures: { type: Number, default: 0 }
    },

    cooldowns: {
        daily: Date,
        weekly: Date,
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
        pet: Date
    },

    createdAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now }
}, { timestamps: true });

userSchema.index({ userId: 1 });
userSchema.index({ level: -1 });
userSchema.index({ coins: -1 });

userSchema.methods.addExp = function(amount) {
    this.exp += amount;
    let leveledUp = false;
    
    while (this.exp >= this.expToNext) {
        this.exp -= this.expToNext;
        this.level++;
        this.expToNext = Math.floor(this.expToNext * 1.5);
        leveledUp = true;
        
        this.stats.maxHp += 10;
        this.stats.maxMana += 5;
        this.stats.maxStamina += 2;
        this.stats.atk += 2;
        this.stats.def += 1;
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
        pet: 10000
    };
    return cooldowns[action] || 60000;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
