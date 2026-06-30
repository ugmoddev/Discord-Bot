const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../models/User');
const { logger } = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('adventure')
        .setDescription('Adventure and exploration commands')
        .addSubcommand(sub => sub
            .setName('explore')
            .setDescription('Explore the world')
            .addStringOption(opt => opt.setName('area').setRequired(false)
                .addChoices(
                    { name: 'Forest', value: 'forest' },
                    { name: 'Cave', value: 'cave' },
                    { name: 'Desert', value: 'desert' }
                )))
        .addSubcommand(sub => sub
            .setName('hunt')
            .setDescription('Go hunting'))
        .addSubcommand(sub => sub
            .setName('fish')
            .setDescription('Go fishing'))
        .addSubcommand(sub => sub
            .setName('mine')
            .setDescription('Go mining'))
        .addSubcommand(sub => sub
            .setName('farm')
            .setDescription('Go farming'))
        .addSubcommand(sub => sub
            .setName('treasure')
            .setDescription('Search for treasure')),

    cooldown: 60,

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'explore': return this.explore(interaction);
            case 'hunt': return this.hunt(interaction);
            case 'fish': return this.fish(interaction);
            case 'mine': return this.mine(interaction);
            case 'farm': return this.farm(interaction);
            case 'treasure': return this.treasure(interaction);
            default: return interaction.reply('❌ Unknown adventure command!');
        }
    },

    async explore(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        if (user.stats.stamina < 20) {
            return interaction.editReply('❌ Not enough stamina! Need 20.');
        }

        const areas = {
            forest: { monsters: ['Wolf', 'Bear', 'Deer'], reward: 1.0 },
            cave: { monsters: ['Bat', 'Goblin', 'Troll'], reward: 1.3 },
            desert: { monsters: ['Scorpion', 'Snake', 'Mummy'], reward: 1.4 }
        };

        const area = interaction.options.getString('area') || 'forest';
        const areaData = areas[area] || areas.forest;
        
        user.stats.stamina -= 20;
        const monster = areaData.monsters[Math.floor(Math.random() * areaData.monsters.length)];
        const expGain = Math.floor((50 + user.level * 5) * areaData.reward);
        const coinGain = Math.floor((100 + user.level * 10) * areaData.reward);

        user.addExp(expGain);
        user.addCoins(coinGain);
        user.statistics.totalAdventures = (user.statistics.totalAdventures || 0) + 1;
        await user.save();

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle(`🌍 Exploring ${area.charAt(0).toUpperCase() + area.slice(1)}`)
            .setDescription(`You encountered a wild ${monster} and defeated it!`)
            .addFields(
                { name: '✨ EXP', value: `+${expGain}`, inline: true },
                { name: '💰 Coins', value: `+${coinGain}`, inline: true },
                { name: '⚡ Stamina', value: `${user.stats.stamina}/${user.stats.maxStamina}`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async hunt(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        if (user.stats.stamina < 15) {
            return interaction.editReply('❌ Not enough stamina! Need 15.');
        }

        user.stats.stamina -= 15;
        const success = Math.random() > 0.3;

        if (success) {
            const prey = ['Deer', 'Rabbit', 'Boar', 'Fox'];
            const caught = prey[Math.floor(Math.random() * prey.length)];
            const expGain = Math.floor(30 + user.level * 3);
            const coinGain = Math.floor(80 + user.level * 8);
            
            user.addExp(expGain);
            user.addCoins(coinGain);
            user.statistics.totalAdventures = (user.statistics.totalAdventures || 0) + 1;
            await user.save();

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🏹 Hunting')
                .setDescription(`🎯 You caught a ${caught}!`)
                .addFields(
                    { name: '✨ EXP', value: `+${expGain}`, inline: true },
                    { name: '💰 Coins', value: `+${coinGain}`, inline: true },
                    { name: '⚡ Stamina', value: `${user.stats.stamina}/${user.stats.maxStamina}`, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } else {
            await user.save();
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🏹 Hunting')
                .setDescription('🦌 You missed your shot! Try again.')
                .addFields(
                    { name: '⚡ Stamina', value: `${user.stats.stamina}/${user.stats.maxStamina}`, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        }
    },

    async fish(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        if (user.stats.stamina < 10) {
            return interaction.editReply('❌ Not enough stamina! Need 10.');
        }

        user.stats.stamina -= 10;
        const fish = ['🐟 Salmon', '🐠 Trout', '🐡 Pufferfish', '🐋 Whale'];
        const caught = fish[Math.floor(Math.random() * fish.length)];
        const expGain = Math.floor(20 + user.level * 2);
        const coinGain = Math.floor(60 + user.level * 6);

        user.addExp(expGain);
        user.addCoins(coinGain);
        user.statistics.totalAdventures = (user.statistics.totalAdventures || 0) + 1;
        await user.save();

        const embed = new EmbedBuilder()
            .setColor('#00BFFF')
            .setTitle('🎣 Fishing')
            .setDescription(`You caught a ${caught}!`)
            .addFields(
                { name: '✨ EXP', value: `+${expGain}`, inline: true },
                { name: '💰 Coins', value: `+${coinGain}`, inline: true },
                { name: '⚡ Stamina', value: `${user.stats.stamina}/${user.stats.maxStamina}`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async mine(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        if (user.stats.stamina < 15) {
            return interaction.editReply('❌ Not enough stamina! Need 15.');
        }

        user.stats.stamina -= 15;
        const ores = ['Coal', 'Iron', 'Gold', 'Diamond'];
        const found = ores[Math.floor(Math.random() * ores.length)];
        const expGain = Math.floor(25 + user.level * 2);
        const coinGain = Math.floor(70 + user.level * 7);

        user.addExp(expGain);
        user.addCoins(coinGain);
        user.statistics.totalAdventures = (user.statistics.totalAdventures || 0) + 1;
        await user.save();

        const embed = new EmbedBuilder()
            .setColor('#FF8C00')
            .setTitle('⛏️ Mining')
            .setDescription(`You found ${found}!`)
            .addFields(
                { name: '✨ EXP', value: `+${expGain}`, inline: true },
                { name: '💰 Coins', value: `+${coinGain}`, inline: true },
                { name: '⚡ Stamina', value: `${user.stats.stamina}/${user.stats.maxStamina}`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async farm(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        if (user.stats.stamina < 10) {
            return interaction.editReply('❌ Not enough stamina! Need 10.');
        }

        user.stats.stamina -= 10;
        const crops = ['Wheat', 'Corn', 'Carrots', 'Potatoes'];
        const harvested = crops[Math.floor(Math.random() * crops.length)];
        const expGain = Math.floor(15 + user.level * 2);
        const coinGain = Math.floor(50 + user.level * 5);

        user.addExp(expGain);
        user.addCoins(coinGain);
        user.statistics.totalAdventures = (user.statistics.totalAdventures || 0) + 1;
        await user.save();

        const embed = new EmbedBuilder()
            .setColor('#32CD32')
            .setTitle('🌾 Farming')
            .setDescription(`You harvested ${harvested}!`)
            .addFields(
                { name: '✨ EXP', value: `+${expGain}`, inline: true },
                { name: '💰 Coins', value: `+${coinGain}`, inline: true },
                { name: '⚡ Stamina', value: `${user.stats.stamina}/${user.stats.maxStamina}`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async treasure(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        if (user.stats.stamina < 20) {
            return interaction.editReply('❌ Not enough stamina! Need 20.');
        }

        user.stats.stamina -= 20;
        const treasures = [
            { name: 'Ancient Coin', exp: 50, coins: 500 },
            { name: 'Gold Crown', exp: 80, coins: 1000 },
            { name: 'Diamond Ring', exp: 100, coins: 2000 },
            { name: 'Mysterious Gem', exp: 150, coins: 5000 }
        ];

        const found = treasures[Math.floor(Math.random() * treasures.length)];
        user.addExp(found.exp);
        user.addCoins(found.coins);
        user.statistics.totalAdventures = (user.statistics.totalAdventures || 0) + 1;
        await user.save();

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('💎 Treasure Hunt')
            .setDescription(`You found ${found.name}!`)
            .addFields(
                { name: '✨ EXP', value: `+${found.exp}`, inline: true },
                { name: '💰 Coins', value: `+${found.coins}`, inline: true },
                { name: '⚡ Stamina', value: `${user.stats.stamina}/${user.stats.maxStamina}`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};
