const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class EmbedBuilderUtil {
    static createProfileEmbed(user, userData) {
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`👤 ${user.username}'s Profile`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '📊 Level', value: `${userData.level}`, inline: true },
                { name: '✨ EXP', value: `${userData.exp}/${userData.expToNext}`, inline: true },
                { name: '💰 Coins', value: `${userData.coins.toLocaleString()}`, inline: true },
                { name: '💎 Gems', value: `${userData.gems}`, inline: true },
                { name: '🏦 Bank', value: `${userData.bank.toLocaleString()}`, inline: true },
                { name: '⚔️ ATK', value: `${userData.stats.atk}`, inline: true },
                { name: '🛡️ DEF', value: `${userData.stats.def}`, inline: true },
                { name: '❤️ HP', value: `${userData.stats.hp}/${userData.stats.maxHp}`, inline: true },
                { name: '⚡ Stamina', value: `${userData.stats.stamina}/${userData.stats.maxStamina}`, inline: true }
            )
            .setTimestamp();

        if (userData.pvp.elo) {
            embed.addFields({
                name: '🏆 PvP Rank',
                value: `${userData.pvp.elo} ELO (${userData.rank})`,
                inline: true
            });
        }

        return embed;
    }

    static createBattleEmbed(user, opponent, options = {}) {
        const embed = new EmbedBuilder()
            .setColor(options.color || '#FF4444')
            .setTitle(`${options.icon || '⚔️'} Battle!`)
            .setDescription(options.description || '')
            .addFields(
                {
                    name: `👤 ${user.username}`,
                    value: `HP: ${options.userHp || '100%'}\nATK: ${options.userAtk || 'N/A'}`,
                    inline: true
                },
                {
                    name: `👾 ${opponent.name || opponent.username}`,
                    value: `HP: ${options.opponentHp || '100%'}\nATK: ${options.opponentAtk || 'N/A'}`,
                    inline: true
                }
            )
            .setTimestamp();

        if (options.log) {
            embed.addFields({
                name: '📝 Battle Log',
                value: options.log.slice(-5).join('\n') || 'No actions yet',
                inline: false
            });
        }

        return embed;
    }

    static createErrorEmbed(message) {
        return new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Error')
            .setDescription(message)
            .setTimestamp();
    }

    static createSuccessEmbed(message) {
        return new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Success')
            .setDescription(message)
            .setTimestamp();
    }
}

module.exports = { EmbedBuilderUtil };
