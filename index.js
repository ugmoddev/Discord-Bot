// ==========================================
// DISCORD GAME BOT - PHIÊN BẢN CÓ ADMIN
// ==========================================

const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    Events,
    Partials,
    PermissionsBitField
} = require('discord.js');

// ==========================================
// 1. CẤU HÌNH BOT
// ==========================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.GuildMember
    ]
});

const PREFIX = '!';
const COLORS = {
    SUCCESS: 0x00FF00,
    ERROR: 0xFF0000,
    WARNING: 0xFFA500,
    INFO: 0x00BFFF,
    GAME: 0x9B59B6,
    DICE: 0x3498DB,
    TIE: 0xFFFF00,
    RARE: 0xFFD700,
    HORROR: 0x8B0000,
    MONEY: 0x2ECC71,
    ADMIN: 0xE74C3C
};

// ==========================================
// 2. HỆ THỐNG ADMIN
// ==========================================

const ADMIN_IDS = [
    '1316027180433801296', // Admin chính
    // Thêm các ID admin khác vào đây nếu cần
];

const ADMIN_PERMISSIONS = {
    GIVE_MONEY: 'give_money',
    REMOVE_MONEY: 'remove_money',
    SET_MONEY: 'set_money',
    RESET_GAME: 'reset_game',
    CLEAR_DATA: 'clear_data',
    BROADCAST: 'broadcast',
    SHUTDOWN: 'shutdown'
};

function isAdmin(userId) {
    return ADMIN_IDS.includes(userId);
}

function hasPermission(userId, permission) {
    if (!isAdmin(userId)) return false;
    return true; // Admin có toàn quyền
}

// ==========================================
// 3. HỆ THỐNG TIỀN TỆ
// ==========================================

const userBalances = new Map();
const dailyCooldown = new Map();

const CURRENCY = {
    name: 'Xu',
    icon: '🪙',
    symbol: '💰'
};

const REWARDS = {
    guess: { win: 100, lose: 10 },
    dice: { win: 50, lose: 0 },
    rps: { win: 75, lose: 5 },
    tictactoe: { win: 150, lose: 15 },
    hangman: { win: 200, lose: 20 },
    trivia: { win: 120, lose: 0 },
    blackjack: { win: 300, lose: 50 },
    memory: { win: 250, lose: 25 },
    daily: 500
};

// ==========================================
// 4. HÀM QUẢN LÝ TIỀN TỆ
// ==========================================

function getBalance(userId) {
    return userBalances.get(userId) || 0;
}

function addMoney(userId, amount) {
    const current = getBalance(userId);
    const newBalance = Math.max(0, current + amount);
    userBalances.set(userId, newBalance);
    return newBalance;
}

function removeMoney(userId, amount) {
    const current = getBalance(userId);
    if (current < amount) return false;
    userBalances.set(userId, current - amount);
    return true;
}

function setMoney(userId, amount) {
    if (amount < 0) return false;
    userBalances.set(userId, amount);
    return true;
}

function canClaimDaily(userId) {
    const lastClaim = dailyCooldown.get(userId);
    if (!lastClaim) return true;
    const hoursSince = (Date.now() - lastClaim) / (1000 * 60 * 60);
    return hoursSince >= 24;
}

function getDailyCooldown(userId) {
    const lastClaim = dailyCooldown.get(userId);
    if (!lastClaim) return 0;
    const hoursSince = (Date.now() - lastClaim) / (1000 * 60 * 60);
    return Math.max(0, 24 - hoursSince);
}

// ==========================================
// 5. LƯU TRỮ DỮ LIỆU GAME
// ==========================================

const gameStates = new Map();
const ticTacToeGames = new Map();
const hangmanGames = new Map();
const triviaGames = new Map();
const blackjackGames = new Map();
const memoryGames = new Map();

// ==========================================
// 6. CLASS GAME ĐOÁN SỐ
// ==========================================

class GuessGame {
    constructor() {
        this.number = Math.floor(Math.random() * 100) + 1;
        this.attempts = 0;
        this.guessed = false;
        this.startTime = Date.now();
        this.bet = 0;
    }

    makeGuess(guess) {
        this.attempts++;
        if (guess === this.number) {
            this.guessed = true;
            return { 
                result: 'win', 
                message: `🎉 **CHÍNH XÁC!** Số là ${this.number}\nBạn đã đoán đúng sau ${this.attempts} lần thử! 🏆`,
                color: COLORS.SUCCESS
            };
        } else if (guess < this.number) {
            return { 
                result: 'low', 
                message: `📈 Số ${guess} **NHỎ HƠN** số tôi nghĩ. (Lần thử #${this.attempts})`,
                color: COLORS.WARNING
            };
        } else {
            return { 
                result: 'high', 
                message: `📉 Số ${guess} **LỚN HƠN** số tôi nghĩ. (Lần thử #${this.attempts})`,
                color: COLORS.WARNING
            };
        }
    }

    getStats() {
        const timeElapsed = Math.floor((Date.now() - this.startTime) / 1000);
        return `⏱️ Thời gian: ${timeElapsed}s | 📊 Số lần thử: ${this.attempts}`;
    }
}

// ==========================================
// 7. CLASS TICTACTOE
// ==========================================

class TicTacToe {
    constructor() {
        this.board = Array(9).fill(' ');
        this.turn = 'player';
        this.moves = 0;
        this.bet = 0;
    }

    makeMove(index, player) {
        if (this.board[index] !== ' ') return false;
        if (player !== this.turn) return false;
        
        this.board[index] = player === 'player' ? 'X' : 'O';
        this.moves++;
        this.turn = this.turn === 'player' ? 'bot' : 'player';
        return true;
    }

    checkWinner() {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];

        for (const line of lines) {
            const [a, b, c] = line;
            if (this.board[a] !== ' ' && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
                return this.board[a];
            }
        }
        return null;
    }

    isFull() {
        return this.moves === 9;
    }

    getEmptyCells() {
        return this.board.map((cell, i) => cell === ' ' ? i : null).filter(i => i !== null);
    }

    botMove() {
        const empty = this.getEmptyCells();
        if (empty.length === 0) return -1;
        
        if (empty.includes(4)) return 4;
        
        return empty[Math.floor(Math.random() * empty.length)];
    }
}

// ==========================================
// 8. CLASS HANGMAN
// ==========================================

class HangmanGame {
    constructor() {
        const words = [
            'python', 'javascript', 'discord', 'bot', 'game', 
            'developer', 'programming', 'computer', 'internet',
            'server', 'database', 'website', 'cloud', 'ai',
            'machine', 'learning', 'coding', 'hack', 'cyber',
            'gaming', 'streaming', 'vietnam', 'hello', 'world'
        ];
        this.word = words[Math.floor(Math.random() * words.length)];
        this.guessed = new Set();
        this.attempts = 6;
        this.maxAttempts = 6;
        this.bet = 0;
    }

    guessLetter(letter) {
        letter = letter.toLowerCase();
        if (this.guessed.has(letter)) {
            return { result: 'repeat', message: `⚠️ Bạn đã đoán chữ '${letter}' rồi!` };
        }

        this.guessed.add(letter);
        
        if (this.word.includes(letter)) {
            const display = this.getDisplay();
            if (!display.includes('_')) {
                return { result: 'win', message: `🎉 **CHÍNH XÁC!** Từ là **${this.word}**! Bạn đã thắng! 🏆` };
            }
            return { result: 'correct', message: `✅ Đúng! Chữ '${letter}' có trong từ.\nTừ: ${display}` };
        } else {
            this.attempts--;
            if (this.attempts === 0) {
                return { result: 'lose', message: `💀 **Bạn đã thua!** Từ là **${this.word}**. Lần sau may mắn hơn nhé!` };
            }
            return { result: 'wrong', message: `❌ Sai! Chữ '${letter}' không có trong từ.\nCòn ${this.attempts}/${this.maxAttempts} lượt thử.\nTừ: ${this.getDisplay()}` };
        }
    }

