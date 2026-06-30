const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../models/User');
const { logger } = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gamble')
        .setDescription('Play gambling games')
        .addSubcommand(sub => sub
            .setName('coinflip')
            .setDescription('Flip a coin')
            .addIntegerOption(opt => opt.setName('bet').setRequired(true).setMinValue(100))
            .addStringOption(opt => opt.setName('choice').setRequired(true).addChoices(
                { name: 'Heads', value: 'heads' },
                { name: 'Tails', value: 'tails' }
            )))
        .addSubcommand(sub => sub
            .setName('dice')
            .setDescription('Roll dice')
            .addIntegerOption(opt => opt.setName('bet').setRequired(true).setMinValue(100))
            .addIntegerOption(opt => opt.setName('guess').setRequired(true).setMinValue(1).setMaxValue(6)))
        .addSubcommand(sub => sub
            .setName('slots')
            .setDescription('Play slots')
            .addIntegerOption(opt => opt.setName('bet').setRequired(true).setMinValue(100)))
        .addSubcommand(sub => sub
            .setName('roulette')
            .setDescription('Play roulette')
            .addIntegerOption(opt => opt.setName('bet').setRequired(true).setMinValue(100))
            .addStringOption(opt => opt.setName('color').setRequired(true).addChoices(
                { name: 'Red', value: 'red' },
                { name: 'Black', value: 'black' }
            )))
        .addSubcommand(sub => sub
            .setName('blackjack')
            .setDescription('Play blackjack')
            .addIntegerOption(opt => opt.setName('bet').setRequired(true).setMinValue(100)))
        .addSubcommand(sub => sub
            .setName('lottery')
            .setDescription('Buy lottery tickets')
            .addIntegerOption(opt => opt.setName('tickets').setRequired(true).setMinValue(1).setMaxValue(10))),

    cooldown: 5,

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'coinflip': return this.coinFlip(interaction);
            case 'dice': return this.dice(interaction);
            case 'slots': return this.slots(interaction);
            case 'roulette': return this.roulette(interaction);
            case 'blackjack': return this.blackjack(interaction);
            case 'lottery': return this.lottery(interaction);
            default: return interaction.reply('❌ Unknown gambling game!');
        }
    },

    async coinFlip(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first! Use `/economy daily`.');

        const bet = interaction.options.getInteger('bet');
        const choice = interaction.options.getString('choice');

        if (user.coins < bet) {
            return interaction.editReply(`❌ You need ${bet} coins! You have ${user.coins}.`);
        }

        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const isWin = choice === result;

        if (isWin) {
            user.addCoins(bet);
        } else {
            user.removeCoins(bet);
        }
        await user.save();

        const embed = new EmbedBuilder()
            .setColor(isWin ? '#00FF00' : '#FF0000')
            .setTitle(`${isWin ? '🎉' : '💔'} Coin Flip`)
            .setDescription(`You flipped **${result}**!`)
            .addFields(
                { name: 'Choice', value: choice, inline: true },
                { name: 'Bet', value: `${bet} coins`, inline: true },
                { name: 'Winnings', value: `${isWin ? '+' : '-'}${bet} coins`, inline: true },
                { name: 'Balance', value: `${user.coins} coins`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async dice(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        const bet = interaction.options.getInteger('bet');
        const guess = interaction.options.getInteger('guess');

        if (user.coins < bet) {
            return interaction.editReply(`❌ You need ${bet} coins! You have ${user.coins}.`);
        }

        const result = Math.floor(Math.random() * 6) + 1;
        const isWin = guess === result;

        if (isWin) {
            user.addCoins(bet * 5);
        } else {
            user.removeCoins(bet);
        }
        await user.save();

        const embed = new EmbedBuilder()
            .setColor(isWin ? '#00FF00' : '#FF0000')
            .setTitle(`${isWin ? '🎉' : '💔'} Dice Roll`)
            .setDescription(`You rolled a **${result}**!`)
            .addFields(
                { name: 'Your Guess', value: `${guess}`, inline: true },
                { name: 'Result', value: `${result}`, inline: true },
                { name: 'Winnings', value: `${isWin ? '+' : '-'}${isWin ? bet * 5 : bet} coins`, inline: true },
                { name: 'Balance', value: `${user.coins} coins`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async slots(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        const bet = interaction.options.getInteger('bet');
        if (user.coins < bet) {
            return interaction.editReply(`❌ You need ${bet} coins! You have ${user.coins}.`);
        }

        const symbols = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣'];
        const results = [
            symbols[Math.floor(Math.random() * symbols.length)],
            symbols[Math.floor(Math.random() * symbols.length)],
            symbols[Math.floor(Math.random() * symbols.length)]
        ];

        const isWin = results[0] === results[1] && results[1] === results[2];
        const multiplier = isWin ? 
            results[0] === '💎' ? 10 :
            results[0] === '7️⃣' ? 7 : 3 : 0;

        if (isWin) {
            user.addCoins(bet * multiplier);
        } else {
            user.removeCoins(bet);
        }
        await user.save();

        const embed = new EmbedBuilder()
            .setColor(isWin ? '#00FF00' : '#FF0000')
            .setTitle(`${isWin ? '🎉' : '💔'} Slots`)
            .setDescription(`${results.join(' | ')}`)
            .addFields(
                { name: 'Result', value: isWin ? `You won ${multiplier}x!` : 'Better luck next time!', inline: true },
                { name: 'Winnings', value: `${isWin ? '+' : '-'}${isWin ? bet * multiplier : bet} coins`, inline: true },
                { name: 'Balance', value: `${user.coins} coins`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async roulette(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        const bet = interaction.options.getInteger('bet');
        const color = interaction.options.getString('color');

        if (user.coins < bet) {
            return interaction.editReply(`❌ You need ${bet} coins! You have ${user.coins}.`);
        }

        const colors = ['red', 'black'];
        const resultColor = colors[Math.floor(Math.random() * colors.length)];
        const isWin = color === resultColor;

        if (isWin) {
            user.addCoins(bet);
        } else {
            user.removeCoins(bet);
        }
        await user.save();

        const embed = new EmbedBuilder()
            .setColor(isWin ? '#00FF00' : '#FF0000')
            .setTitle(`${isWin ? '🎉' : '💔'} Roulette`)
            .setDescription(`The ball landed on **${resultColor}**!`)
            .addFields(
                { name: 'Your Bet', value: `${color} (${bet} coins)`, inline: true },
                { name: 'Result', value: resultColor, inline: true },
                { name: 'Winnings', value: `${isWin ? '+' : '-'}${bet} coins`, inline: true },
                { name: 'Balance', value: `${user.coins} coins`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async blackjack(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        const bet = interaction.options.getInteger('bet');
        if (user.coins < bet) {
            return interaction.editReply(`❌ You need ${bet} coins! You have ${user.coins}.`);
        }

        const getCard = () => Math.floor(Math.random() * 10) + 1;
        const playerCards = [getCard(), getCard()];
        const dealerCards = [getCard(), getCard()];
        
        let playerTotal = playerCards.reduce((a, b) => a + b, 0);
        let dealerTotal = dealerCards.reduce((a, b) => a + b, 0);

        while (dealerTotal < 17) {
            dealerCards.push(getCard());
            dealerTotal = dealerCards.reduce((a, b) => a + b, 0);
        }

        const playerBust = playerTotal > 21;
        const dealerBust = dealerTotal > 21;
        
        let isWin = false;
        let resultMessage = '';

        if (playerBust) {
            resultMessage = 'You busted! Dealer wins.';
            user.removeCoins(bet);
        } else if (dealerBust) {
            isWin = true;
            resultMessage = 'Dealer busted! You win!';
            user.addCoins(bet);
        } else if (playerTotal > dealerTotal) {
            isWin = true;
            resultMessage = 'You win!';
            user.addCoins(bet);
        } else if (playerTotal < dealerTotal) {
            resultMessage = 'Dealer wins!';
            user.removeCoins(bet);
        } else {
            resultMessage = 'It\'s a tie!';
        }

        await user.save();

        const embed = new EmbedBuilder()
            .setColor(isWin ? '#00FF00' : '#FF0000')
            .setTitle('🃏 Blackjack')
            .addFields(
                { name: 'Your Cards', value: playerCards.join(' + '), inline: true },
                { name: 'Your Total', value: `${playerTotal}`, inline: true },
                { name: 'Dealer Cards', value: dealerCards.join(' + '), inline: true },
                { name: 'Dealer Total', value: `${dealerTotal}`, inline: true },
                { name: 'Result', value: resultMessage, inline: false },
                { name: 'Balance', value: `${user.coins} coins`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async lottery(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        const tickets = interaction.options.getInteger('tickets');
        const cost = tickets * 1000;

        if (user.coins < cost) {
            return interaction.editReply(`❌ You need ${cost} coins for ${tickets} tickets! You have ${user.coins}.`);
        }

        user.removeCoins(cost);
        const winningNumber = Math.floor(Math.random() * 1000);
        const userNumbers = Array.from({ length: tickets }, () => Math.floor(Math.random() * 1000));
        const matches = userNumbers.filter(num => num === winningNumber).length;
        
        let winnings = 0;
        if (matches > 0) {
            winnings = matches * 10000;
            user.addCoins(winnings);
        }
        await user.save();

        const embed = new EmbedBuilder()
            .setColor(winnings > 0 ? '#00FF00' : '#FFA500')
            .setTitle('🎰 Lottery Results')
            .setDescription(`Winning Number: **${winningNumber}**`)
            .addFields(
                { name: 'Your Numbers', value: userNumbers.join(', '), inline: false },
                { name: 'Matches', value: `${matches}`, inline: true },
                { name: 'Winnings', value: `+${winnings} coins`, inline: true },
                { name: 'Cost', value: `-${cost} coins`, inline: true },
                { name: 'Balance', value: `${user.coins} coins`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};
