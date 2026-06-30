const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../models/User');
const { logger } = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Admin commands')
        .addSubcommand(sub => sub
            .setName('givecoins')
            .setDescription('Give coins to a user')
            .addUserOption(opt => opt.setName('user').setRequired(true))
            .addIntegerOption(opt => opt.setName('amount').setRequired(true).setMinValue(1)))
        .addSubcommand(sub => sub
            .setName('giveexp')
            .setDescription('Give EXP to a user')
            .addUserOption(opt => opt.setName('user').setRequired(true))
            .addIntegerOption(opt => opt.setName('amount').setRequired(true).setMinValue(1)))
        .addSubcommand(sub => sub
            .setName('resetdata')
            .setDescription('Reset user data')
            .addUserOption(opt => opt.setName('user').setRequired(true))
            .addBooleanOption(opt => opt.setName('confirm').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('maintenance')
            .setDescription('Toggle maintenance mode')
            .addBooleanOption(opt => opt.setName('enabled').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('broadcast')
            .setDescription('Broadcast a message to all guilds')
            .addStringOption(opt => opt.setName('message').setRequired(true))),

    adminOnly: true,

    async execute(interaction, client) {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({
                content: '❌ You need Administrator permissions!',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'givecoins': return this.giveCoins(interaction);
            case 'giveexp': return this.giveExp(interaction);
            case 'resetdata': return this.resetData(interaction);
            case 'maintenance': return this.maintenance(interaction, client);
            case 'broadcast': return this.broadcast(interaction, client);
            default: return interaction.reply('❌ Unknown admin command!');
        }
    },

    async giveCoins(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        const user = await User.findOne({ userId: target.id });
        if (!user) {
            return interaction.editReply(`❌ ${target.username} has no account!`);
        }

        user.addCoins(amount);
        await user.save();

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Coins Given')
            .setDescription(`Gave **${amount.toLocaleString()}** coins to ${target.username}!`)
            .addFields(
                { name: 'Balance', value: `${user.coins.toLocaleString()} coins`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async giveExp(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        const user = await User.findOne({ userId: target.id });
        if (!user) {
            return interaction.editReply(`❌ ${target.username} has no account!`);
        }

        const leveledUp = user.addExp(amount);
        await user.save();

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ EXP Given')
            .setDescription(`Gave **${amount}** EXP to ${target.username}!`)
            .addFields(
                { name: 'Level', value: `${user.level}`, inline: true },
                { name: 'EXP', value: `${user.exp}/${user.expToNext}`, inline: true }
            );

        if (leveledUp) {
            embed.addFields({
                name: '🎉 Level Up!',
                value: `Leveled up to level ${user.level}!`,
                inline: false
            });
        }

        embed.setTimestamp();
        await interaction.editReply({ embeds: [embed] });
    },

    async resetData(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const target = interaction.options.getUser('user');
        const confirm = interaction.options.getBoolean('confirm');

        if (!confirm) {
            return interaction.editReply('❌ You must confirm this action with `confirm: true`');
        }

        const result = await User.findOneAndDelete({ userId: target.id });
        if (!result) {
            return interaction.editReply(`❌ ${target.username} has no account to reset!`);
        }

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🗑️ Data Reset')
            .setDescription(`Reset all data for ${target.username}!`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async maintenance(interaction, client) {
        await interaction.deferReply({ ephemeral: true });
        const enabled = interaction.options.getBoolean('enabled');

        client.maintenance = enabled;

        const embed = new EmbedBuilder()
            .setColor(enabled ? '#FF0000' : '#00FF00')
            .setTitle(`${enabled ? '🔧' : '✅'} Maintenance Mode`)
            .setDescription(`Maintenance mode is now **${enabled ? 'ENABLED' : 'DISABLED'}**`)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async broadcast(interaction, client) {
        await interaction.deferReply({ ephemeral: true });
        const message = interaction.options.getString('message');

        let sent = 0;
        for (const guild of client.guilds.cache.values()) {
            try {
                const channel = guild.channels.cache
                    .filter(c => c.type === 0)
                    .sort((a, b) => a.position - b.position)
                    .first();

                if (channel) {
                    await channel.send({
                        embeds: [new EmbedBuilder()
                            .setColor('#FFD700')
                            .setTitle('📢 Announcement')
                            .setDescription(message)
                            .setFooter({ text: `From: ${interaction.user.tag}` })
                            .setTimestamp()
                        ]
                    });
                    sent++;
                }
            } catch (error) {
                logger.error(`Failed to broadcast to guild ${guild.id}:`, error);
            }
        }

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('📢 Broadcast Sent')
            .setDescription(`Message sent to **${sent}** guilds!`)
            .addFields({ name: 'Message', value: message, inline: false })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};