    getDisplay() {
        return this.word.split('').map(char => this.guessed.has(char) ? char : '_').join(' ');
    }

    getHangman() {
        const stages = [
            `
            +---+
            |   |
                |
                |
                |
                |
            =========`,
            `
            +---+
            |   |
            O   |
                |
                |
                |
            =========`,
            `
            +---+
            |   |
            O   |
            |   |
                |
                |
            =========`,
            `
            +---+
            |   |
            O   |
           /|   |
                |
                |
            =========`,
            `
            +---+
            |   |
            O   |
           /|\\  |
                |
                |
            =========`,
            `
            +---+
            |   |
            O   |
           /|\\  |
           /    |
                |
            =========`,
            `
            +---+
            |   |
            O   |
           /|\\  |
           / \\  |
                |
            =========`
        ];
        return stages[this.maxAttempts - this.attempts];
    }
}

// ==========================================
// 9. CLASS TRIVIA
// ==========================================

class TriviaGame {
    constructor() {
        this.questions = [
            {
                question: 'Thủ đô của Việt Nam là gì?',
                options: ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Hải Phòng'],
                answer: 0
            },
            {
                question: 'Ngôn ngữ lập trình nào được sử dụng để làm bot Discord?',
                options: ['Python', 'JavaScript', 'Java', 'C++'],
                answer: 1
            },
            {
                question: 'Hành tinh nào gần Mặt Trời nhất?',
                options: ['Sao Kim', 'Sao Thủy', 'Trái Đất', 'Sao Hỏa'],
                answer: 1
            },
            {
                question: '1 năm có bao nhiêu ngày?',
                options: ['365', '366', '364', '360'],
                answer: 0
            },
            {
                question: 'Tháng nào có 31 ngày?',
                options: ['Tháng 2', 'Tháng 4', 'Tháng 6', 'Tháng 1'],
                answer: 3
            },
            {
                question: 'Màu gì là màu của hy vọng ở Việt Nam?',
                options: ['Đỏ', 'Vàng', 'Xanh lá', 'Trắng'],
                answer: 0
            },
            {
                question: 'Phở là món ăn của nước nào?',
                options: ['Trung Quốc', 'Nhật Bản', 'Việt Nam', 'Hàn Quốc'],
                answer: 2
            },
            {
                question: 'Núi nào cao nhất thế giới?',
                options: ['Everest', 'Fuji', 'Phan Xi Păng', 'Kilimanjaro'],
                answer: 0
            }
        ];
        this.current = null;
        this.usedQuestions = [];
        this.bet = 0;
    }

    getQuestion() {
        if (this.usedQuestions.length >= this.questions.length) {
            this.usedQuestions = [];
        }
        
        let available = this.questions.filter((_, i) => !this.usedQuestions.includes(i));
        if (available.length === 0) {
            this.usedQuestions = [];
            available = this.questions;
        }
        
        const randomIndex = Math.floor(Math.random() * available.length);
        const realIndex = this.questions.indexOf(available[randomIndex]);
        this.usedQuestions.push(realIndex);
        this.current = this.questions[realIndex];
        return this.current;
    }

    checkAnswer(option) {
        if (!this.current) return null;
        return option === this.current.answer;
    }
}

// ==========================================
// 10. CLASS BLACKJACK
// ==========================================

class BlackjackGame {
    constructor() {
        this.deck = [];
        this.playerHand = [];
        this.botHand = [];
        this.playerScore = 0;
        this.botScore = 0;
        this.gameOver = false;
        this.bet = 0;
        this.initDeck();
        this.shuffle();
        this.dealCards();
    }

    initDeck() {
        const suits = ['♠', '♥', '♦', '♣'];
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        for (const suit of suits) {
            for (const value of values) {
                this.deck.push({ suit, value });
            }
        }
    }

    shuffle() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    dealCards() {
        this.playerHand.push(this.deck.pop());
        this.botHand.push(this.deck.pop());
        this.playerHand.push(this.deck.pop());
        this.botHand.push(this.deck.pop());
        this.playerScore = this.calculateScore(this.playerHand);
        this.botScore = this.calculateScore(this.botHand);
    }

    calculateScore(hand) {
        let score = 0;
        let aces = 0;
        for (const card of hand) {
            if (card.value === 'A') {
                aces++;
                score += 11;
            } else if (['J', 'Q', 'K'].includes(card.value)) {
                score += 10;
            } else {
                score += parseInt(card.value);
            }
        }
        while (score > 21 && aces > 0) {
            score -= 10;
            aces--;
        }
        return score;
    }

    hit() {
        if (this.gameOver) return null;
        this.playerHand.push(this.deck.pop());
        this.playerScore = this.calculateScore(this.playerHand);
        if (this.playerScore > 21) {
            this.gameOver = true;
            return { result: 'bust', message: '💥 Bạn quá 21 điểm! Bạn thua!' };
        }
        return { result: 'hit', message: `✅ Bạn rút được ${this.playerHand[this.playerHand.length-1].value}${this.playerHand[this.playerHand.length-1].suit}\nĐiểm của bạn: ${this.playerScore}` };
    }

    stand() {
        this.gameOver = true;
        while (this.botScore < 17) {
            this.botHand.push(this.deck.pop());
            this.botScore = this.calculateScore(this.botHand);
        }
        
        if (this.botScore > 21) {
            return { result: 'win', message: `🎉 Bot quá 21 điểm! Bạn thắng!\nĐiểm bạn: ${this.playerScore} | Bot: ${this.botScore}` };
        } else if (this.playerScore > this.botScore) {
            return { result: 'win', message: `🎉 Bạn thắng!\nĐiểm bạn: ${this.playerScore} | Bot: ${this.botScore}` };
        } else if (this.playerScore < this.botScore) {
            return { result: 'lose', message: `😢 Bot thắng!\nĐiểm bạn: ${this.playerScore} | Bot: ${this.botScore}` };
        } else {
            return { result: 'tie', message: `🤝 Hòa!\nĐiểm bạn: ${this.playerScore} | Bot: ${this.botScore}` };
        }
    }

    getDisplay() {
        const playerCards = this.playerHand.map(c => `${c.value}${c.suit}`).join(' ');
        const botCards = this.gameOver ? 
            this.botHand.map(c => `${c.value}${c.suit}`).join(' ') :
            `${this.botHand[0].value}${this.botHand[0].suit} ❓❓`;
        return {
            player: `Bạn: ${playerCards} (${this.playerScore} điểm)`,
            bot: `Bot: ${botCards} (${this.gameOver ? this.botScore : '?'} điểm)`
        };
    }
}

// ==========================================
// 11. CLASS MEMORY
// ==========================================

