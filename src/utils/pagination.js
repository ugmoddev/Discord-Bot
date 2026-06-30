const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

class Pagination {
    constructor() {
        this.pages = new Map();
    }

    createPaginationEmbed(interaction, items, itemsPerPage, embedBuilder, options = {}) {
        const totalPages = Math.ceil(items.length / itemsPerPage);
        const page = options.page || 0;
        
        const embed = embedBuilder(items, page, itemsPerPage);
        embed.setFooter({ 
            text: `Page ${page + 1}/${totalPages} | ${options.footer || ''}` 
        });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`pagination_prev_${Date.now()}`)
                    .setLabel('◀️ Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId(`pagination_next_${Date.now()}`)
                    .setLabel('Next ▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === totalPages - 1)
            );

        return { embeds: [embed], components: [row] };
    }

    async handlePagination(interaction, customId) {
        const [action, ...params] = customId.split('_');
        // Handle pagination logic
    }
}

module.exports = { Pagination };
