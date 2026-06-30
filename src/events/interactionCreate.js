const { logger } = require('../utils/logger');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        try {
            if (interaction.isCommand()) {
                await client.commandHandler.handleInteraction(interaction);
                return;
            }

            if (interaction.isButton()) {
                await handleButtonInteraction(interaction, client);
                return;
            }

            if (interaction.isAnySelectMenu()) {
                await handleSelectMenuInteraction(interaction, client);
                return;
            }

            if (interaction.isModalSubmit()) {
                await handleModalInteraction(interaction, client);
                return;
            }

        } catch (error) {
            logger.error('Error handling interaction:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred while processing your interaction!',
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
};

async function handleButtonInteraction(interaction, client) {
    const [action, ...params] = interaction.customId.split('-');
    
    switch (action) {
        case 'battle':
            await handleBattleButton(interaction, client, params);
            break;
        case 'game':
            await handleGameButton(interaction, client, params);
            break;
        case 'shop':
            await handleShopButton(interaction, client, params);
            break;
        default:
            await interaction.reply({
                content: 'Unknown button action!',
                ephemeral: true
            });
    }
}

async function handleBattleButton(interaction, client, params) {
    const action = params[0];
    const battleId = `battle_${interaction.user.id}`;
    const battle = client.battles.get(battleId);

    if (!battle) {
        return interaction.reply({
            content: '❌ No active battle found!',
            ephemeral: true
        });
    }

    if (battle.finished) {
        return interaction.reply({
            content: '❌ This battle has already ended!',
            ephemeral: true
        });
    }

    const { BattleSystem } = require('../systems/battleSystem');
    const battleSystem = new BattleSystem();

    let result;
    switch (action) {
        case 'attack':
            result = await battleSystem.processTurn(battle, 'attack');
            break;
        case 'defend':
            result = await battleSystem.processTurn(battle, 'defend');
            break;
        case 'heal':
            result = await battleSystem.processTurn(battle, 'heal');
            break;
        case 'flee':
            result = await battleSystem.processTurn(battle, 'flee');
            break;
        default:
            return interaction.reply({
                content: 'Invalid battle action!',
                ephemeral: true
            });
    }

    // Update battle state
    battle.log.push({
        round: battle.round,
        action: action,
        result: result
    });

    if (battle.finished) {
        client.battles.delete(battleId);
        const rewards = battleSystem.getRewards(battle);
        if (rewards) {
            const user = battle.user;
            user.addExp(rewards.exp);
            user.addCoins(rewards.coins);
            await user.save();
            
            await interaction.update({
                content: `🏆 Battle Won! You earned ${rewards.exp} EXP and ${rewards.coins} coins!`,
                components: []
            });
        } else {
            await interaction.update({
                content: '💔 You lost the battle!',
                components: []
            });
        }
    } else {
        // Update the battle embed
        const { EmbedBuilder } = require('discord.js');
        const embed = new EmbedBuilder()
            .setColor('#FF4444')
            .setTitle('⚔️ Battle!')
            .setDescription(`Round ${battle.round}`)
            .addFields(
                {
                    name: `👤 ${interaction.user.username}`,
                    value: `HP: ${battle.user.stats.hp}/${battle.user.stats.maxHp}\nATK: ${battle.user.stats.atk}`,
                    inline: true
                },
                {
                    name: `👾 ${battle.monster.name}`,
                    value: `HP: ${battle.monster.stats.hp}/${battle.monster.stats.maxHp}\nATK: ${battle.monster.stats.atk}`,
                    inline: true
                }
            )
            .addFields({
                name: '📝 Action',
                value: result.message || 'Turn processed!',
                inline: false
            })
            .setTimestamp();

        await interaction.update({ embeds: [embed] });
    }
}

async function handleGameButton(interaction, client, params) {
    // Handle game buttons
    await interaction.reply({
        content: 'Game button handled!',
        ephemeral: true
    });
}

async function handleShopButton(interaction, client, params) {
    // Handle shop buttons
    await interaction.reply({
        content: 'Shop button handled!',
        ephemeral: true
    });
}

async function handleSelectMenuInteraction(interaction, client) {
    const [action, ...params] = interaction.customId.split('-');
    
    switch (action) {
        case 'shop':
            await handleShopMenu(interaction, client, params);
            break;
        default:
            await interaction.reply({
                content: 'Unknown menu action!',
                ephemeral: true
            });
    }
}

async function handleShopMenu(interaction, client, params) {
    // Handle shop menus
    await interaction.reply({
        content: 'Shop menu handled!',
        ephemeral: true
    });
}

async function handleModalInteraction(interaction, client) {
    const [action, ...params] = interaction.customId.split('-');
    
    switch (action) {
        case 'trade':
            await handleTradeModal(interaction, client, params);
            break;
        default:
            await interaction.reply({
                content: 'Unknown modal action!',
                ephemeral: true
            });
    }
}

async function handleTradeModal(interaction, client, params) {
    // Handle trade modals
    await interaction.reply({
        content: 'Trade modal handled!',
        ephemeral: true
    });
}