class MemoryGame {
    constructor() {
        this.emojis = ['🍎', '🍋', '🍇', '🍉', '🍓', '🍑', '🍒', '🥝'];
        this.cards = [...this.emojis, ...this.emojis];
        this.shuffle();
        this.flipped = [];
        this.matched = [];
        this.moves = 0;
        this.gameOver = false;
        this.bet = 0;
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    flip(index) {
        if (this.gameOver) return null;
        if (this.flipped.length >= 2) return null;
        if (this.matched.includes(index)) return null;
        if (this.flipped.includes(index)) return null;
        
        this.flipped.push(index);
        this.moves++;
        
        if (this.flipped.length === 2) {
            const [i1, i2] = this.flipped;
            if (this.cards[i1] === this.cards[i2]) {
                this.matched.push(i1, i2);
                this.flipped = [];
                if (this.matched.length === this.cards.length) {
                    this.gameOver = true;
                    return { result: 'win', message: `🎉 Bạn đã ghép đúng tất cả ${this.emojis.length} cặp sau ${this.moves} lượt!` };
                }
                return { result: 'match', message: '✅ Ghép đúng! Tiếp tục nào!' };
            } else {
                const result = { result: 'nomatch', message: '❌ Không khớp! Thử lại!', cards: [...this.flipped] };
                this.flipped = [];
                return result;
            }
        }
        return { result: 'flip', message: `Đã lật thẻ ${this.cards[index]}` };
    }

    getDisplay() {
        return this.cards.map((emoji, i) => {
            if (this.matched.includes(i)) return '✅';
            if (this.flipped.includes(i)) return emoji;
            return '⬛';
        });
    }
}

// ==========================================
// 12. CLASS SLOT MACHINE
// ==========================================

class SlotGame {
    constructor() {
        this.symbols = ['🍒', '🍋', '🍇', '🍉', '⭐', '💎', '7️⃣'];
        this.result = [];
        this.bet = 0;
    }

    spin() {
        this.result = [];
        for (let i = 0; i < 3; i++) {
            this.result.push(this.symbols[Math.floor(Math.random() * this.symbols.length)]);
        }
        return this.result;
    }

    checkWin() {
        const [a, b, c] = this.result;
        if (a === b && b === c) {
            if (a === '💎') return { win: true, multiplier: 10, message: '💎 **JACKPOT!** 10x' };
            if (a === '7️⃣') return { win: true, multiplier: 5, message: '🎰 **TRÙNG 3!** 5x' };
            return { win: true, multiplier: 3, message: `🎉 Trúng 3 ${a}! 3x` };
        }
        if (a === b || b === c || a === c) {
            return { win: true, multiplier: 1.5, message: `😊 Trúng 2! 1.5x` };
        }
        return { win: false, multiplier: 0, message: '😢 Chúc may mắn lần sau!' };
    }
}

// ==========================================
// 13. HÀM TIỆN ÍCH
// ==========================================

function createEmbed(title, description, color = COLORS.INFO, fields = []) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp()
        .setFooter({ text: '🎮 Game Bot' });

    if (fields.length > 0) {
        embed.addFields(fields);
    }

    return embed;
}

function createTicTacToeBoard(game) {
    const emojis = game.board.map(cell => {
        if (cell === 'X') return '❌';
        if (cell === 'O') return '⭕';
        return '⬜';
    });

    const rows = [];
    for (let i = 0; i < 3; i++) {
        const row = new ActionRowBuilder();
        for (let j = 0; j < 3; j++) {
            const idx = i * 3 + j;
            const isOccupied = game.board[idx] !== ' ';
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`ttt_${idx}`)
                    .setLabel(emojis[idx])
                    .setStyle(isOccupied ? ButtonStyle.Primary : ButtonStyle.Secondary)
                    .setDisabled(isOccupied || game.turn === 'bot')
            );
        }
        rows.push(row);
    }
    return rows;
}

function createMemoryBoard(game) {
    const display = game.getDisplay();
    const rows = [];
    for (let i = 0; i < 4; i++) {
        const row = new ActionRowBuilder();
        for (let j = 0; j < 4; j++) {
            const idx = i * 4 + j;
            const isMatched = game.matched.includes(idx);
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`mem_${idx}`)
                    .setLabel(display[idx])
                    .setStyle(isMatched ? ButtonStyle.Success : ButtonStyle.Secondary)
                    .setDisabled(isMatched || game.flipped.includes(idx))
            );
        }
        rows.push(row);
    }
    return rows;
}

function formatMoney(amount) {
    return `${CURRENCY.icon} ${amount.toLocaleString()} ${CURRENCY.name}`;
}

// ==========================================
// 14. LỆNH ADMIN
// ==========================================

async function handleAdminGiveMoney(message, args) {
    const userId = message.author.id;
    if (!isAdmin(userId)) {
        await message.reply('❌ Bạn không có quyền sử dụng lệnh này!');
        return;
    }

    if (args.length < 2) {
        await message.reply('⚠️ Cách dùng: `!admin give @user <số_xu>`');
        return;
    }

    const target = message.mentions.users.first();
    if (!target) {
        await message.reply('⚠️ Vui lòng tag người cần cộng xu!');
        return;
    }

    const amount = parseInt(args[1]);
    if (isNaN(amount) || amount <= 0) {
        await message.reply('⚠️ Vui lòng nhập số xu hợp lệ!');
        return;
    }

    addMoney(target.id, amount);
    const embed = createEmbed(
        '✅ Admin: Cộng Xu',
        `${CURRENCY.icon} Đã cộng **${amount.toLocaleString()}** ${CURRENCY.name} cho **${target.username}**\nSố dư mới: ${formatMoney(getBalance(target.id))}`,
        COLORS.SUCCESS
    );
    await message.reply({ embeds: [embed] });
}

async function handleAdminRemoveMoney(message, args) {
    const userId = message.author.id;
    if (!isAdmin(userId)) {
        await message.reply('❌ Bạn không có quyền sử dụng lệnh này!');
        return;
    }

    if (args.length < 2) {
        await message.reply('⚠️ Cách dùng: `!admin remove @user <số_xu>`');
        return;
    }

    const target = message.mentions.users.first();
    if (!target) {
        await message.reply('⚠️ Vui lòng tag người cần trừ xu!');
        return;
    }

    const amount = parseInt(args[1]);
    if (isNaN(amount) || amount <= 0) {
        await message.reply('⚠️ Vui lòng nhập số xu hợp lệ!');
        return;
    }

    if (!removeMoney(target.id, amount)) {
        await message.reply(`❌ ${target.username} không có đủ ${CURRENCY.name}!`);
        return;
    }

    const embed = createEmbed(
        '✅ Admin: Trừ Xu',
        `${CURRENCY.icon} Đã trừ **${amount.toLocaleString()}** ${CURRENCY.name} của **${target.username}**\nSố dư mới: ${formatMoney(getBalance(target.id))}`,
        COLORS.WARNING
    );
    await message.reply({ embeds: [embed] });
}

async function handleAdminSetMoney(message, args) {
    const userId = message.author.id;
    if (!isAdmin(userId)) {
        await message.reply('❌ Bạn không có quyền sử dụng lệnh này!');
        return;
    }

    if (args.length < 2) {
        await message.reply('⚠️ Cách dùng: `!admin set @user <số_xu>`');
        return;
    }

    const target = message.mentions.users.first();
    if (!target) {
        await message.reply('⚠️ Vui lòng tag người cần set xu!');
        return;
    }

    const amount = parseInt(args[1]);
    if (isNaN(amount) || amount < 0) {
        await message.reply('⚠️ Vui lòng nhập số xu hợp lệ!');
        return;
    }

    setMoney(target.id, amount);
    const embed = createEmbed(
        '✅ Admin: Set Xu',
        `${CURRENCY.icon} Đã set số dư của **${target.username}** thành ${formatMoney(amount)}`,
        COLORS.ADMIN
    );
    await message.reply({ embeds: [embed] });
}

