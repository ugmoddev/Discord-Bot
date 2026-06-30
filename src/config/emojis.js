module.exports = {
    EMOJIS: {
        // Economy
        COINS: '<:coins:1234567890>',
        GEMS: '<:gems:1234567891>',
        BANK: '<:bank:1234567892>',
        
        // Stats
        HP: '❤️',
        MANA: '💙',
        STAMINA: '⚡',
        ENERGY: '🔋',
        LEVEL: '⭐',
        EXP: '📈',
        
        // Items
        SWORD: '⚔️',
        SHIELD: '🛡️',
        HELMET: '⛑️',
        BOOTS: '👢',
        GLOVES: '🧤',
        RING: '💍',
        NECKLACE: '📿',
        CHEST: '📦',
        
        // RPG
        USER: '👤',
        MONSTER: '👾',
        BOSS: '👹',
        DUNGEON: '🏛️',
        GUILD: '🏰',
        PARTY: '👥',
        
        // Actions
        ATTACK: '🗡️',
        DEFEND: '🛡️',
        HEAL: '💚',
        RUN: '🏃',
        FISH: '🎣',
        MINE: '⛏️',
        FARM: '🌾',
        HUNT: '🏹',
        WORK: '💼',
        BEG: '🙏',
        ROB: '🔫',
        
        // Misc
        STAR: '⭐',
        TICK: '✅',
        CROSS: '❌',
        WARNING: '⚠️',
        INFO: 'ℹ️'
    },

    getRarityEmoji: (rarity) => {
        const emojis = {
            'Common': '⬜',
            'Uncommon': '🟩',
            'Rare': '🟦',
            'Epic': '🟪',
            'Legendary': '🟧',
            'Mythic': '🔴',
            'Ancient': '🌟'
        };
        return emojis[rarity] || '⬜';
    },

    getStatEmoji: (stat) => {
        const emojis = {
            hp: '❤️',
            atk: '⚔️',
            def: '🛡️',
            crit: '🎯',
            dodge: '💨',
            mana: '💙',
            stamina: '⚡',
            energy: '🔋'
        };
        return emojis[stat] || '📊';
    }
};
