const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const User = require('../models/User');
const { generateMonster } = require('../systems/battleSystem');
const { logger } = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('battle')
        .setDescription('Battle system commands')
        .addSubcommand(sub => sub
            .setName('pve')
            .setDescription('Fight a monster')
            .addIntegerOption(opt => opt.setName('level').setDescription('Monster level').setMinValue(1).setMaxValue(50)))
        .addSubcommand(sub => sub
            .setName('pvp')
            .setDescription('Challenge another player to PvP')
            .addUserOption(opt => opt.setName('opponent').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('boss')
            .setDescription('Fight a boss monster'))
        .addSubcommand(sub => sub
            .setName('dungeon')
            .setDescription('Enter a dungeon'))
        .addSubcommand(sub => sub
            .setName('arena')
            .setDescription('Enter the arena')),

    cooldown: 10,

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'pve': return this.pve(interaction, client);
            case 'pvp': return this.pvp(interaction, client);
            case 'boss': return this.boss(interaction, client);
            case 'dungeon': return this.dungeon(interaction, client);
            case 'arena': return this.arena(interaction, client);
            default: return interaction.reply('❌ Unknown battle mode!');
        }
    },

    async pve(interaction, client) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        if (user.stats.stamina < 20) {
            return interaction.editReply('❌ Not enough stamina! Need 20 stamina.');
        }

        const level = interaction.options.getInteger('level') || Math.max(1, user.level - 2);
        const monster = generateMonster(level);
        
        user.stats.stamina -= 20;
        const battle = {
            user: user,
            monster: monster,
            round: 0,
            finished: false,
            log: []
        };

        const battleId = `battle_${interaction.user.id}`;
        client.battles.set(battleId, battle);

        const embed = this.createBattleEmbed(interaction.user, monster, battle);
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId(`battle_attack`).setLabel('⚔️ Attack').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`battle_defend`).setLabel('🛡️ Defend').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`battle_heal`).setLabel('💚 Heal').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`battle_flee`).setLabel('🏃 Flee').setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({ embeds: [embed], components: [row] });
        logger.info(`Battle started: ${interaction.user.tag} vs ${monster.name}`);
    },

    createBattleEmbed(user, monster, battle) {
        return new EmbedBuilder()
            .setColor('#FF4444')
            .setTitle('⚔️ Battle!')
            .setDescription(`Round ${battle.round + 1}`)
            .addFields(
                {
                    name: `👤 ${user.username}`,
                    value: `HP: ${user.stats.hp}/${user.stats.maxHp}\nATK: ${user.stats.atk}\nDEF: ${user.stats.def}`,
                    inline: true
                },
                {
                    name: `👾 ${monster.name}`,
                    value: `HP: ${monster.stats.hp}/${monster.stats.maxHp}\nATK: ${monster.stats.atk}\nDEF: ${monster.stats.def}`,
                    inline: true
                }
            )
            .setFooter({ text: `Level ${monster.level} | Click a button to act!` })
            .setTimestamp();
    },

    async pvp(interaction, client) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        const opponentUser = interaction.options.getUser('opponent');
        if (opponentUser.bot) return interaction.editReply('❌ Cannot fight bots!');

        const opponent = await User.findOne({ userId: opponentUser.id });
        if (!opponent) return interaction.editReply('❌ Opponent has no account!');

        if (opponent.userId === interaction.user.id) {
            return interaction.editReply('❌ You cannot fight yourself!');
        }

        // Simple PvP logic
        const userAtk = user.stats.atk + Math.floor(Math.random() * 10);
        const opponentAtk = opponent.stats.atk + Math.floor(Math.random() * 10);

        let result = '';
        let winner = null;

        if (userAtk > opponentAtk) {
            result = `${interaction.user.username} wins!`;
            winner = user;
            user.pvp.wins++;
            opponent.pvp.losses++;
            user.addCoins(500);
        } else if (opponentAtk > userAtk) {
            result = `${opponentUser.username} wins!`;
            winner = opponent;
            opponent.pvp.wins++;
            user.pvp.losses++;
            opponent.addCoins(500);
        } else {
            result = 'It\'s a draw!';
            user.pvp.draws++;
            opponent.pvp.draws++;
        }

        await user.save();
        await opponent.save();

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('⚔️ PvP Battle!')
            .setDescription(result)
            .addFields(
                { name: interaction.user.username, value: `ATK: ${userAtk}`, inline: true },
                { name: opponentUser.username, value: `ATK: ${opponentAtk}`, inline: true },
                { name: 'Winner', value: winner ? winner.username : 'Draw', inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async boss(interaction, client) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        if (user.stats.stamina < 30) {
            return interaction.editReply('❌ Need 30 stamina for boss fight!');
        }

        // Generate boss
        const boss = generateMonster(Math.max(1, user.level + 5), true);
        user.stats.stamina -= 30;

        // Simple boss battle
        const userDamage = Math.max(1, user.stats.atk - boss.stats.def / 2);
        const bossDamage = Math.max(1, boss.stats.atk - user.stats.def / 2);

        const userHits = Math.ceil(boss.stats.hp / userDamage);
        const bossHits = Math.ceil(user.stats.hp / bossDamage);

        let result = '';
        let rewards = null;

        if (userHits <= bossHits) {
            result = `🎉 You defeated ${boss.name}!`;
            const expReward = Math.floor(boss.stats.exp * 2);
            const coinReward = Math.floor(boss.stats.coins * 3);
            user.addExp(expReward);
            user.addCoins(coinReward);
            user.statistics.totalBossKills++;
            rewards = { exp: expReward, coins: coinReward };
        } else {
            result = `💔 ${boss.name} defeated you!`;
            user.stats.hp = Math.floor(user.stats.hp / 2);
        }

        await user.save();

        const embed = new EmbedBuilder()
            .setColor(result.includes('defeated') ? '#00FF00' : '#FF0000')
            .setTitle('👹 Boss Battle!')
            .setDescription(result)
            .addFields(
                { name: 'Boss', value: `${boss.name} (Lv.${boss.level})`, inline: true },
                { name: 'Your Damage', value: `${userDamage}`, inline: true },
                { name: 'Boss Damage', value: `${bossDamage}`, inline: true }
            );

        if (rewards) {
            embed.addFields(
                { name: '✨ EXP', value: `+${rewards.exp}`, inline: true },
                { name: '💰 Coins', value: `+${rewards.coins}`, inline: true }
            );
        }

        embed.setTimestamp();
        await interaction.editReply({ embeds: [embed] });
    },

    async dungeon(interaction, client) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        if (user.stats.stamina < 50) {
            return interaction.editReply('❌ Need 50 stamina for dungeon!');
        }

        user.stats.stamina -= 50;
        
        // Generate dungeon waves
        const waves = [];
        const waveCount = Math.floor(Math.random() * 3) + 3;
        
        for (let i = 0; i < waveCount; i++) {
            waves.push(generateMonster(user.level + i));
        }

        let totalExp = 0;
        let totalCoins = 0;
        let cleared = true;

        for (const monster of waves) {
            const userDamage = Math.max(1, user.stats.atk - monster.stats.def / 2);
            const monsterDamage = Math.max(1, monster.stats.atk - user.stats.def / 2);
            
            const userHits = Math.ceil(monster.stats.hp / userDamage);
            const monsterHits = Math.ceil(user.stats.hp / monsterDamage);
            
            if (userHits > monsterHits) {
                cleared = false;
                break;
            }
            
            totalExp += Math.floor(monster.stats.exp * 1.5);
            totalCoins += Math.floor(monster.stats.coins * 2);
        }

        if (cleared) {
            user.addExp(totalExp);
            user.addCoins(totalCoins);
            user.statistics.totalDungeons++;
            await user.save();

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🏛️ Dungeon Cleared!')
                .setDescription(`You cleared ${waveCount} waves!`)
                .addFields(
                    { name: '✨ EXP', value: `+${totalExp}`, inline: true },
                    { name: '💰 Coins', value: `+${totalCoins}`, inline: true },
                    { name: 'Waves', value: `${waveCount}`, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } else {
            await user.save();
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('💔 Dungeon Failed')
                .setDescription('You were defeated in the dungeon!')
                .addFields(
                    { name: 'Waves Cleared', value: `${Math.floor(waveCount / 2)}/${waveCount}`, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        }
    },

    async arena(interaction, client) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        if (user.stats.stamina < 25) {
            return interaction.editReply('❌ Need 25 stamina for arena!');
        }

        user.stats.stamina -= 25;
        
        // Arena matchmaking - find random opponent from users
        const opponents = await User.find({
            userId: { $ne: interaction.user.id },
            'pvp.elo': { $exists: true }
        }).limit(10);

        if (opponents.length === 0) {
            return interaction.editReply('❌ No opponents found in arena!');
        }

        const opponent = opponents[Math.floor(Math.random() * opponents.length)];
        const opponentUser = await client.users.fetch(opponent.userId);

        // Calculate battle
        const userAtk = user.stats.atk + user.stats.crit * 0.5;
        const opponentAtk = opponent.stats.atk + opponent.stats.crit * 0.5;
        
        const userDef = user.stats.def;
        const opponentDef = opponent.stats.def;

        let userDamage = Math.max(1, userAtk - opponentDef / 2);
        let opponentDamage = Math.max(1, opponentAtk - userDef / 2);

        // Add randomness
        userDamage *= (0.8 + Math.random() * 0.4);
        opponentDamage *= (0.8 + Math.random() * 0.4);

        userDamage = Math.floor(userDamage);
        opponentDamage = Math.floor(opponentDamage);

        const userHits = Math.ceil(user.stats.hp / opponentDamage);
        const opponentHits = Math.ceil(opponent.stats.hp / userDamage);

        let result = '';
        let eloChange = 0;

        if (userHits <= opponentHits) {
            result = `🎉 ${interaction.user.username} wins the arena battle!`;
            user.pvp.wins++;
            opponent.pvp.losses++;
            eloChange = 25;
            user.pvp.elo += eloChange;
            opponent.pvp.elo = Math.max(0, opponent.pvp.elo - eloChange);
            user.addCoins(1000);
        } else if (opponentHits < userHits) {
            result = `💔 ${opponentUser.username} wins the arena battle!`;
            user.pvp.losses++;
            opponent.pvp.wins++;
            eloChange = 25;
            opponent.pvp.elo += eloChange;
            user.pvp.elo = Math.max(0, user.pvp.elo - eloChange);
            opponent.addCoins(1000);
        } else {
            result = '⚔️ It\'s a draw!';
            user.pvp.draws++;
            opponent.pvp.draws++;
        }

        await user.save();
        await opponent.save();

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏟️ Arena Battle')
            .setDescription(result)
            .addFields(
                { name: interaction.user.username, value: `HP: ${user.stats.hp}\nATK: ${userDamage}`, inline: true },
                { name: opponentUser.username, value: `HP: ${opponent.stats.hp}\nATK: ${opponentDamage}`, inline: true },
                { name: 'ELO Change', value: `${eloChange > 0 ? '+' : ''}${eloChange}`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};