async function handleAdminBroadcast(message, args) {
    const userId = message.author.id;
    if (!isAdmin(userId)) {
        await message.reply('❌ Bạn không có quyền sử dụng lệnh này!');
        return;
    }

    if (args.length === 0) {
        await message.reply('⚠️ Cách dùng: `!admin broadcast <nội dung>`');
        return;
    }

    const content = args.join(' ');
    const embed = createEmbed(
        '📢 Thông Báo Từ Admin',
        content,
        COLORS.ADMIN
    );
    
    // Gửi đến tất cả server bot đang ở
    for (const guild of client.guilds.cache.values()) {
        try {
            const channel = guild.channels.cache
                .filter(c => c.type === 0) // Text channels
                .first();
            if (channel) {
                await channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error(`Không thể gửi thông báo đến server ${guild.name}:`, error);
        }
    }
    
    await message.reply('✅ Đã gửi thông báo đến tất cả server!');
}

async function handleAdminResetGames(message) {
    const userId = message.author.id;
    if (!isAdmin(userId)) {
        await message.reply('❌ Bạn không có quyền sử dụng lệnh này!');
        return;
    }

    gameStates.clear();
    ticTacToeGames.clear();
    hangmanGames.clear();
    triviaGames.clear();
    blackjackGames.clear();
    memoryGames.clear();

    const embed = createEmbed(
        '✅ Admin: Reset Game',
        'Tất cả game đã được reset!',
        COLORS.SUCCESS
    );
    await message.reply({ embeds: [embed] });
}

async function handleAdminClearData(message) {
    const userId = message.author.id;
    if (!isAdmin(userId)) {
        await message.reply('❌ Bạn không có quyền sử dụng lệnh này!');
        return;
    }

    userBalances.clear();
    dailyCooldown.clear();

    const embed = createEmbed(
        '✅ Admin: Xóa Dữ Liệu',
        'Tất cả dữ liệu tiền tệ đã được xóa!',
        COLORS.WARNING
    );
    await message.reply({ embeds: [embed] });
}

async function handleAdminShutdown(message) {
    const userId = message.author.id;
    if (!isAdmin(userId)) {
        await message.reply('❌ Bạn không có quyền sử dụng lệnh này!');
        return;
    }

    await message.reply('🔴 Bot đang tắt...');
    console.log('🔴 Bot đã được tắt bởi Admin');
    process.exit(0);
}

async function handleAdminCommand(message, args) {
    const userId = message.author.id;
    if (!isAdmin(userId)) {
        await message.reply('❌ Bạn không có quyền sử dụng lệnh này!');
        return;
    }

    if (args.length === 0) {
        const embed = createEmbed(
            '🔐 Lệnh Admin',
            'Danh sách lệnh quản trị:',
            COLORS.ADMIN,
            [
                { name: '`!admin give @user <số>`', value: 'Cộng xu cho người chơi', inline: true },
                { name: '`!admin remove @user <số>`', value: 'Trừ xu của người chơi', inline: true },
                { name: '`!admin set @user <số>`', value: 'Set số xu cho người chơi', inline: true },
                { name: '`!admin broadcast <nội dung>`', value: 'Gửi thông báo đến tất cả server', inline: true },
                { name: '`!admin resetgames`', value: 'Reset tất cả game đang chạy', inline: true },
                { name: '`!admin cleardata`', value: 'Xóa toàn bộ dữ liệu tiền tệ', inline: true },
                { name: '`!admin shutdown`', value: 'Tắt bot', inline: true }
            ]
        );
        await message.reply({ embeds: [embed] });
        return;
    }

    const subCommand = args[0].toLowerCase();
    const subArgs = args.slice(1);

    switch (subCommand) {
        case 'give':
            await handleAdminGiveMoney(message, subArgs);
            break;
        case 'remove':
            await handleAdminRemoveMoney(message, subArgs);
            break;
        case 'set':
            await handleAdminSetMoney(message, subArgs);
            break;
        case 'broadcast':
            await handleAdminBroadcast(message, subArgs);
            break;
        case 'resetgames':
            await handleAdminResetGames(message);
            break;
        case 'cleardata':
            await handleAdminClearData(message);
            break;
        case 'shutdown':
            await handleAdminShutdown(message);
            break;
        default:
            await message.reply('⚠️ Lệnh admin không hợp lệ! Gõ `!admin` để xem danh sách.');
            break;
    }
}

// ==========================================
// 15. LỆNH TIỀN TỆ
// ==========================================

async function handleBalanceCommand(message) {
    const userId = message.author.id;
    const balance = getBalance(userId);
    
    const embed = createEmbed(
        '💰 Số Dư Của Bạn',
        `${CURRENCY.icon} Bạn có **${balance.toLocaleString()}** ${CURRENCY.name}`,
        COLORS.MONEY
    );
    
    await message.reply({ embeds: [embed] });
}

async function handleDailyCommand(message) {
    const userId = message.author.id;
    
    if (!canClaimDaily(userId)) {
        const hours = getDailyCooldown(userId);
        await message.reply(`⏳ Bạn đã nhận thưởng ngày hôm nay rồi! Hãy quay lại sau **${Math.ceil(hours)} giờ**.`);
        return;
    }
    
    const reward = REWARDS.daily;
    addMoney(userId, reward);
    dailyCooldown.set(userId, Date.now());
    
    const embed = createEmbed(
        '🎁 Thưởng Ngày Mới',
        `${CURRENCY.icon} Bạn đã nhận được **${reward.toLocaleString()}** ${CURRENCY.name}!\nSố dư hiện tại: ${formatMoney(getBalance(userId))}`,
        COLORS.SUCCESS
    );
    
    await message.reply({ embeds: [embed] });
}

async function handleLeaderboardCommand(message) {
    const sorted = Array.from(userBalances.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    if (sorted.length === 0) {
        await message.reply('📊 Chưa có ai trong bảng xếp hạng!');
        return;
    }
    
    let description = '🏆 **Bảng Xếp Hạng Giàu Nhất** 🏆\n\n';
    const medals = ['🥇', '🥈', '🥉'];
    
    for (let i = 0; i < sorted.length; i++) {
        const [userId, balance] = sorted[i];
        const user = await client.users.fetch(userId).catch(() => null);
        const medal = i < 3 ? medals[i] : `${i + 1}.`;
        description += `${medal} ${user ? user.username : 'Unknown'}: ${formatMoney(balance)}\n`;
    }
    
    const embed = createEmbed('🏆 Bảng Xếp Hạng', description, COLORS.RARE);
    await message.reply({ embeds: [embed] });
}

async function handleTransferCommand(message, args) {
    if (args.length < 2) {
        await message.reply('⚠️ Cách dùng: `!transfer @người_chơi <số_xu>`');
        return;
    }
    
    const target = message.mentions.users.first();
    if (!target) {
        await message.reply('⚠️ Vui lòng tag người cần chuyển! Ví dụ: `!transfer @user 100`');
        return;
    }
    
    if (target.id === message.author.id) {
        await message.reply('❌ Bạn không thể chuyển tiền cho chính mình!');
        return;
    }
    
    const amount = parseInt(args[1]);
    if (isNaN(amount) || amount <= 0) {
        await message.reply('⚠️ Vui lòng nhập số xu hợp lệ!');
        return;
    }
    
    const senderId = message.author.id;
    if (!removeMoney(senderId, amount)) {
        await message.reply(`❌ Bạn không có đủ ${CURRENCY.name}! Số dư: ${formatMoney(getBalance(senderId))}`);
        return;
    }
    
    addMoney(target.id, amount);
    
    const embed = createEmbed(
        '💸 Chuyển Tiền Thành Công',
        `${CURRENCY.icon} Bạn đã chuyển **${amount.toLocaleString()}** ${CURRENCY.name} cho **${target.username}**\nSố dư hiện tại: ${formatMoney(getBalance(senderId))}`,
        COLORS.SUCCESS
    );
    
    await message.reply({ embeds: [embed] });
}

// ==========================================
// 16. XỬ LÝ LỆNH GAME
// ==========================================

async function handleGuessCommand(message, args) {
    const userId = message.author.id;
    let betAmount = 0;
    
    if (args.length > 0 && !isNaN(args[args.length - 1])) {
        betAmount = parseInt(args.pop());
        if (betAmount > 0) {
            if (!removeMoney(userId, betAmount)) {
                await message.reply(`❌ Bạn không có đủ ${CURRENCY.name}! Số dư: ${formatMoney(getBalance(userId))}`);
                return;
            }
        }
    }

    if (args.length === 0) {
        const game = new GuessGame();
        game.bet = betAmount;
        gameStates.set(userId, game);

        const embed = createEmbed(
            '🎯 Game Đoán Số',
            `Tôi đã chọn một số từ 1 đến 100!\n${betAmount > 0 ? `💰 Cược: ${formatMoney(betAmount)}` : '💰 Chơi miễn phí'}`,
            COLORS.SUCCESS,
            [
                { name: '📝 Cách chơi', value: 'Gõ `!guess <số>` để đoán', inline: true },
                { name: '💡 Gợi ý', value: 'Số của tôi nằm trong khoảng 1-100', inline: true }
            ]
        );
        await message.reply({ embeds: [embed] });
        return;
    }

    const game = gameStates.get(userId);
    if (!game) {
        await message.reply('❌ Bạn chưa bắt đầu game! Gõ `!guess` để bắt đầu.');
        return;
    }

    if (game.guessed) {
        await message.reply('🎉 Bạn đã đoán đúng rồi! Gõ `!guess` để chơi lại.');
        return;
    }

    const guess = parseInt(args[0]);
    if (isNaN(guess) || guess < 1 || guess > 100) {
        await message.reply('⚠️ Vui lòng nhập số từ 1 đến 100!');
        return;
    }

    const result = game.makeGuess(guess);
    
    if (result.result === 'win') {
        const reward = Math.floor(REWARDS.guess.win * (game.bet > 0 ? 2 : 1));
        addMoney(userId, reward);
        result.message += `\n💰 Bạn nhận được ${formatMoney(reward)}`;
        gameStates.delete(userId);
    }

    const embed = createEmbed('🎯 Game Đoán Số', result.message, result.color);
    
    if (game.guessed) {
        embed.addFields({ name: '📊 Thống kê', value: game.getStats() });
    }

    await message.reply({ embeds: [embed] });
}

async function handleTicTacToeCommand(message) {
    const userId = message.author.id;
    let betAmount = 0;
    
    const args = message.content.split(' ');
    if (args.length > 1) {
        betAmount = parseInt(args[args.length - 1]);
        if (betAmount > 0) {
            if (!removeMoney(userId, betAmount)) {
                await message.reply(`❌ Bạn không có đủ ${CURRENCY.name}! Số dư: ${formatMoney(getBalance(userId))}`);
                return;
            }
        }
    }

    const game = new TicTacToe();
    game.bet = betAmount;
    const gameId = Date.now().toString() + message.author.id;
    ticTacToeGames.set(gameId, game);

    const embed = createEmbed(
        '🎮 Game Cờ Caro',
        `**Lượt của bạn!** Chọn ô bên dưới\n${betAmount > 0 ? `💰 Cược: ${formatMoney(betAmount)}` : '💰 Chơi miễn phí'}`,
        COLORS.GAME,
        [
            { name: '❌ Bạn', value: 'X', inline: true },
            { name: '⭕ Bot', value: 'O', inline: true }
        ]
    );

    const rows = createTicTacToeBoard(game);
    const msg = await message.reply({ embeds: [embed], components: rows });
    ticTacToeGames.set(msg.id, game);
    ticTacToeGames.delete(gameId);
}

async function handleHangmanCommand(message, args) {
    const userId = message.author.id;
    let betAmount = 0;
    
    if (args.length > 0 && !isNaN(args[args.length - 1])) {
        betAmount = parseInt(args.pop());
        if (betAmount > 0) {
            if (!removeMoney(userId, betAmount)) {
                await message.reply(`❌ Bạn không có đủ ${CURRENCY.name}! Số dư: ${formatMoney(getBalance(userId))}`);
                return;
            }
        }
    }
    
    if (args.length === 0) {
        const game = new HangmanGame();
        game.bet = betAmount;
        hangmanGames.set(userId, game);
        
        const embed = createEmbed(
            '🔤 Game Đoán Từ',
            `Từ có ${game.word.length} chữ cái\n${game.getHangman()}\nTừ: ${game.getDisplay()}\n${betAmount > 0 ? `💰 Cược: ${formatMoney(betAmount)}` : '💰 Chơi miễn phí'}`,
            COLORS.INFO,
            [
                { name: '📝 Cách chơi', value: 'Gõ `!hangman <chữ cái>` để đoán', inline: true },
                { name: '💡 Lưu ý', value: `Bạn có ${game.maxAttempts} lượt thử`, inline: true }
            ]
        );
        await message.reply({ embeds: [embed] });
        return;
    }

    const game = hangmanGames.get(userId);
    if (!game) {
        await message.reply('❌ Bạn chưa bắt đầu game! Gõ `!hangman` để bắt đầu.');
        return;
    }

    const letter = args[0];
    if (letter.length !== 1 || !letter.match(/[a-zA-Z]/)) {
        await message.reply('⚠️ Vui lòng nhập 1 chữ cái!');
        return;
    }

    const result = game.guessLetter(letter);
    
    if (result.result === 'win') {
        const reward = Math.floor(REWARDS.hangman.win * (game.bet > 0 ? 2 : 1));
        addMoney(userId, reward);
        result.message += `\n💰 Bạn nhận được ${formatMoney(reward)}`;
        hangmanGames.delete(userId);
    } else if (result.result === 'lose') {
        hangmanGames.delete(userId);
    }

    const embed = createEmbed('🔤 Game Đoán Từ', `${game.getHangman()}\n\n${result.message}`, 
        result.result === 'win' ? COLORS.SUCCESS : 
        result.result === 'lose' ? COLORS.ERROR : COLORS.INFO
    );

    await message.reply({ embeds: [embed] });
}

async function handleTriviaCommand(message) {
    const userId = message.author.id;
    let betAmount = 0;
    
    const args = message.content.split(' ');
    if (args.length > 1) {
        betAmount = parseInt(args[args.length - 1]);
        if (betAmount > 0) {
            if (!removeMoney(userId, betAmount)) {
                await message.reply(`❌ Bạn không có đủ ${CURRENCY.name}! Số dư: ${formatMoney(getBalance(userId))}`);
                return;
            }
        }
    }
    
    if (!triviaGames.has(userId)) {
        const game = new TriviaGame();
        game.bet = betAmount;
        triviaGames.set(userId, game);
    }
    
    const game = triviaGames.get(userId);
    const question = game.getQuestion();
    
    const embed = createEmbed(
        '🧠 Game Đố Vui',
        `**${question.question}**\n${betAmount > 0 ? `💰 Cược: ${formatMoney(betAmount)}` : '💰 Chơi miễn phí'}`,
        COLORS.INFO,
        question.options.map((opt, i) => ({
            name: `Lựa chọn ${i + 1}`,
            value: opt,
            inline: true
        }))
    );
    embed.addFields({ name: '📝 Cách chơi', value: 'Gõ `!trivia <1-4>` để chọn đáp án', inline: false });
    
    await message.reply({ embeds: [embed] });
}

async function handleTriviaAnswer(message, args) {
    const userId = message.author.id;
    const game = triviaGames.get(userId);
    
    if (!game || !game.currentQuestion) {
        await message.reply('❌ Bạn chưa bắt đầu game! Gõ `!trivia` để nhận câu hỏi.');
        return;
    }

    const answer = parseInt(args[0]) - 1;
    if (isNaN(answer) || answer < 0 || answer > 3) {
        await message.reply('⚠️ Vui lòng chọn số từ 1 đến 4!');
        return;
    }

    const correct = game.checkAnswer(answer);
    const question = game.currentQuestion;
    
    let reward = 0;
    if (correct) {
        reward = Math.floor(REWARDS.trivia.win * (game.bet > 0 ? 2 : 1));
        addMoney(userId, reward);
        game.currentQuestion = null;
    }
    
    const embed = createEmbed(
        '🧠 Game Đố Vui',
        correct ? `✅ **Đúng rồi!** 🎉\n💰 Bạn nhận được ${formatMoney(reward)}` : `❌ **Sai rồi!** Đáp án đúng là: **${question.options[question.answer]}**`,
        correct ? COLORS.SUCCESS : COLORS.ERROR
    );
    
    await message.reply({ embeds: [embed] });
    
    if (!correct) {
        game.currentQuestion = null;
        triviaGames.set(userId, game);
    }
}

async function handleBlackjackCommand(message) {
    const userId = message.author.id;
    let betAmount = 0;
    
    const args = message.content.split(' ');
    if (args.length > 1) {
        betAmount = parseInt(args[args.length - 1]);
        if (betAmount > 0) {
            if (!removeMoney(userId, betAmount)) {
                await message.reply(`❌ Bạn không có đủ ${CURRENCY.name}! Số dư: ${formatMoney(getBalance(userId))}`);
                return;
            }
        }
    }
    
    if (blackjackGames.has(userId)) {
        await message.reply('❌ Bạn đang có game Blackjack đang chơi! Gõ `!bj hit` hoặc `!bj stand`.');
        return;
    }
    
    const game = new BlackjackGame();
    game.bet = betAmount;
    blackjackGames.set(userId, game);
    
    const display = game.getDisplay();
    const embed = createEmbed(
        '🃏 Game Blackjack (21 Điểm)',
        `🃏 ${display.player}\n🃏 ${display.bot}\n${betAmount > 0 ? `💰 Cược: ${formatMoney(betAmount)}` : '💰 Chơi miễn phí'}`,
        COLORS.DICE,
        [
            { name: '📝 Cách chơi', value: 'Gõ `!bj hit` để rút thêm\nGõ `!bj stand` để dừng', inline: true }
        ]
    );
    
    await message.reply({ embeds: [embed] });
}

async function handleBlackjackAction(message, action) {
    const userId = message.author.id;
    const game = blackjackGames.get(userId);
    
    if (!game) {
        await message.reply('❌ Bạn chưa bắt đầu game! Gõ `!blackjack` để bắt đầu.');
        return;
    }

    let result;
    
    if (action === 'hit') {
        result = game.hit();
        if (!result) {
            await message.reply('❌ Game đã kết thúc! Gõ `!blackjack` để chơi lại.');
            return;
        }
    } else if (action === 'stand') {
        result = game.stand();
    } else {
        await message.reply('⚠️ Vui lòng gõ `!bj hit` hoặc `!bj stand`');
        return;
    }

    if (result.result === 'win') {
        const reward = Math.floor(REWARDS.blackjack.win * (game.bet > 0 ? 2 : 1));
        addMoney(userId, reward);
        result.message += `\n💰 Bạn nhận được ${formatMoney(reward)}`;
    }

    const display = game.getDisplay();
    const embed = createEmbed(
        '🃏 Game Blackjack',
        `🃏 ${display.player}\n🃏 ${display.bot}`,
        result.result === 'win' ? COLORS.SUCCESS : 
        result.result === 'lose' ? COLORS.ERROR : COLORS.INFO
    );
    
    if (result.message) {
        embed.addFields({ name: '📊 Kết quả', value: result.message });
    }

    await message.reply({ embeds: [embed] });
    
    if (game.gameOver) {
        blackjackGames.delete(userId);
    }
}

async function handleMemoryCommand(message) {
    const userId = message.author.id;
    let betAmount = 0;
    
    const args = message.content.split(' ');
    if (args.length > 1) {
        betAmount = parseInt(args[args.length - 1]);
        if (betAmount > 0) {
            if (!removeMoney(userId, betAmount)) {
                await message.reply(`❌ Bạn không có đủ ${CURRENCY.name}! Số dư: ${formatMoney(getBalance(userId))}`);
                return;
            }
        }
    }
    
    if (memoryGames.has(userId)) {
        await message.reply('❌ Bạn đang có game Memory đang chơi! Hãy hoàn thành trước.');
        return;
    }
    
    const game = new MemoryGame();
    game.bet = betAmount;
    memoryGames.set(userId, game);
    
    const embed = createEmbed(
        '🧩 Game Ghi Nhớ',
        `Tìm các cặp thẻ giống nhau!\nLượt: 0\n${betAmount > 0 ? `💰 Cược: ${formatMoney(betAmount)}` : '💰 Chơi miễn phí'}`,
        COLORS.GAME
    );
    
    const rows = createMemoryBoard(game);
    const msg = await message.reply({ embeds: [embed], components: rows });
    memoryGames.set(msg.id, game);
    memoryGames.delete(userId);
}

async function handleSlotCommand(message, args) {
    const userId = message.author.id;
    let betAmount = 100;
    
    if (args.length > 0) {
        betAmount = parseInt(args[0]);
        if (isNaN(betAmount) || betAmount <= 0) {
            await message.reply('⚠️ Vui lòng nhập số xu hợp lệ!');
            return;
        }
    }
    
    if (!removeMoney(userId, betAmount)) {
        await message.reply(`❌ Bạn không có đủ ${CURRENCY.name}! Số dư: ${formatMoney(getBalance(userId))}`);
        return;
    }
    
    const game = new SlotGame();
    const result = game.spin();
    const win = game.checkWin();
    
    let reward = 0;
    if (win.win) {
        reward = Math.floor(betAmount * win.multiplier);
        addMoney(userId, reward);
    }
    
    const embed = createEmbed(
        '🎰 Game Slot Machine',
        `**${result.join(' | ')}**\n\n${win.message}\n${win.win ? `💰 Bạn nhận được ${formatMoney(reward)}` : `💸 Bạn mất ${formatMoney(betAmount)}`}`,
        win.win ? COLORS.SUCCESS : COLORS.ERROR,
        [
            { name: '💰 Số dư hiện tại', value: formatMoney(getBalance(userId)), inline: true }
        ]
    );
    
    await message.reply({ embeds: [embed] });
}

// ==========================================
// 17. XỬ LÝ BUTTON
// ==========================================

async function handleTicTacToeButton(interaction) {
    const gameId = interaction.message.id;
    const game = ticTacToeGames.get(gameId);
    
    if (!game) {
        await interaction.reply({ content: '❌ Game đã kết thúc!', ephemeral: true });
        return;
    }

    const index = parseInt(interaction.customId.split('_')[1]);
    
    if (game.board[index] !== ' ') {
        await interaction.reply({ content: '❌ Ô này đã được chọn!', ephemeral: true });
        return;
    }

    if (game.turn !== 'player') {
        await interaction.reply({ content: '⏳ Đợi bot suy nghĩ...', ephemeral: true });
        return;
    }

    if (!game.makeMove(index, 'player')) {
        await interaction.reply({ content: '❌ Lỗi!', ephemeral: true });
        return;
    }

    let winner = game.checkWinner();
    const userId = interaction.user.id;
    
    if (winner) {
        const result = winner === 'X' ? 'Bạn thắng!' : 'Bot thắng!';
        const color = winner === 'X' ? COLORS.SUCCESS : COLORS.ERROR;
        
        if (winner === 'X') {
            const reward = Math.floor(REWARDS.tictactoe.win * (game.bet > 0 ? 2 : 1));
            addMoney(userId, reward);
            await interaction.update({ 
                embeds: [createEmbed('🎮 Game Cờ Caro', `**${result}**\n💰 Bạn nhận được ${formatMoney(reward)}`, color)], 
                components: [] 
            });
        } else {
            await interaction.update({ 
                embeds: [createEmbed('🎮 Game Cờ Caro', `**${result}**`, color)], 
                components: [] 
            });
        }
        ticTacToeGames.delete(gameId);
        return;
    }

    if (game.isFull()) {
        await interaction.update({ 
            embeds: [createEmbed('🎮 Game Cờ Caro', '🤝 **Hòa!**', COLORS.TIE)], 
            components: [] 
        });
        ticTacToeGames.delete(gameId);
        return;
    }

    const rows = createTicTacToeBoard(game);
    const embed = createEmbed('🎮 Game Cờ Caro', '**🤖 Lượt của bot...**', COLORS.GAME);
    await interaction.update({ embeds: [embed], components: rows });

    setTimeout(async () => {
        const updatedGame = ticTacToeGames.get(gameId);
        if (!updatedGame) return;

        const botIndex = updatedGame.botMove();
        if (botIndex === -1) return;

        updatedGame.makeMove(botIndex, 'bot');

        const winner2 = updatedGame.checkWinner();
        if (winner2) {
            const result = winner2 === 'X' ? 'Bạn thắng!' : 'Bot thắng!';
            const color = winner2 === 'X' ? COLORS.SUCCESS : COLORS.ERROR;
            
            let embed;
            if (winner2 === 'X') {
                const reward = Math.floor(REWARDS.tictactoe.win * (updatedGame.bet > 0 ? 2 : 1));
                addMoney(userId, reward);
                embed = createEmbed('🎮 Game Cờ Caro', `**${result}**\n💰 Bạn nhận được ${formatMoney(reward)}`, color);
            } else {
                embed = createEmbed('🎮 Game Cờ Caro', `**${result}**`, color);
            }
            
            await interaction.editReply({ embeds: [embed], components: [] });
            ticTacToeGames.delete(gameId);
            return;
        }

        if (updatedGame.isFull()) {
            const embed = createEmbed('🎮 Game Cờ Caro', '🤝 **Hòa!**', COLORS.TIE);
            await interaction.editReply({ embeds: [embed], components: [] });
            ticTacToeGames.delete(gameId);
            return;
        }

        const rows2 = createTicTacToeBoard(updatedGame);
        const embed2 = createEmbed('🎮 Game Cờ Caro', '**🎯 Lượt của bạn!**', COLORS.GAME);
        await interaction.editReply({ embeds: [embed2], components: rows2 });
    }, 1000);
}

async function handleMemoryButton(interaction) {
    const gameId = interaction.message.id;
    const game = memoryGames.get(gameId);
    
    if (!game) {
        await interaction.reply({ content: '❌ Game đã kết thúc!', ephemeral: true });
        return;
    }

    const index = parseInt(interaction.customId.split('_')[1]);
    
    if (game.matched.includes(index)) {
        await interaction.reply({ content: '✅ Thẻ này đã được ghép!', ephemeral: true });
        return;
    }

    if (game.flipped.includes(index)) {
        await interaction.reply({ content: '⚠️ Thẻ này đã được lật!', ephemeral: true });
        return;
    }

    const result = game.flip(index);
    if (!result) {
        await interaction.reply({ content: '❌ Lỗi!', ephemeral: true });
        return;
    }

    const rows = createMemoryBoard(game);
    let embed = createEmbed(
        '🧩 Game Ghi Nhớ',
        `Tìm các cặp thẻ giống nhau!\nLượt: ${game.moves}\n${result.message}`,
        result.result === 'win' ? COLORS.SUCCESS : COLORS.GAME
    );

    if (result.result === 'win') {
        const reward = Math.floor(REWARDS.memory.win * (game.bet > 0 ? 2 : 1));
        addMoney(interaction.user.id, reward);
        embed = createEmbed(
            '🧩 Game Ghi Nhớ',
            `Tìm các cặp thẻ giống nhau!\nLượt: ${game.moves}\n${result.message}\n💰 Bạn nhận được ${formatMoney(reward)}`,
            COLORS.SUCCESS
        );
        await interaction.update({ embeds: [embed], components: [] });
        memoryGames.delete(gameId);
        return;
    }

    if (result.result === 'nomatch') {
        await interaction.update({ embeds: [embed], components: rows });
        
        setTimeout(async () => {
            const currentGame = memoryGames.get(gameId);
            if (!currentGame) return;
            
            const [i1, i2] = result.cards;
            currentGame.flipped = [];
            currentGame.moves--;
            
            const newRows = createMemoryBoard(currentGame);
            const newEmbed = createEmbed(
                '🧩 Game Ghi Nhớ',
                `Tìm các cặp thẻ giống nhau!\nLượt: ${currentGame.moves}`,
                COLORS.GAME
            );
            await interaction.editReply({ embeds: [newEmbed], components: newRows });
        }, 1500);
        return;
    }

    await interaction.update({ embeds: [embed], components: rows });
}

// ==========================================
// 18. LỆNH !GAME
// ==========================================

async function handleGameCommand(message) {
    const userId = message.author.id;
    const balance = getBalance(userId);
    const isAdminUser = isAdmin(userId);
    
    const embed = createEmbed(
        '🎮 **TRUNG TÂM GAME** 🎮',
        `💰 Số dư: ${formatMoney(balance)}${isAdminUser ? '\n🔐 **Bạn là Admin!**' : ''}`,
        COLORS.INFO,
        [
            { name: '━━━ 🎯 GAME GIẢI TRÍ ━━━', value: '─────────────────', inline: false },
            { name: '`!guess [cược]`', value: '🎯 Đoán số (1-100)\n💰 Thưởng: 100-200 xu', inline: true },
            { name: '`!dice`', value: '🎲 Tung xúc xắc\n💰 Thưởng: 50 xu', inline: true },
            { name: '`!rps [kéo|búa|bao]`', value: '✊ Kéo búa bao\n💰 Thưởng: 75 xu', inline: true },
            
            { name: '━━━ 🧠 GAME TRÍ TUỆ ━━━', value: '─────────────────', inline: false },
            { name: '`!hangman [cược]`', value: '🔤 Đoán từ\n💰 Thưởng: 200-400 xu', inline: true },
            { name: '`!trivia [cược]`', value: '🧠 Đố vui\n💰 Thưởng: 120-240 xu', inline: true },
            { name: '`!memory [cược]`', value: '🧩 Ghi nhớ\n💰 Thưởng: 250-500 xu', inline: true },
            
            { name: '━━━ 🃏 GAME MAY RỦI ━━━', value: '─────────────────', inline: false },
            { name: '`!blackjack [cược]`', value: '🃏 Blackjack 21 điểm\n💰 Thưởng: 300-600 xu', inline: true },
            { name: '`!slot [cược]`', value: '🎰 Máy đánh bạc\n💰 Thưởng: x1.5 - x10', inline: true },
            { name: '`!tictactoe [cược]`', value: '🎮 Cờ caro với bot\n💰 Thưởng: 150-300 xu', inline: true },
            
            { name: '━━━ 💰 HỆ THỐNG TIỀN TỆ ━━━', value: '─────────────────', inline: false },
            { name: '`!balance`', value: '💰 Kiểm tra số dư', inline: true },
            { name: '`!daily`', value: '🎁 Nhận thưởng ngày (500 xu)', inline: true },
            { name: '`!transfer @user <số_xu>`', value: '💸 Chuyển tiền cho người khác', inline: true },
            { name: '`!leaderboard`', value: '🏆 Bảng xếp hạng giàu nhất', inline: true },
            
            { name: '━━━ 📖 HƯỚNG DẪN ━━━', value: '─────────────────', inline: false },
            { name: '💡 Cách cược', value: 'Thêm số xu sau lệnh: `!guess 50`\nMặc định: Chơi miễn phí', inline: false },
            { name: '📌 Lưu ý', value: 'Chơi game để kiếm xu, đổi thưởng hàng ngày!', inline: false }
        ]
    );
    
    if (isAdminUser) {
        embed.addFields({
            name: '━━━ 🔐 LỆNH ADMIN ━━━',
            value: '─────────────────\n`!admin` để xem danh sách lệnh quản trị',
            inline: false
        });
    }
    
    await message.reply({ embeds: [embed] });
}

// ==========================================
// 19. LỆNH DICE, RPS
// ==========================================

async function handleDiceCommand(message) {
    const userId = message.author.id;
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const total = dice1 + dice2;
    
    let reward = 0;
    if (total === 12) {
        reward = REWARDS.dice.win * 4;
    } else if (total >= 10) {
        reward = REWARDS.dice.win * 2;
    } else if (total >= 7) {
        reward = REWARDS.dice.win;
    }
    
    if (reward > 0) {
        addMoney(userId, reward);
    }

    const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const diceNames = ['một', 'hai', 'ba', 'bốn', 'năm', 'sáu'];
    
    const embed = createEmbed(
        '🎲 Game Xúc Xắc',
        `${diceEmojis[dice1-1]} ${diceEmojis[dice2-1]}`,
        total >= 10 ? COLORS.SUCCESS : COLORS.DICE,
        [
            { name: '🎲 Kết quả', value: `**${diceNames[dice1-1]}** + **${diceNames[dice2-1]}** = **${total}**`, inline: false },
            { name: '📊 Tổng', value: `${total} điểm`, inline: true },
            { name: '💰 Thưởng', value: reward > 0 ? formatMoney(reward) : '0 xu', inline: true }
        ]
    );
    embed.setFooter({ text: `Lần tung của ${message.author.username}` });

    await message.reply({ embeds: [embed] });
}

async function handleRPSCommand(message, args) {
    const userId = message.author.id;
    const choices = ['kéo', 'búa', 'bao'];
    const emojis = { 'kéo': '✂️', 'búa': '✊', 'bao': '✋' };
    
    if (args.length === 0) {
        await message.reply('⚠️ Vui lòng chọn: `!rps kéo|búa|bao`');
        return;
    }

    const userChoice = args[0].toLowerCase();
    if (!choices.includes(userChoice)) {
        await message.reply('⚠️ Vui lòng chọn: `kéo`, `búa`, hoặc `bao`');
        return;
    }

    const botChoice = choices[Math.floor(Math.random() * 3)];
    
    let result, color, reward = 0;
    if (userChoice === botChoice) {
        result = '🤝 Hòa!';
        color = COLORS.TIE;
    } else if (
        (userChoice === 'kéo' && botChoice === 'bao') ||
        (userChoice === 'búa' && botChoice === 'kéo') ||
        (userChoice === 'bao' && botChoice === 'búa')
    ) {
        result = '🎉 Bạn thắng!';
        color = COLORS.SUCCESS;
        reward = REWARDS.rps.win;
        addMoney(userId, reward);
    } else {
        result = '😢 Bot thắng!';
        color = COLORS.ERROR;
    }

    const embed = createEmbed(
        '✊ Kéo - Búa - Bao',
        `Bạn: ${emojis[userChoice]} | Bot: ${emojis[botChoice]}`,
        color,
        [
            { name: '🏆 Kết quả', value: result, inline: true },
            { name: '💰 Thưởng', value: reward > 0 ? formatMoney(reward) : '0 xu', inline: true }
        ]
    );

    await message.reply({ embeds: [embed] });
}

// ==========================================
// 20. SỰ KIỆN BOT
// ==========================================

client.once('ready', () => {
    console.log('='.repeat(50));
    console.log(`✅ BOT ĐÃ SẴN SÀNG!`);
    console.log(`📛 Tên: ${client.user.tag}`);
    console.log(`🌐 Server: ${client.guilds.cache.size}`);
    console.log(`👥 Users: ${client.users.cache.size}`);
    console.log(`🔐 Admin ID: ${ADMIN_IDS.join(', ')}`);
    console.log('='.repeat(50));
    client.user.setActivity('!game để xem game', { type: 'PLAYING' });
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;
    
    if (interaction.customId.startsWith('ttt_')) {
        await handleTicTacToeButton(interaction);
    } else if (interaction.customId.startsWith('mem_')) {
        await handleMemoryButton(interaction);
    }
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    console.log(`📨 ${message.author.tag}: ${message.content}`);

    try {
        switch (command) {
            case 'game':
                await handleGameCommand(message);
                break;
            
            case 'guess':
                await handleGuessCommand(message, args);
                break;
            case 'dice':
                await handleDiceCommand(message);
                break;
            case 'rps':
                await handleRPSCommand(message, args);
                break;
            case 'tictactoe':
            case 'ttt':
                await handleTicTacToeCommand(message);
                break;
            case 'hangman':
                await handleHangmanCommand(message, args);
                break;
            case 'trivia':
                if (args.length === 0) {
                    await handleTriviaCommand(message);
                } else {
                    await handleTriviaAnswer(message, args);
                }
                break;
            case 'blackjack':
            case 'bj':
                if (args.length === 0) {
                    await handleBlackjackCommand(message);
                } else {
                    await handleBlackjackAction(message, args[0]);
                }
                break;
            case 'memory':
                await handleMemoryCommand(message);
                break;
            case 'slot':
                await handleSlotCommand(message, args);
                break;
            
            case 'balance':
            case 'bal':
                await handleBalanceCommand(message);
                break;
            case 'daily':
                await handleDailyCommand(message);
                break;
            case 'leaderboard':
            case 'lb':
                await handleLeaderboardCommand(message);
                break;
            case 'transfer':
            case 'pay':
                await handleTransferCommand(message, args);
                break;
            
            case 'admin':
                await handleAdminCommand(message, args);
                break;
            
            default:
                break;
        }
    } catch (error) {
        console.error('❌ Lỗi:', error);
        await message.reply('❌ Đã xảy ra lỗi! Vui lòng thử lại sau.');
    }
});

// ==========================================
// 21. KHỞI ĐỘNG BOT
// ==========================================

const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.error('❌ Không tìm thấy DISCORD_TOKEN trong biến môi trường!');
    console.error('📌 Vui lòng thêm DISCORD_TOKEN vào Environment Variables trên Render');
    process.exit(1);
}

client.login(token).catch(error => {
    console.error('❌ Lỗi đăng nhập:', error);
    process.exit(1);
});

process.on('unhandledRejection', error => {
    console.error('⚠️ Unhandled Rejection:', error);
});
