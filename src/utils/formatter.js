class Formatter {
    static formatNumber(num) {
        if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        return num.toString();
    }

    static formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    static formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static formatProgressBar(current, max, length = 20) {
        const filled = Math.round((current / max) * length);
        const empty = length - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }

    static formatRarity(rarity) {
        const colors = {
            'Common': '⬜',
            'Uncommon': '🟩',
            'Rare': '🟦',
            'Epic': '🟪',
            'Legendary': '🟧',
            'Mythic': '🔴',
            'Ancient': '🌟'
        };
        return colors[rarity] || '⬜';
    }

    static formatStat(stat, value) {
        const icons = {
            hp: '❤️',
            atk: '⚔️',
            def: '🛡️',
            crit: '🎯',
            dodge: '💨',
            mana: '💙',
            stamina: '⚡',
            energy: '🔋'
        };
        return `${icons[stat] || '📊'} ${stat.toUpperCase()}: ${value}`;
    }

    static truncate(str, length = 50) {
        if (str.length <= length) return str;
        return str.slice(0, length) + '...';
    }

    static capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    static pluralize(count, singular, plural = null) {
        if (count === 1) return singular;
        return plural || singular + 's';
    }
}

module.exports = { Formatter };
