class CooldownManager {
    constructor() {
        this.cooldowns = new Map();
        this.defaultCooldown = 3000;
    }

    async checkCooldown(interaction, command) {
        const cooldownTime = (command.cooldown || this.defaultCooldown) * 1000;
        const key = `${interaction.user.id}-${interaction.commandName}`;

        if (this.cooldowns.has(key)) {
            const expirationTime = this.cooldowns.get(key) + cooldownTime;
            const now = Date.now();

            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                return {
                    allowed: false,
                    message: `Please wait ${timeLeft.toFixed(1)} more seconds.`
                };
            }
        }

        this.cooldowns.set(key, Date.now());
        setTimeout(() => this.cooldowns.delete(key), cooldownTime);

        return { allowed: true };
    }
}

module.exports = { CooldownManager };
