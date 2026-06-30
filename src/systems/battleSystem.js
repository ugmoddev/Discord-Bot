const { logger } = require('../utils/logger');
const { randomInt, randomFloat } = require('../utils/random');

// Monster database
const MONSTER_TYPES = [
    { name: 'Slime', emoji: '🟢', baseStats: { hp: 30, atk: 5, def: 2, exp: 20, coins: 15 } },
    { name: 'Goblin', emoji: '👺', baseStats: { hp: 40, atk: 8, def: 3, exp: 30, coins: 25 } },
    { name: 'Wolf', emoji: '🐺', baseStats: { hp: 50, atk: 12, def: 4, exp: 40, coins: 35 } },
    { name: 'Bear', emoji: '🐻', baseStats: { hp: 80, atk: 15, def: 6, exp: 50, coins: 45 } },
    { name: 'Troll', emoji: '🧌', baseStats: { hp: 100, atk: 10, def: 8, exp: 60, coins: 50 } },
    { name: 'Dragon', emoji: '🐉', baseStats: { hp: 150, atk: 25, def: 10, exp: 100, coins: 100 } },
    { name: 'Demon', emoji: '👿', baseStats: { hp: 120, atk: 20, def: 12, exp: 80, coins: 80 } },
    { name: 'Phoenix', emoji: '🔥', baseStats: { hp: 130, atk: 22, def: 8, exp: 90, coins: 90 } },
    { name: 'Hydra', emoji: '🐲', baseStats: { hp: 200, atk: 18, def: 15, exp: 120, coins: 120 } },
    { name: 'Lich', emoji: '💀', baseStats: { hp: 90, atk: 30, def: 5, exp: 70, coins: 60 } }
];

// Boss types
const BOSS_TYPES = [
    { name: 'Shadow Lord', emoji: '🌑', baseStats: { hp: 300, atk: 30, def: 20, exp: 200, coins: 500 } },
    { name: 'Dragon King', emoji: '👑', baseStats: { hp: 400, atk: 35, def: 25, exp: 300, coins: 800 } },
    { name: 'Demon Overlord', emoji: '😈', baseStats: { hp: 350, atk: 40, def: 22, exp: 250, coins: 700 } },
    { name: 'Elder God', emoji: '🌟', baseStats: { hp: 500, atk: 45, def: 30, exp: 400, coins: 1000 } }
];

function generateMonster(level, isBoss = false) {
    const types = isBoss ? BOSS_TYPES : MONSTER_TYPES;
    const type = types[Math.floor(Math.random() * types.length)];
    
    const multiplier = 1 + (level - 1) * 0.1;
    const stats = {
        hp: Math.floor(type.baseStats.hp * multiplier),
        maxHp: Math.floor(type.baseStats.hp * multiplier),
        atk: Math.floor(type.baseStats.atk * multiplier),
        def: Math.floor(type.baseStats.def * multiplier),
        exp: Math.floor(type.baseStats.exp * multiplier),
        coins: Math.floor(type.baseStats.coins * multiplier),
        crit: 5 + Math.floor(level * 0.2),
        dodge: 5 + Math.floor(level * 0.2)
    };

    return {
        name: isBoss ? `${type.emoji} ${type.name}` : `${type.emoji} ${type.name}`,
        emoji: type.emoji,
        level: level,
        type: type.name,
        stats: stats,
        isBoss: isBoss,
        dropRate: isBoss ? 0.5 : 0.2
    };
}

class BattleSystem {
    constructor() {
        this.battles = new Map();
    }

    startPvEBattle(user, monster) {
        const battle = {
            id: `pve_${Date.now()}`,
            type: 'pve',
            user: user,
            monster: monster,
            turn: 'player',
            round: 0,
            finished: false,
            result: null,
            log: []
        };

        this.battles.set(battle.id, battle);
        return battle;
    }

    async processTurn(battle, action, data = {}) {
        if (battle.finished) return null;

        battle.round++;
        let result = {
            action: action,
            success: true,
            damage: 0,
            heal: 0,
            message: '',
            monsterAction: null
        };

        switch (action) {
            case 'attack':
                result = this.processAttack(battle);
                break;
            case 'defend':
                result = this.processDefend(battle);
                break;
            case 'heal':
                result = this.processHeal(battle);
                break;
            case 'flee':
                result = this.processFlee(battle);
                break;
            default:
                result.success = false;
                result.message = 'Invalid action!';
        }

        if (!battle.finished && result.success) {
            const monsterAction = this.processMonsterTurn(battle);
            result.monsterAction = monsterAction;
        }

        battle.log.push({
            round: battle.round,
            action: action,
            result: result
        });

        this.checkBattleEnd(battle);
        return result;
    }

    processAttack(battle) {
        const user = battle.user;
        const monster = battle.monster;
        
        const userAtk = user.stats.atk + (user.equipment.weapon?.stats?.atk || 0);
        const monsterDef = monster.stats.def;
        const critChance = (user.stats.crit + (user.equipment.weapon?.stats?.crit || 0)) / 100;
        const isCrit = Math.random() < critChance;
        const dodgeChance = monster.stats.dodge / 100;
        const isDodged = Math.random() < dodgeChance;

        let damage = Math.max(1, userAtk - monsterDef / 2);
        if (isCrit) damage *= 1.5;
        damage *= randomFloat(0.8, 1.2);
        damage = Math.floor(damage);

        if (isDodged) {
            return {
                success: true,
                damage: 0,
                message: `The ${monster.name} dodged your attack!`,
                isDodged: true
            };
        }

        monster.stats.hp = Math.max(0, monster.stats.hp - damage);

        return {
            success: true,
            damage: damage,
            isCrit: isCrit,
            message: isCrit ? `**Critical hit!** You dealt ${damage} damage!` : `You dealt ${damage} damage to ${monster.name}!`
        };
    }

