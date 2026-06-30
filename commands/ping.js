const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Kiểm tra ping của bot'),
    
    async execute(interaction) {
        const sent = await interaction.reply({
            content: 'Đang tính ping...',
            fetchReply: true
        });
        
        const ping = sent.createdTimestamp - interaction.createdTimestamp;
        await interaction.editReply(`🏓 Pong! Ping: ${ping}ms`);
    }
};