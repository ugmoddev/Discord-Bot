const Joi = require('joi');

class Validator {
    static validateUser(user) {
        const schema = Joi.object({
            userId: Joi.string().required(),
            username: Joi.string().optional(),
            level: Joi.number().min(1).default(1),
            coins: Joi.number().min(0).default(0),
            gems: Joi.number().min(0).default(0)
        });

        return schema.validate(user);
    }

    static validateBet(bet, maxBet, minBet) {
        if (bet < minBet) {
            return { valid: false, message: `Minimum bet is ${minBet} coins` };
        }
        if (bet > maxBet) {
            return { valid: false, message: `Maximum bet is ${maxBet} coins` };
        }
        return { valid: true };
    }

    static validateAmount(amount) {
        if (!amount || amount <= 0) {
            return { valid: false, message: 'Amount must be positive' };
        }
        if (!Number.isInteger(amount)) {
            return { valid: false, message: 'Amount must be a whole number' };
        }
        return { valid: true };
    }

    static validateItem(item) {
        const schema = Joi.object({
            name: Joi.string().required(),
            type: Joi.string().valid('weapon', 'armor', 'potion', 'material', 'special'),
            rarity: Joi.string().valid('Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Ancient'),
            price: Joi.number().min(0),
            stats: Joi.object().optional()
        });

        return schema.validate(item);
    }

    static validatePet(pet) {
        const schema = Joi.object({
            name: Joi.string().required(),
            type: Joi.string().required(),
            level: Joi.number().min(1).default(1),
            rarity: Joi.string().valid('Common', 'Uncommon', 'Rare', 'Epic', 'Legendary')
        });

        return schema.validate(pet);
    }
}

module.exports = { Validator };