    processDefend(battle) {
        const defenseBonus = 2;
        return {
            success: true,
            defenseBonus: defenseBonus,
            message: `You prepare to defend! Defense increased by ${defenseBonus}x`
        };
    }

    processHeal(battle) {
        const user = battle.user;
        const healAmount = Math.floor(user.stats.maxHp * 0.2);
        const actualHeal = Math.min(healAmount, user.stats.maxHp - user.stats.hp);
        
        user.stats.hp += actualHeal;

        return {
            success: true,
            heal: actualHeal,
            message: `You healed ${actualHeal} HP!`
        };
    }

    processFlee(battle) {
        const fleeChance = 0.6;
        const success = Math.random() < fleeChance;

        if (success) {
            battle.finished = true;
            battle.result = 'fled';
            return {
                success: true,
                message: 'You successfully fled from the battle!',
                fled: true
            };
        } else {
            return {
                success: false,
                message: 'You failed to flee! The monster attacks!',
                failedFlee: true
            };
        }
    }

    processMonsterTurn(battle) {
        const user = battle.user;
        const monster = battle.monster;
        
        const actions = ['attack', 'attack', 'attack', 'special'];
        const action = actions[Math.floor(Math.random() * actions.length)];

        switch (action) {
            case 'attack':
                return this.monsterAttack(user, monster);
            case 'special':
                return this.monsterSpecial(user, monster);
            default:
                return this.monsterAttack(user, monster);
        }
    }

    monsterAttack(user, monster) {
        const monsterAtk = monster.stats.atk;
        const userDef = user.stats.def + (user.equipment.armor?.stats?.def || 0);
        const dodgeChance = user.stats.dodge / 100;
        const isDodged = Math.random() < dodgeChance;

        if (isDodged) {
            return {
                action: 'attack',
                damage: 0,
                message: `You dodged ${monster.name}'s attack!`,
                isDodged: true
            };
        }

        let damage = Math.max(1, monsterAtk - userDef / 2);
        damage *= randomFloat(0.8, 1.2);
        damage = Math.floor(damage);

        user.stats.hp = Math.max(0, user.stats.hp - damage);

        return {
            action: 'attack',
            damage: damage,
            message: `${monster.name} attacks you for ${damage} damage!`
        };
    }

    monsterSpecial(user, monster) {
        const damage = Math.floor(monster.stats.atk * 1.5);
        user.stats.hp = Math.max(0, user.stats.hp - damage);

        return {
            action: 'special',
            damage: damage,
            message: `${monster.name} uses a special attack for ${damage} damage!`
        };
    }

    checkBattleEnd(battle) {
        const user = battle.user;
        const monster = battle.monster;

        if (user.stats.hp <= 0) {
            battle.finished = true;
            battle.result = 'lost';
            return true;
        }

        if (monster.stats.hp <= 0) {
            battle.finished = true;
            battle.result = 'won';
            return true;
        }

        return false;
    }

    getRewards(battle) {
        if (!battle.finished || battle.result !== 'won') {
            return null;
        }

        const monster = battle.monster;
        const expReward = Math.floor(monster.stats.exp * (1 + Math.random() * 0.5));
        const coinReward = Math.floor(monster.stats.coins * (1 + Math.random() * 0.5));
        const itemDrop = Math.random() < (monster.dropRate || 0.2);

        const rewards = {
            exp: expReward,
            coins: coinReward,
            items: itemDrop ? this.generateItemDrop(monster) : null
        };

        return rewards;
    }

    generateItemDrop(monster) {
        const itemTypes = ['weapon', 'armor', 'potion', 'material'];
        const type = itemTypes[Math.floor(Math.random() * itemTypes.length)];
        const rarity = this.getRandomRarity();
        
        return {
            type: type,
            name: `${monster.type} ${type}`,
            rarity: rarity,
            stats: this.generateItemStats(type)
        };
    }

    getRandomRarity() {
        const rarities = [
            { name: 'Common', weight: 40 },
            { name: 'Uncommon', weight: 30 },
            { name: 'Rare', weight: 15 },
            { name: 'Epic', weight: 8 },
            { name: 'Legendary', weight: 4 },
            { name: 'Mythic', weight: 2 },
            { name: 'Ancient', weight: 1 }
        ];

        const totalWeight = rarities.reduce((sum, r) => sum + r.weight, 0);
        let random = Math.random() * totalWeight;

        for (const rarity of rarities) {
            random -= rarity.weight;
            if (random <= 0) {
                return rarity.name;
            }
        }

        return 'Common';
    }

    generateItemStats(type) {
        const stats = {};
        const statTypes = ['atk', 'def', 'hp', 'mana', 'crit', 'dodge'];
        
        for (let i = 0; i < 3; i++) {
            const stat = statTypes[Math.floor(Math.random() * statTypes.length)];
            const value = Math.floor(Math.random() * 10) + 1;
            stats[stat] = (stats[stat] || 0) + value;
        }

        return stats;
    }
}

module.exports = { generateMonster, BattleSystem, MONSTER_TYPES, BOSS_TYPES };
