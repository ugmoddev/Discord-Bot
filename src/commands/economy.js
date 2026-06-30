const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../models/User');
const { logger } = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('economy')
        .setDescription('Economy and money management')
        .addSubcommand(sub => sub
            .setName('daily')
            .setDescription('Claim your daily reward'))
        .addSubcommand(sub => sub
            .setName('weekly')
            .setDescription('Claim your weekly reward'))
        .addSubcommand(sub => sub
            .setName('monthly')
            .setDescription('Claim your monthly reward'))
        .addSubcommand(sub => sub
            .setName('work')
            .setDescription('Work for coins')
            .addStringOption(opt => opt.setName('job').setRequired(false)
                .addChoices(
                    { name: 'Miner', value: 'miner' },
                    { name: 'Farmer', value: 'farmer' },
                    { name: 'Fisher', value: 'fisher' },
                    { name: 'Hunter', value: 'hunter' }
                )))
        .addSubcommand(sub => sub
            .setName('beg')
            .setDescription('Beg for coins'))
        .addSubcommand(sub => sub
            .setName('crime')
            .setDescription('Commit a crime for coins'))
        .addSubcommand(sub => sub
            .setName('rob')
            .setDescription('Rob another player')
            .addUserOption(opt => opt.setName('target').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('bank')
            .setDescription('Bank operations')
            .addStringOption(opt => opt.setName('action').setRequired(true)
                .addChoices(
                    { name: 'deposit', value: 'deposit' },
                    { name: 'withdraw', value: 'withdraw' },
                    { name: 'balance', value: 'balance' }
                ))
            .addIntegerOption(opt => opt.setName('amount').setRequired(false).setMinValue(1)))
        .addSubcommand(sub => sub
            .setName('balance')
            .setDescription('Check your balance')
            .addUserOption(opt => opt.setName('user').setRequired(false)))
        .addSubcommand(sub => sub
            .setName('shop')
            .setDescription('Browse the shop')
            .addStringOption(opt => opt.setName('category').setRequired(false)
                .addChoices(
                    { name: 'Weapons', value: 'weapons' },
                    { name: 'Armor', value: 'armor' },
                    { name: 'Potions', value: 'potions' },
                    { name: 'Special', value: 'special' }
                )))
        .addSubcommand(sub => sub
            .setName('buy')
            .setDescription('Buy an item from the shop')
            .addStringOption(opt => opt.setName('item').setRequired(true))
            .addIntegerOption(opt => opt.setName('quantity').setRequired(false).setMinValue(1).setMaxValue(99))),

    cooldown: 3,

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'daily': return this.daily(interaction);
            case 'weekly': return this.weekly(interaction);
            case 'monthly': return this.monthly(interaction);
            case 'work': return this.work(interaction);
            case 'beg': return this.beg(interaction);
            case 'crime': return this.crime(interaction);
            case 'rob': return this.rob(interaction);
            case 'bank': return this.bank(interaction);
            case 'balance': return this.balance(interaction);
            case 'shop': return this.shop(interaction);
            case 'buy': return this.buy(interaction);
            default: return interaction.reply('❌ Unknown economy command!');
        }
    },

    async daily(interaction) {
        await interaction.deferReply();
        let user = await User.findOne({ userId: interaction.user.id });
        if (!user) {
            user = new User({ userId: interaction.user.id });
            await user.save();
        }

        const now = Date.now();
        const lastDaily = user.cooldowns.daily;
        
        if (lastDaily && (now - lastDaily.getTime()) < 86400000) {
            const timeLeft = 86400000 - (now - lastDaily.getTime());
            const hours = Math.floor(timeLeft / 3600000);
            const minutes = Math.floor((timeLeft % 3600000) / 60000);
            return interaction.editReply(`⏰ Already claimed! Come back in ${hours}h ${minutes}m.`);
        }

        const reward = parseInt(process.env.DAILY_REWARD) || 5000;
        user.addCoins(reward);
        user.cooldowns.daily = new Date();
        await user.save();

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('📅 Daily Reward')
            .setDescription(`You received **${reward.toLocaleString()}** coins!`)
            .addFields(
                { name: 'Balance', value: `${user.coins.toLocaleString()} coins`, inline: true },
                { name: 'Streak', value: `${user.statistics.dailyStreak || 0} days`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        logger.info(`Daily claimed: ${interaction.user.tag} -> ${reward} coins`);
    },

    async weekly(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        const now = Date.now();
        const lastWeekly = user.cooldowns.weekly;
        
        if (lastWeekly && (now - lastWeekly.getTime()) < 604800000) {
            const timeLeft = 604800000 - (now - lastWeekly.getTime());
            const days = Math.floor(timeLeft / 86400000);
            return interaction.editReply(`⏰ Already claimed! Come back in ${days} days.`);
        }

        const reward = parseInt(process.env.WEEKLY_REWARD) || 25000;
        user.addCoins(reward);
        user.cooldowns.weekly = new Date();
        await user.save();

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('📊 Weekly Reward')
            .setDescription(`You received **${reward.toLocaleString()}** coins!`)
            .addFields(
                { name: 'Balance', value: `${user.coins.toLocaleString()} coins`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async monthly(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        const now = Date.now();
        const lastMonthly = user.cooldowns.monthly;
        
        if (lastMonthly && (now - lastMonthly.getTime()) < 2592000000) {
            const timeLeft = 2592000000 - (now - lastMonthly.getTime());
            const days = Math.floor(timeLeft / 86400000);
            return interaction.editReply(`⏰ Already claimed! Come back in ${days} days.`);
        }

        const reward = parseInt(process.env.MONTHLY_REWARD) || 100000;
        user.addCoins(reward);
        user.cooldowns.monthly = new Date();
        await user.save();

        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('📈 Monthly Reward')
            .setDescription(`You received **${reward.toLocaleString()}** coins!`)
            .addFields(
                { name: 'Balance', value: `${user.coins.toLocaleString()} coins`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async work(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        if (user.isOnCooldown('work')) {
            return interaction.editReply('⏰ You need to rest! Come back in 1 minute.');
        }

        const job = interaction.options.getString('job') || 'worker';
        const jobMultipliers = {
            miner: 1.5,
            farmer: 1.3,
            fisher: 1.2,
            hunter: 1.4,
            worker: 1.0
        };

        const baseEarnings = Math.floor(Math.random() * 200) + 100;
        const earnings = Math.floor(baseEarnings * (jobMultipliers[job] || 1));
        
        user.addCoins(earnings);
        user.cooldowns.work = new Date();
        await user.save();

        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('💼 Work')
            .setDescription(`You worked as a **${job}** and earned **${earnings}** coins!`)
            .addFields(
                { name: 'Balance', value: `${user.coins.toLocaleString()} coins`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async beg(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        if (user.isOnCooldown('beg')) {
            return interaction.editReply('⏰ You already begged recently! Wait 30 seconds.');
        }

        const chance = Math.random();
        const earnings = chance > 0.7 ? Math.floor(Math.random() * 100) + 50 : 0;
        
        if (earnings > 0) {
            user.addCoins(earnings);
        }
        user.cooldowns.beg = new Date();
        await user.save();

        const embed = new EmbedBuilder()
            .setColor(earnings > 0 ? '#00FF00' : '#FF0000')
            .setTitle('🙏 Beg')
            .setDescription(earnings > 0 ? `Someone gave you **${earnings}** coins!` : 'No one gave you anything... Try again later!')
            .addFields(
                { name: 'Balance', value: `${user.coins.toLocaleString()} coins`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async crime(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        if (user.isOnCooldown('crime')) {
            return interaction.editReply('⏰ You need to lay low! Wait 2 minutes.');
        }

        const success = Math.random() > 0.4;
        let result = '';
        let amount = 0;

        if (success) {
            amount = Math.floor(Math.random() * 500) + 200;
            user.addCoins(amount);
            result = `🎉 You successfully committed a crime and got **${amount}** coins!`;
        } else {
            const penalty = Math.floor(Math.random() * 200) + 50;
            user.removeCoins(Math.min(penalty, user.coins));
            result = `🚨 You got caught! You lost **${Math.min(penalty, user.coins)}** coins!`;
        }

        user.cooldowns.crime = new Date();
        await user.save();

        const embed = new EmbedBuilder()
            .setColor(success ? '#00FF00' : '#FF0000')
            .setTitle('🔫 Crime')
            .setDescription(result)
            .addFields(
                { name: 'Balance', value: `${user.coins.toLocaleString()} coins`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async rob(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        if (user.isOnCooldown('rob')) {
            return interaction.editReply('⏰ You recently robbed someone! Wait 5 minutes.');
        }

        const target = interaction.options.getUser('target');
        if (target.bot) return interaction.editReply('❌ You cannot rob a bot!');
        if (target.id === interaction.user.id) return interaction.editReply('❌ You cannot rob yourself!');

        const targetUser = await User.findOne({ userId: target.id });
        if (!targetUser) return interaction.editReply('❌ This user has no account!');
        if (targetUser.coins < 100) return interaction.editReply('❌ This user is too poor to rob!');

        const success = Math.random() > 0.5;
        let result = '';
        let amount = 0;

        if (success) {
            amount = Math.floor(Math.random() * Math.min(targetUser.coins, 1000));
            user.addCoins(amount);
            targetUser.removeCoins(amount);
            result = `🎉 You successfully robbed ${target.username} for **${amount}** coins!`;
        } else {
            const penalty = Math.floor(Math.random() * 300) + 100;
            user.removeCoins(Math.min(penalty, user.coins));
            result = `🚨 You got caught robbing ${target.username}! You lost **${Math.min(penalty, user.coins)}** coins!`;
        }

        user.cooldowns.rob = new Date();
        await user.save();
        await targetUser.save();

        const embed = new EmbedBuilder()
            .setColor(success ? '#00FF00' : '#FF0000')
            .setTitle('🔫 Robbery')
            .setDescription(result)
            .addFields(
                { name: 'Your Balance', value: `${user.coins.toLocaleString()} coins`, inline: true },
                { name: `${target.username}'s Balance`, value: `${targetUser.coins.toLocaleString()} coins`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async bank(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        const action = interaction.options.getString('action');
        const amount = interaction.options.getInteger('amount');

        switch (action) {
            case 'balance': {
                const embed = new EmbedBuilder()
                    .setColor('#3498DB')
                    .setTitle('🏦 Bank Balance')
                    .addFields(
                        { name: 'Balance', value: `${user.bank.toLocaleString()} coins`, inline: true },
                        { name: 'Capacity', value: `${user.bankCapacity.toLocaleString()} coins`, inline: true },
                        { name: 'Interest Rate', value: `${(parseFloat(process.env.INTEREST_RATE) || 0.02) * 100}%`, inline: true }
                    )
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            case 'deposit': {
                if (!amount) return interaction.editReply('❌ Please specify an amount!');
                if (amount > user.coins) return interaction.editReply(`❌ You only have ${user.coins} coins!`);
                if (user.bank + amount > user.bankCapacity) {
                    return interaction.editReply(`❌ Bank capacity exceeded! Capacity: ${user.bankCapacity}`);
                }

                user.coins -= amount;
                user.bank += amount;
                await user.save();

                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('💰 Deposit')
                    .setDescription(`Deposited **${amount.toLocaleString()}** coins to your bank!`)
                    .addFields(
                        { name: 'Bank Balance', value: `${user.bank.toLocaleString()} coins`, inline: true },
                        { name: 'Wallet', value: `${user.coins.toLocaleString()} coins`, inline: true }
                    )
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            case 'withdraw': {
                if (!amount) return interaction.editReply('❌ Please specify an amount!');
                if (amount > user.bank) return interaction.editReply(`❌ You only have ${user.bank} coins in the bank!`);

                user.bank -= amount;
                user.coins += amount;
                await user.save();

                const embed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('🏦 Withdraw')
                    .setDescription(`Withdrew **${amount.toLocaleString()}** coins from your bank!`)
                    .addFields(
                        { name: 'Bank Balance', value: `${user.bank.toLocaleString()} coins`, inline: true },
                        { name: 'Wallet', value: `${user.coins.toLocaleString()} coins`, inline: true }
                    )
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }
        }
    },

    async balance(interaction) {
        await interaction.deferReply();
        const target = interaction.options.getUser('user') || interaction.user;
        const user = await User.findOne({ userId: target.id });

        if (!user) {
            return interaction.editReply(`❌ ${target.username} has no account!`);
        }

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle(`💰 ${target.username}'s Balance`)
            .addFields(
                { name: 'Wallet', value: `${user.coins.toLocaleString()} coins`, inline: true },
                { name: 'Bank', value: `${user.bank.toLocaleString()} coins`, inline: true },
                { name: 'Total', value: `${(user.coins + user.bank).toLocaleString()} coins`, inline: true },
                { name: 'Gems', value: `${user.gems} 💎`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async shop(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        const category = interaction.options.getString('category') || 'all';
        
        // Shop items definition
        const shopItems = {
            weapons: [
                { name: 'Wooden Sword', price: 1000, rarity: 'Common' },
                { name: 'Iron Sword', price: 5000, rarity: 'Uncommon' },
                { name: 'Steel Sword', price: 15000, rarity: 'Rare' },
                { name: 'Diamond Sword', price: 50000, rarity: 'Epic' },
                { name: 'Legendary Blade', price: 200000, rarity: 'Legendary' }
            ],
            armor: [
                { name: 'Leather Armor', price: 2000, rarity: 'Common' },
                { name: 'Iron Armor', price: 8000, rarity: 'Uncommon' },
                { name: 'Steel Armor', price: 20000, rarity: 'Rare' },
                { name: 'Diamond Armor', price: 60000, rarity: 'Epic' },
                { name: 'Legendary Armor', price: 250000, rarity: 'Legendary' }
            ],
            potions: [
                { name: 'Small HP Potion', price: 100, rarity: 'Common' },
                { name: 'Medium HP Potion', price: 500, rarity: 'Uncommon' },
                { name: 'Large HP Potion', price: 2000, rarity: 'Rare' },
                { name: 'Mana Potion', price: 300, rarity: 'Common' },
                { name: 'Stamina Potion', price: 500, rarity: 'Uncommon' }
            ],
            special: [
                { name: 'Lucky Charm', price: 10000, rarity: 'Rare' },
                { name: 'Exp Boost', price: 25000, rarity: 'Epic' },
                { name: 'Coin Magnet', price: 15000, rarity: 'Rare' },
                { name: 'Mystery Box', price: 5000, rarity: 'Epic' }
            ]
        };

        let items = [];
        if (category === 'all') {
            for (const cat of Object.values(shopItems)) {
                items = items.concat(cat);
            }
        } else {
            items = shopItems[category] || [];
        }

        if (items.length === 0) {
            return interaction.editReply('❌ No items found in this category!');
        }

        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('🏪 Shop')
            .setDescription(`Category: ${category}\nUse \`/economy buy [item]\` to purchase!`);

        items.forEach(item => {
            const rarityEmoji = item.rarity === 'Common' ? '⬜' :
                               item.rarity === 'Uncommon' ? '🟩' :
                               item.rarity === 'Rare' ? '🟦' :
                               item.rarity === 'Epic' ? '🟪' : '🟧';
            embed.addFields({
                name: `${rarityEmoji} ${item.name}`,
                value: `💰 ${item.price.toLocaleString()} coins (${item.rarity})`,
                inline: true
            });
        });

        embed.setTimestamp();
        await interaction.editReply({ embeds: [embed] });
    },

    async buy(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        const itemName = interaction.options.getString('item');
        const quantity = interaction.options.getInteger('quantity') || 1;

        // Shop items definition (same as above)
        const shopItems = {
            weapons: [
                { name: 'Wooden Sword', price: 1000, rarity: 'Common' },
                { name: 'Iron Sword', price: 5000, rarity: 'Uncommon' },
                { name: 'Steel Sword', price: 15000, rarity: 'Rare' },
                { name: 'Diamond Sword', price: 50000, rarity: 'Epic' },
                { name: 'Legendary Blade', price: 200000, rarity: 'Legendary' }
            ],
            armor: [
                { name: 'Leather Armor', price: 2000, rarity: 'Common' },
                { name: 'Iron Armor', price: 8000, rarity: 'Uncommon' },
                { name: 'Steel Armor', price: 20000, rarity: 'Rare' },
                { name: 'Diamond Armor', price: 60000, rarity: 'Epic' },
                { name: 'Legendary Armor', price: 250000, rarity: 'Legendary' }
            ],
            potions: [
                { name: 'Small HP Potion', price: 100, rarity: 'Common' },
                { name: 'Medium HP Potion', price: 500, rarity: 'Uncommon' },
                { name: 'Large HP Potion', price: 2000, rarity: 'Rare' },
                { name: 'Mana Potion', price: 300, rarity: 'Common' },
                { name: 'Stamina Potion', price: 500, rarity: 'Uncommon' }
            ],
            special: [
                { name: 'Lucky Charm', price: 10000, rarity: 'Rare' },
                { name: 'Exp Boost', price: 25000, rarity: 'Epic' },
                { name: 'Coin Magnet', price: 15000, rarity: 'Rare' },
                { name: 'Mystery Box', price: 5000, rarity: 'Epic' }
            ]
        };

        // Find item
        let item = null;
        let itemCategory = null;
        for (const [category, items] of Object.entries(shopItems)) {
            const found = items.find(i => i.name.toLowerCase() === itemName.toLowerCase());
            if (found) {
                item = found;
                itemCategory = category;
                break;
            }
        }

        if (!item) {
            return interaction.editReply(`❌ Item "${itemName}" not found in shop!`);
        }

        const totalPrice = item.price * quantity;
        if (user.coins < totalPrice) {
            return interaction.editReply(`❌ You need ${totalPrice.toLocaleString()} coins! You have ${user.coins.toLocaleString()}.`);
        }

        user.removeCoins(totalPrice);
        
        // Add to inventory
        const existingItem = user.inventory.find(i => i.name === item.name);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            user.inventory.push({
                name: item.name,
                type: itemCategory.slice(0, -1),
                rarity: item.rarity,
                quantity: quantity,
                price: item.price
            });
        }

        await user.save();

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Purchase Successful')
            .setDescription(`You bought **${quantity}x ${item.name}** for **${totalPrice.toLocaleString()}** coins!`)
            .addFields(
                { name: 'Rarity', value: item.rarity, inline: true },
                { name: 'New Balance', value: `${user.coins.toLocaleString()} coins`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        logger.info(`Purchase: ${interaction.user.tag} bought ${quantity}x ${item.name} for ${totalPrice} coins`);
    }
};
