const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hello')
        .setDescription('Bot sẽ chào bạn!')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Tên của bạn')
                .setRequired(false)),
    
    async execute(interaction) {
        const name = interaction.options.getString('name') || 'bạn';
        await interaction.reply(`👋 Xin chào ${name}! Chào mừng đến với server!`);
    }
};