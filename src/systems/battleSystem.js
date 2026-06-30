const { logger } = require('../utils/logger');

const MONSTER_TYPES = [
    { name: 'Slime', emoji: '🟢', baseStats: { hp: 30, atk: 5, def: 2, exp: 20, coins: 15 } },
    { name: 'Goblin', emoji: '👺', baseStats: { hp: 40, atk: 8, def: 3, exp: 30, coins: 25 } },
    { name: 'Wolf', emoji: '🐺', baseStats: { hp: 50, atk: 12, def: 4, exp: 40, coins: 35 } },
    { name: 'Bear', emoji: '🐻', baseStats: { hp: 80, atk: 15, def: 6, exp: 50, coins: 45 } },
    { name: 'Troll', emoji: '🧌', baseStats: { hp: 100, atk: 10, def: 8, exp: 60, coins: 50 } },
    { name: 'Dragon', emoji: '🐉', baseStats: { hp: 150, atk: 25, def: 10, exp: 100, coins: 100 } }
];

const BOSS_TYPES = [
    { name: 'Shadow Lord', emoji: '🌑', baseStats: { hp: 300, atk: 30, def: 20, exp: 200, coins: 500 } },
    { name: 'Dragon King', emoji: '👑', baseStats: { hp: 400, atk: 35, def: 25, exp: 300, coins: 800 } }
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
        name: `${type.emoji} ${type.name}`,
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

    async processTurn(battle, action) {
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

        this.checkBattleEnd(battle);
        return result;
    }

    processAttack(battle) {
        const user = battle.user;
        const monster = battle.monster;
        
        const userAtk = user.stats.atk;
        const monsterDef = monster.stats.def;
        const isCrit = Math.random() < (user.stats.crit / 100);
        const isDodged = Math.random() < (monster.stats.dodge / 100);

        let damage = Math.max(1, userAtk - monsterDef / 2);
        if (isCrit) damage *= 1.5;
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
        return {
            success: true,
            defenseBonus: 2,
            message: 'You prepare to defend! Defense increased by 2x'
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
        const success = Math.random() < 0.6;

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
        
        const monsterAtk = monster.stats.atk;
        const userDef = user.stats.def;
        const isDodged = Math.random() < (user.stats.dodge / 100);

        if (isDodged) {
            return {
                action: 'attack',
                damage: 0,
                message: `You dodged ${monster.name}'s attack!`,
                isDodged: true
            };
        }

        let damage = Math.max(1, monsterAtk - userDef / 2);
        damage = Math.floor(damage);

        user.stats.hp = Math.max(0, user.stats.hp - damage);

        return {
            action: 'attack',
            damage: damage,
            message: `${monster.name} attacks you for ${damage} damage!`
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

        return {
            exp: expReward,
            coins: coinReward
        };
    }
}

module.exports = { generateMonster, BattleSystem };
