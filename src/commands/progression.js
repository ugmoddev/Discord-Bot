const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../models/User');
const { logger } = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('progression')
        .setDescription('Progression and leveling commands')
        .addSubcommand(sub => sub
            .setName('profile')
            .setDescription('View your profile')
            .addUserOption(opt => opt.setName('user').setRequired(false)))
        .addSubcommand(sub => sub
            .setName('leaderboard')
            .setDescription('View leaderboards')
            .addStringOption(opt => opt.setName('type').setRequired(false)
                .addChoices(
                    { name: 'Level', value: 'level' },
                    { name: 'Coins', value: 'coins' }
                )))
        .addSubcommand(sub => sub
            .setName('prestige')
            .setDescription('Prestige your account'))
        .addSubcommand(sub => sub
            .setName('achievements')
            .setDescription('View your achievements')),

    cooldown: 3,

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'profile': return this.profile(interaction);
            case 'leaderboard': return this.leaderboard(interaction);
            case 'prestige': return this.prestige(interaction);
            case 'achievements': return this.achievements(interaction);
            default: return interaction.reply('❌ Unknown progression command!');
        }
    },

    async profile(interaction) {
        await interaction.deferReply();
        const target = interaction.options.getUser('user') || interaction.user;
        const user = await User.findOne({ userId: target.id });

        if (!user) {
            return interaction.editReply(`❌ ${target.username} has no account!`);
        }

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`👤 ${target.username}'s Profile`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '📊 Level', value: `${user.level}`, inline: true },
                { name: '✨ EXP', value: `${user.exp}/${user.expToNext}`, inline: true },
                { name: '💰 Coins', value: `${user.coins.toLocaleString()}`, inline: true },
                { name: '💎 Gems', value: `${user.gems}`, inline: true },
                { name: '🏦 Bank', value: `${user.bank.toLocaleString()}`, inline: true },
                { name: '⚔️ ATK', value: `${user.stats.atk}`, inline: true },
                { name: '🛡️ DEF', value: `${user.stats.def}`, inline: true },
                { name: '❤️ HP', value: `${user.stats.hp}/${user.stats.maxHp}`, inline: true },
                { name: '⚡ Stamina', value: `${user.stats.stamina}/${user.stats.maxStamina}`, inline: true },
                { name: '🐾 Pets', value: `${user.pets.length}`, inline: true }
            )
            .setFooter({ text: `Created: ${user.createdAt.toLocaleDateString()}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async leaderboard(interaction) {
        await interaction.deferReply();
        const type = interaction.options.getString('type') || 'level';
        
        let users = [];
        let title = '';

        switch (type) {
            case 'level':
                users = await User.find().sort({ level: -1, exp: -1 }).limit(10);
                title = '🏆 Level Leaderboard';
                break;
            case 'coins':
                users = await User.find().sort({ coins: -1 }).limit(10);
                title = '💰 Coin Leaderboard';
                break;
        }

        if (users.length === 0) {
            return interaction.editReply('❌ No users found!');
        }

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(title);

        users.forEach((user, index) => {
            let value = '';
            switch (type) {
                case 'level':
                    value = `Level ${user.level} (${user.exp} EXP)`;
                    break;
                case 'coins':
                    value = `${user.coins.toLocaleString()} coins`;
                    break;
            }
            embed.addFields({
                name: `#${index + 1} ${user.username || 'Unknown'}`,
                value: value,
                inline: false
            });
        });

        embed.setTimestamp();
        await interaction.editReply({ embeds: [embed] });
    },

    async prestige(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        if (user.level < 100) {
            return interaction.editReply('❌ You need to be level 100 to prestige!');
        }

        if (user.prestige >= 10) {
            return interaction.editReply('❌ You have reached max prestige!');
        }

        user.prestige++;
        user.level = 1;
        user.exp = 0;
        user.expToNext = 100;
        user.coins = Math.floor(user.coins * 0.1);
        user.gems += 50;
        user.stats = {
            hp: 100,
            maxHp: 100,
            mana: 50,
            maxMana: 50,
            stamina: 100,
            maxStamina: 100,
            energy: 50,
            maxEnergy: 50,
            atk: 10 + user.prestige * 2,
            def: 5 + user.prestige,
            crit: 5,
            dodge: 5,
            accuracy: 90,
            luck: 10
        };

        await user.save();

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🌟 Prestige')
            .setDescription(`Congratulations! You have reached Prestige ${user.prestige}!`)
            .addFields(
                { name: 'Rewards', value: '✨ +50 Gems\n✨ Increased stats', inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async achievements(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        const achievements = [
            { name: 'First Steps', desc: 'Reach level 5', unlocked: user.level >= 5 },
            { name: 'Warrior', desc: 'Win 10 battles', unlocked: user.statistics.totalWins >= 10 },
            { name: 'Rich', desc: 'Get 100,000 coins', unlocked: user.coins >= 100000 },
            { name: 'Pet Collector', desc: 'Catch 5 pets', unlocked: user.pets.length >= 5 },
            { name: 'Boss Slayer', desc: 'Kill 5 bosses', unlocked: user.statistics.totalBossKills >= 5 },
            { name: 'Legendary', desc: 'Reach level 50', unlocked: user.level >= 50 }
        ];

        const unlocked = achievements.filter(a => a.unlocked);
        const locked = achievements.filter(a => !a.unlocked);

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏅 Achievements')
            .setDescription(`**Unlocked: ${unlocked.length}/${achievements.length}**`);

        if (unlocked.length > 0) {
            embed.addFields({
                name: '✅ Unlocked',
                value: unlocked.map(a => `• ${a.name}: ${a.desc}`).join('\n'),
                inline: false
            });
        }

        if (locked.length > 0) {
            embed.addFields({
                name: '🔒 Locked',
                value: locked.map(a => `• ${a.name}: ${a.desc}`).join('\n'),
                inline: false
            });
        }

        embed.setTimestamp();
        await interaction.editReply({ embeds: [embed] });
    }
};
