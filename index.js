// ==========================================
// DISCORD GAME BOT - PHIÊN BẢN TỐI ƯU
// ==========================================

const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    Events,
    Partials
} = require('discord.js');

// ==========================================
// 1. CẤU HÌNH BOT
// ==========================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
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
    MONEY: 0x2ECC71,
    ADMIN: 0xE74C3C,
    PET: 0xF39C12,
    LOTTERY: 0xE67E22
};

// ==========================================
// 2. ADMIN
// ==========================================

const ADMIN_IDS = ['1316027180433801296'];

function isAdmin(userId) {
    return ADMIN_IDS.includes(userId);
}

// ==========================================
// 3. HỆ THỐNG TIỀN TỆ
// ==========================================

const userBalances = new Map();
const dailyCooldown = new Map();

const CURRENCY = { name: 'Xu', icon: '🪙', symbol: '💰' };
const REWARDS = {
    guess: 100, dice: 50, rps: 75, tictactoe: 150,
    hangman: 200, trivia: 120, blackjack: 300,
    memory: 250, daily: 500
};

function getBalance(userId) { return userBalances.get(userId) || 0; }
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
function formatMoney(amount) { return `${CURRENCY.icon} ${amount.toLocaleString()} ${CURRENCY.name}`; }

function canClaimDaily(userId) {
    const lastClaim = dailyCooldown.get(userId);
    if (!lastClaim) return true;
    return (Date.now() - lastClaim) / (1000 * 60 * 60) >= 24;
}

// ==========================================
// 4. HÀM TIỆN ÍCH
// ==========================================

function createEmbed(title, description, color = COLORS.INFO, fields = []) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp()
        .setFooter({ text: '🎮 Game Bot' });
    if (fields.length > 0) {
        // Giới hạn tối đa 25 fields
        const limitedFields = fields.slice(0, 25);
        embed.addFields(limitedFields);
    }
    return embed;
}

// ==========================================
// 5. GAME ĐOÁN SỐ
// ==========================================

const guessGames = new Map();

class GuessGame {
    constructor() {
        this.number = Math.floor(Math.random() * 100) + 1;
        this.attempts = 0;
        this.guessed = false;
    }
    makeGuess(guess) {
        this.attempts++;
        if (guess === this.number) {
            this.guessed = true;
            return { win: true, msg: `🎉 CHÍNH XÁC! Số là ${this.number}\nSau ${this.attempts} lần thử!` };
        }
        return { win: false, msg: `📈 ${guess} ${guess < this.number ? 'NHỎ HƠN' : 'LỚN HƠN'} số cần tìm. (Lần #${this.attempts})` };
    }
}

// ==========================================
// 6. GAME CỜ CARO
// ==========================================

const ticTacToeGames = new Map();
const timeouts = new Map();

class TicTacToe {
    constructor() {
        this.board = Array(9).fill(' ');
        this.turn = 'player';
        this.moves = 0;
        this.bet = 0;
    }
    makeMove(index, player) {
        if (this.board[index] !== ' ' || player !== this.turn) return false;
        this.board[index] = player === 'player' ? 'X' : 'O';
        this.moves++;
        this.turn = this.turn === 'player' ? 'bot' : 'player';
        return true;
    }
    checkWinner() {
        const lines = [
            [0,1,2],[3,4,5],[6,7,8],
            [0,3,6],[1,4,7],[2,5,8],
            [0,4,8],[2,4,6]
        ];
        for (const line of lines) {
            const [a,b,c] = line;
            if (this.board[a] !== ' ' && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
                return this.board[a];
            }
        }
        return null;
    }
    isFull() { return this.moves === 9; }
    botMove() {
        const empty = this.board.map((c,i) => c === ' ' ? i : null).filter(i => i !== null);
        if (empty.length === 0) return -1;
        if (empty.includes(4)) return 4;
        return empty[Math.floor(Math.random() * empty.length)];
    }
}

function createBoard(game) {
    const emojis = game.board.map(c => c === 'X' ? '❌' : c === 'O' ? '⭕' : '⬜');
    const rows = [];
    for (let i = 0; i < 3; i++) {
        const row = new ActionRowBuilder();
        for (let j = 0; j < 3; j++) {
            const idx = i*3+j;
            const occupied = game.board[idx] !== ' ';
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`ttt_${idx}`)
                    .setLabel(emojis[idx])
                    .setStyle(occupied ? ButtonStyle.Primary : ButtonStyle.Secondary)
                    .setDisabled(occupied || game.turn === 'bot')
            );
        }
        rows.push(row);
    }
    return rows;
}

// ==========================================
// 7. XỬ LÝ LỆNH
// ==========================================

async function handleHelp(message) {
    const embed1 = createEmbed('🎮 **DANH SÁCH LỆNH (1/2)**', 
        'Các game giải trí và trí tuệ:', COLORS.INFO, [
        { name: '━━━ 🎯 GAME GIẢI TRÍ ━━━', value: '─────────────────', inline: false },
        { name: '`!guess [cược]`', value: 'Đoán số (1-100)', inline: true },
        { name: '`!dice`', value: 'Tung xúc xắc', inline: true },
        { name: '`!rps [kéo|búa|bao]`', value: 'Kéo búa bao', inline: true },
        { name: '━━━ 🧠 GAME TRÍ TUỆ ━━━', value: '─────────────────', inline: false },
        { name: '`!hangman`', value: 'Đoán từ', inline: true },
        { name: '`!trivia`', value: 'Đố vui', inline: true },
        { name: '━━━ 🃏 GAME MAY RỦI ━━━', value: '─────────────────', inline: false },
        { name: '`!blackjack`', value: 'Blackjack 21 điểm', inline: true },
        { name: '`!slot [cược]`', value: 'Máy đánh bạc', inline: true },
        { name: '`!tictactoe [cược]`', value: 'Cờ caro', inline: true }
    ]);
    
    const embed2 = createEmbed('🎮 **DANH SÁCH LỆNH (2/2)**', 
        'Game xổ số, pet và tiền tệ:', COLORS.INFO, [
        { name: '━━━ 🎰 XỔ SỐ ━━━', value: '─────────────────', inline: false },
        { name: '`!de <số> <cược>`', value: 'Đánh đề (1 ăn 70)', inline: true },
        { name: '`!lo <số> <cược>`', value: 'Đánh lô (1 ăn 20-50)', inline: true },
        { name: '`!taixiu <tài|xiu> <cược>`', value: 'Tài Xỉu (x2)', inline: true },
        { name: '━━━ 🐾 PET ━━━', value: '─────────────────', inline: false },
        { name: '`!petshop`', value: 'Cửa hàng pet', inline: true },
        { name: '`!pet info`', value: 'Thông tin pet', inline: true },
        { name: '━━━ 💰 TIỀN TỆ ━━━', value: '─────────────────', inline: false },
        { name: '`!balance`', value: 'Kiểm tra số dư', inline: true },
        { name: '`!daily`', value: 'Nhận thưởng ngày (500 xu)', inline: true },
        { name: '`!transfer @user <số>`', value: 'Chuyển tiền', inline: true },
        { name: '`!leaderboard`', value: 'Bảng xếp hạng', inline: true }
    ]);
    
    await message.reply({ embeds: [embed1] });
    await message.reply({ embeds: [embed2] });
}

async function handleGuess(message, args) {
    const userId = message.author.id;
    let bet = 0;
    
    if (args.length > 0 && !isNaN(args[args.length-1])) {
        bet = parseInt(args.pop());
        if (bet > 0 && !removeMoney(userId, bet)) {
            return message.reply(`❌ Không đủ tiền! Số dư: ${formatMoney(getBalance(userId))}`);
        }
    }
    
    if (args.length === 0) {
        const game = new GuessGame();
        guessGames.set(userId, game);
        return message.reply({ embeds: [createEmbed('🎯 Đoán Số', 
            `Tôi đã chọn số 1-100!\n${bet > 0 ? `💰 Cược: ${formatMoney(bet)}` : '💰 Chơi miễn phí'}`,
            COLORS.SUCCESS)] });
    }
    
    const game = guessGames.get(userId);
    if (!game) return message.reply('❌ Gõ `!guess` để bắt đầu!');
    if (game.guessed) return message.reply('🎉 Đã đoán đúng! Gõ `!guess` chơi lại.');
    
    const guess = parseInt(args[0]);
    if (isNaN(guess) || guess < 1 || guess > 100) {
        return message.reply('⚠️ Nhập số 1-100!');
    }
    
    const result = game.makeGuess(guess);
    if (result.win) {
        const reward = Math.floor(REWARDS.guess * (bet > 0 ? 2 : 1));
        addMoney(userId, reward);
        guessGames.delete(userId);
        result.msg += `\n💰 Nhận ${formatMoney(reward)}`;
    }
    await message.reply({ embeds: [createEmbed('🎯 Đoán Số', result.msg, result.win ? COLORS.SUCCESS : COLORS.WARNING)] });
}

async function handleDice(message) {
    const userId = message.author.id;
    const d1 = Math.floor(Math.random()*6)+1;
    const d2 = Math.floor(Math.random()*6)+1;
    const total = d1+d2;
    const emojis = ['⚀','⚁','⚂','⚃','⚄','⚅'];
    const names = ['một','hai','ba','bốn','năm','sáu'];
    
    let reward = 0;
    if (total === 12) reward = REWARDS.dice * 4;
    else if (total >= 10) reward = REWARDS.dice * 2;
    else if (total >= 7) reward = REWARDS.dice;
    if (reward > 0) addMoney(userId, reward);
    
    await message.reply({ embeds: [createEmbed('🎲 Xúc Xắc', 
        `${emojis[d1-1]} ${emojis[d2-1]}\n**${names[d1-1]} + ${names[d2-1]} = ${total}**`,
        total >= 10 ? COLORS.SUCCESS : COLORS.DICE,
        [{ name: '💰 Thưởng', value: reward > 0 ? formatMoney(reward) : '0 xu', inline: true }]
    )] });
}

async function handleRPS(message, args) {
    const userId = message.author.id;
    const choices = ['kéo','búa','bao'];
    const emojis = {kéo:'✂️', búa:'✊', bao:'✋'};
    
    if (args.length === 0 || !choices.includes(args[0].toLowerCase())) {
        return message.reply('⚠️ Chọn: `!rps kéo|búa|bao`');
    }
    
    const user = args[0].toLowerCase();
    const bot = choices[Math.floor(Math.random()*3)];
    let result, reward = 0;
    
    if (user === bot) result = '🤝 Hòa!';
    else if ((user === 'kéo' && bot === 'bao') || (user === 'búa' && bot === 'kéo') || (user === 'bao' && bot === 'búa')) {
        result = '🎉 Thắng!';
        reward = REWARDS.rps;
        addMoney(userId, reward);
    } else {
        result = '😢 Thua!';
    }
    
    await message.reply({ embeds: [createEmbed('✊ Kéo Búa Bao',
        `Bạn: ${emojis[user]} | Bot: ${emojis[bot]}\n**${result}**`,
        reward > 0 ? COLORS.SUCCESS : COLORS.ERROR,
        [{ name: '💰 Thưởng', value: reward > 0 ? formatMoney(reward) : '0 xu', inline: true }]
    )] });
}

async function handleTicTacToe(message) {
    const userId = message.author.id;
    let bet = 0;
    const args = message.content.split(' ');
    if (args.length > 1) {
        bet = parseInt(args[args.length-1]);
        if (bet > 0 && !removeMoney(userId, bet)) {
            return message.reply(`❌ Không đủ tiền! Số dư: ${formatMoney(getBalance(userId))}`);
        }
    }
    
    const game = new TicTacToe();
    game.bet = bet;
    const gameId = Date.now().toString() + userId;
    ticTacToeGames.set(gameId, game);
    
    const embed = createEmbed('🎮 Cờ Caro', 
        `Lượt của bạn!\n${bet > 0 ? `💰 Cược: ${formatMoney(bet)}` : '💰 Chơi miễn phí'}`,
        COLORS.GAME,
        [{ name: '❌ Bạn', value: 'X', inline: true }, { name: '⭕ Bot', value: 'O', inline: true }]
    );
    
    const msg = await message.reply({ embeds: [embed], components: createBoard(game) });
    ticTacToeGames.set(msg.id, game);
    ticTacToeGames.delete(gameId);
}

async function handleBalance(message) {
    const userId = message.author.id;
    await message.reply({ embeds: [createEmbed('💰 Số Dư', 
        `Bạn có **${getBalance(userId).toLocaleString()}** ${CURRENCY.name}`,
        COLORS.MONEY
    )] });
}

async function handleDaily(message) {
    const userId = message.author.id;
    if (!canClaimDaily(userId)) {
        const hours = (Date.now() - dailyCooldown.get(userId)) / (1000*60*60);
        return message.reply(`⏳ Còn ${Math.ceil(24-hours)} giờ nữa!`);
    }
    addMoney(userId, REWARDS.daily);
    dailyCooldown.set(userId, Date.now());
    await message.reply({ embeds: [createEmbed('🎁 Thưởng Ngày',
        `✅ Nhận ${formatMoney(REWARDS.daily)}!\nSố dư: ${formatMoney(getBalance(userId))}`,
        COLORS.SUCCESS
    )] });
}

async function handleTransfer(message, args) {
    if (args.length < 2) return message.reply('⚠️ `!transfer @user <số>`');
    const target = message.mentions.users.first();
    if (!target) return message.reply('⚠️ Tag người cần chuyển!');
    if (target.id === message.author.id) return message.reply('❌ Không thể tự chuyển!');
    
    const amount = parseInt(args[1]);
    if (isNaN(amount) || amount <= 0) return message.reply('⚠️ Nhập số xu hợp lệ!');
    
    if (!removeMoney(message.author.id, amount)) {
        return message.reply(`❌ Không đủ tiền! Số dư: ${formatMoney(getBalance(message.author.id))}`);
    }
    addMoney(target.id, amount);
    await message.reply({ embeds: [createEmbed('💸 Chuyển Tiền',
        `✅ Đã chuyển ${formatMoney(amount)} cho ${target.username}\nSố dư: ${formatMoney(getBalance(message.author.id))}`,
        COLORS.SUCCESS
    )] });
}

async function handleLeaderboard(message) {
    const sorted = Array.from(userBalances.entries())
        .sort((a,b) => b[1] - a[1])
        .slice(0, 10);
    if (sorted.length === 0) return message.reply('📊 Chưa có dữ liệu!');
    
    let desc = '🏆 **Bảng Xếp Hạng** 🏆\n\n';
    const medals = ['🥇','🥈','🥉'];
    for (let i = 0; i < sorted.length; i++) {
        const [uid, bal] = sorted[i];
        const user = await client.users.fetch(uid).catch(() => null);
        const medal = i < 3 ? medals[i] : `${i+1}.`;
        desc += `${medal} ${user ? user.username : 'Unknown'}: ${formatMoney(bal)}\n`;
    }
    await message.reply({ embeds: [createEmbed('🏆 Bảng Xếp Hạng', desc, COLORS.RARE)] });
}

// ==========================================
// 8. GAME HANGMAN
// ==========================================

const hangmanGames = new Map();

class HangmanGame {
    constructor() {
        const words = ['python', 'javascript', 'discord', 'game', 'developer', 
                       'programming', 'computer', 'internet', 'server', 'database'];
        this.word = words[Math.floor(Math.random() * words.length)];
        this.guessed = new Set();
        this.attempts = 6;
        this.maxAttempts = 6;
    }
    guessLetter(letter) {
        letter = letter.toLowerCase();
        if (this.guessed.has(letter)) {
            return { result: 'repeat', msg: `⚠️ Đã đoán '${letter}'!` };
        }
        this.guessed.add(letter);
        if (this.word.includes(letter)) {
            const display = this.getDisplay();
            if (!display.includes('_')) {
                return { result: 'win', msg: `🎉 CHÍNH XÁC! Từ là **${this.word}**!` };
            }
            return { result: 'correct', msg: `✅ Đúng! Từ: ${display}` };
        } else {
            this.attempts--;
            if (this.attempts === 0) {
                return { result: 'lose', msg: `💀 Thua! Từ là **${this.word}**` };
            }
            return { result: 'wrong', msg: `❌ Sai! Còn ${this.attempts}/${this.maxAttempts} lượt\nTừ: ${this.getDisplay()}` };
        }
    }
    getDisplay() {
        return this.word.split('').map(c => this.guessed.has(c) ? c : '_').join(' ');
    }
}

async function handleHangman(message, args) {
    const userId = message.author.id;
    if (args.length === 0) {
        const game = new HangmanGame();
        hangmanGames.set(userId, game);
        return message.reply({ embeds: [createEmbed('🔤 Đoán Từ',
            `Từ có ${game.word.length} chữ cái\nTừ: ${game.getDisplay()}\nCòn ${game.attempts} lượt`,
            COLORS.INFO
        )] });
    }
    const game = hangmanGames.get(userId);
    if (!game) return message.reply('❌ Gõ `!hangman` để bắt đầu!');
    
    const letter = args[0];
    if (letter.length !== 1 || !letter.match(/[a-zA-Z]/)) {
        return message.reply('⚠️ Nhập 1 chữ cái!');
    }
    
    const result = game.guessLetter(letter);
    if (result.result === 'win') {
        const reward = REWARDS.hangman;
        addMoney(userId, reward);
        result.msg += `\n💰 Nhận ${formatMoney(reward)}`;
        hangmanGames.delete(userId);
    } else if (result.result === 'lose') {
        hangmanGames.delete(userId);
    }
    await message.reply({ embeds: [createEmbed('🔤 Đoán Từ', result.msg, 
        result.result === 'win' ? COLORS.SUCCESS : result.result === 'lose' ? COLORS.ERROR : COLORS.INFO
    )] });
}

// ==========================================
// 9. GAME TRIVIA
// ==========================================

const triviaGames = new Map();

class TriviaGame {
    constructor() {
        this.questions = [
            { q: 'Thủ đô của Việt Nam?', opts: ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Hải Phòng'], ans: 0 },
            { q: 'Ngôn ngữ lập trình nào làm bot Discord?', opts: ['Python', 'JavaScript', 'Java', 'C++'], ans: 1 },
            { q: 'Hành tinh gần Mặt Trời nhất?', opts: ['Sao Kim', 'Sao Thủy', 'Trái Đất', 'Sao Hỏa'], ans: 1 },
            { q: '1 năm có bao nhiêu ngày?', opts: ['365', '366', '364', '360'], ans: 0 },
            { q: 'Phở là món ăn của nước nào?', opts: ['Trung Quốc', 'Nhật Bản', 'Việt Nam', 'Hàn Quốc'], ans: 2 }
        ];
        this.current = null;
        this.used = [];
        this.bet = 0;
    }
    getQuestion() {
        if (this.used.length >= this.questions.length) this.used = [];
        let available = this.questions.filter((_, i) => !this.used.includes(i));
        if (available.length === 0) {
            this.used = [];
            available = this.questions;
        }
        const idx = this.questions.indexOf(available[Math.floor(Math.random() * available.length)]);
        this.used.push(idx);
        this.current = this.questions[idx];
        return this.current;
    }
    checkAnswer(option) {
        if (!this.current) return null;
        return option === this.current.ans;
    }
}

async function handleTrivia(message, args) {
    const userId = message.author.id;
    if (args.length === 0) {
        const game = new TriviaGame();
        triviaGames.set(userId, game);
        const q = game.getQuestion();
        const embed = createEmbed('🧠 Đố Vui', `**${q.q}**`, COLORS.INFO, 
            q.opts.map((opt, i) => ({ name: `Lựa chọn ${i+1}`, value: opt, inline: true }))
        );
        embed.addFields({ name: '📝 Cách chơi', value: 'Gõ `!trivia <1-4>` để chọn', inline: false });
        return message.reply({ embeds: [embed] });
    }
    
    const game = triviaGames.get(userId);
    if (!game || !game.current) return message.reply('❌ Gõ `!trivia` để bắt đầu!');
    
    const ans = parseInt(args[0]) - 1;
    if (isNaN(ans) || ans < 0 || ans > 3) return message.reply('⚠️ Chọn số 1-4!');
    
    const correct = game.checkAnswer(ans);
    const q = game.current;
    let reward = 0;
    if (correct) {
        reward = REWARDS.trivia;
        addMoney(userId, reward);
        game.current = null;
    }
    await message.reply({ embeds: [createEmbed('🧠 Đố Vui',
        correct ? `✅ Đúng! 🎉\n💰 Nhận ${formatMoney(reward)}` : `❌ Sai! Đáp án: **${q.opts[q.ans]}**`,
        correct ? COLORS.SUCCESS : COLORS.ERROR
    )] });
    if (!correct) game.current = null;
}

// ==========================================
// 10. GAME BLACKJACK
// ==========================================

const blackjackGames = new Map();

class BlackjackGame {
    constructor() {
        this.deck = [];
        this.playerHand = [];
        this.botHand = [];
        this.gameOver = false;
        this.bet = 0;
        this.initDeck();
        this.shuffle();
        this.deal();
    }
    initDeck() {
        const suits = ['♠','♥','♦','♣'];
        const values = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
        for (const s of suits) for (const v of values) this.deck.push({s,v});
    }
    shuffle() {
        for (let i = this.deck.length-1; i>0; i--) {
            const j = Math.floor(Math.random()*(i+1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }
    deal() {
        this.playerHand.push(this.deck.pop(), this.deck.pop());
        this.botHand.push(this.deck.pop(), this.deck.pop());
    }
    calcScore(hand) {
        let score = 0, aces = 0;
        for (const card of hand) {
            if (card.v === 'A') { aces++; score += 11; }
            else if (['J','Q','K'].includes(card.v)) score += 10;
            else score += parseInt(card.v);
        }
        while (score > 21 && aces > 0) { score -= 10; aces--; }
        return score;
    }
    hit() {
        if (this.gameOver) return null;
        this.playerHand.push(this.deck.pop());
        const score = this.calcScore(this.playerHand);
        if (score > 21) {
            this.gameOver = true;
            return { result: 'bust', msg: '💥 Quá 21 điểm! Thua!' };
        }
        return { result: 'hit', msg: `✅ Rút được ${this.playerHand[this.playerHand.length-1].v}${this.playerHand[this.playerHand.length-1].s}\nĐiểm: ${score}` };
    }
    stand() {
        this.gameOver = true;
        let botScore = this.calcScore(this.botHand);
        while (botScore < 17) {
            this.botHand.push(this.deck.pop());
            botScore = this.calcScore(this.botHand);
        }
        const playerScore = this.calcScore(this.playerHand);
        if (botScore > 21) return { result: 'win', msg: `🎉 Bot quá 21! Bạn thắng!\nBạn: ${playerScore} | Bot: ${botScore}` };
        if (playerScore > botScore) return { result: 'win', msg: `🎉 Bạn thắng!\nBạn: ${playerScore} | Bot: ${botScore}` };
        if (playerScore < botScore) return { result: 'lose', msg: `😢 Bot thắng!\nBạn: ${playerScore} | Bot: ${botScore}` };
        return { result: 'tie', msg: `🤝 Hòa!\nBạn: ${playerScore} | Bot: ${botScore}` };
    }
}

async function handleBlackjack(message, args) {
    const userId = message.author.id;
    if (args.length === 0) {
        let bet = 0;
        const parts = message.content.split(' ');
        if (parts.length > 1) {
            bet = parseInt(parts[parts.length-1]);
            if (bet > 0 && !removeMoney(userId, bet)) {
                return message.reply(`❌ Không đủ tiền! Số dư: ${formatMoney(getBalance(userId))}`);
            }
        }
        if (blackjackGames.has(userId)) return message.reply('❌ Đang chơi! Dùng `!bj hit` hoặc `!bj stand`');
        const game = new BlackjackGame();
        game.bet = bet;
        blackjackGames.set(userId, game);
        const score = game.calcScore(game.playerHand);
        return message.reply({ embeds: [createEmbed('🃏 Blackjack',
            `Bạn: ${game.playerHand.map(c => c.v+c.s).join(' ')} (${score} điểm)\nBot: ${game.botHand[0].v}${game.botHand[0].s} ❓❓\n${bet > 0 ? `💰 Cược: ${formatMoney(bet)}` : '💰 Chơi miễn phí'}`,
            COLORS.DICE,
            [{ name: '📝 Cách chơi', value: '`!bj hit` - Rút thêm\n`!bj stand` - Dừng', inline: true }]
        )] });
    }
    
    const game = blackjackGames.get(userId);
    if (!game) return message.reply('❌ Gõ `!blackjack` để bắt đầu!');
    
    const action = args[0].toLowerCase();
    let result;
    if (action === 'hit') result = game.hit();
    else if (action === 'stand') result = game.stand();
    else return message.reply('⚠️ Gõ `!bj hit` hoặc `!bj stand`');
    
    if (!result) return message.reply('❌ Game đã kết thúc!');
    
    if (result.result === 'win') {
        const reward = Math.floor(REWARDS.blackjack * (game.bet > 0 ? 2 : 1));
        addMoney(userId, reward);
        result.msg += `\n💰 Nhận ${formatMoney(reward)}`;
        blackjackGames.delete(userId);
    } else if (result.result === 'lose' || result.result === 'bust') {
        blackjackGames.delete(userId);
    }
    
    await message.reply({ embeds: [createEmbed('🃏 Blackjack', result.msg,
        result.result === 'win' ? COLORS.SUCCESS : result.result === 'lose' ? COLORS.ERROR : COLORS.INFO
    )] });
}

// ==========================================
// 11. GAME SLOT
// ==========================================

async function handleSlot(message, args) {
    const userId = message.author.id;
    let bet = 100;
    if (args.length > 0) {
        bet = parseInt(args[0]);
        if (isNaN(bet) || bet <= 0) return message.reply('⚠️ Nhập số xu hợp lệ!');
    }
    if (!removeMoney(userId, bet)) {
        return message.reply(`❌ Không đủ tiền! Số dư: ${formatMoney(getBalance(userId))}`);
    }
    
    const symbols = ['🍒','🍋','🍇','🍉','⭐','💎','7️⃣'];
    const result = [];
    for (let i = 0; i < 3; i++) {
        result.push(symbols[Math.floor(Math.random() * symbols.length)]);
    }
    
    let reward = 0, msg = '';
    if (result[0] === result[1] && result[1] === result[2]) {
        if (result[0] === '💎') { reward = bet * 10; msg = '💎 **JACKPOT!** x10'; }
        else if (result[0] === '7️⃣') { reward = bet * 5; msg = '🎰 **TRÙNG 3!** x5'; }
        else { reward = bet * 3; msg = `🎉 Trúng 3 ${result[0]}! x3`; }
    } else if (result[0] === result[1] || result[1] === result[2] || result[0] === result[2]) {
        reward = Math.floor(bet * 1.5);
        msg = '😊 Trúng 2! x1.5';
    } else {
        msg = '😢 Chúc may mắn lần sau!';
    }
    
    if (reward > 0) addMoney(userId, reward);
    
    await message.reply({ embeds: [createEmbed('🎰 Slot Machine',
        `**${result.join(' | ')}**\n\n${msg}\n${reward > 0 ? `💰 Nhận ${formatMoney(reward)}` : `💸 Mất ${formatMoney(bet)}`}`,
        reward > 0 ? COLORS.SUCCESS : COLORS.ERROR,
        [{ name: '💰 Số dư', value: formatMoney(getBalance(userId)), inline: true }]
    )] });
}

// ==========================================
// 12. XỬ LÝ BUTTON
// ==========================================

async function handleTicTacToeButton(interaction) {
    const gameId = interaction.message.id;
    const game = ticTacToeGames.get(gameId);
    if (!game) {
        return interaction.reply({ content: '❌ Game đã kết thúc!', ephemeral: true });
    }
    
    const index = parseInt(interaction.customId.split('_')[1]);
    if (game.board[index] !== ' ' || game.turn !== 'player') {
        return interaction.reply({ content: '❌ Không thể chọn ô này!', ephemeral: true });
    }
    
    if (!game.makeMove(index, 'player')) {
        return interaction.reply({ content: '❌ Lỗi!', ephemeral: true });
    }
    
    let winner = game.checkWinner();
    const userId = interaction.user.id;
    
    if (timeouts.has(gameId)) {
        clearTimeout(timeouts.get(gameId));
        timeouts.delete(gameId);
    }
    
    if (winner) {
        const isWin = winner === 'X';
        if (isWin) {
            const reward = Math.floor(REWARDS.tictactoe * (game.bet > 0 ? 2 : 1));
            addMoney(userId, reward);
            await interaction.update({ 
                embeds: [createEmbed('🎮 Cờ Caro', `🎉 **Bạn thắng!**\n💰 Nhận ${formatMoney(reward)}`, COLORS.SUCCESS)],
                components: [] 
            });
        } else {
            await interaction.update({ 
                embeds: [createEmbed('🎮 Cờ Caro', '😢 **Bot thắng!**', COLORS.ERROR)],
                components: [] 
            });
        }
        ticTacToeGames.delete(gameId);
        return;
    }
    
    if (game.isFull()) {
        await interaction.update({ 
            embeds: [createEmbed('🎮 Cờ Caro', '🤝 **Hòa!**', COLORS.TIE)],
            components: [] 
        });
        ticTacToeGames.delete(gameId);
        return;
    }
    
    const rows = createBoard(game);
    await interaction.update({ 
        embeds: [createEmbed('🎮 Cờ Caro', '**🤖 Lượt của bot...**', COLORS.GAME)],
        components: rows 
    });
    
    const timeout = setTimeout(async () => {
        const updatedGame = ticTacToeGames.get(gameId);
        if (!updatedGame) {
            timeouts.delete(gameId);
            return;
        }
        
        const botIndex = updatedGame.botMove();
        if (botIndex === -1) {
            timeouts.delete(gameId);
            return;
        }
        
        updatedGame.makeMove(botIndex, 'bot');
        const winner2 = updatedGame.checkWinner();
        
        if (winner2) {
            const isWin = winner2 === 'X';
            if (isWin) {
                const reward = Math.floor(REWARDS.tictactoe * (updatedGame.bet > 0 ? 2 : 1));
                addMoney(userId, reward);
                await interaction.editReply({ 
                    embeds: [createEmbed('🎮 Cờ Caro', `🎉 **Bạn thắng!**\n💰 Nhận ${formatMoney(reward)}`, COLORS.SUCCESS)],
                    components: [] 
                });
            } else {
                await interaction.editReply({ 
                    embeds: [createEmbed('🎮 Cờ Caro', '😢 **Bot thắng!**', COLORS.ERROR)],
                    components: [] 
                });
            }
            ticTacToeGames.delete(gameId);
            timeouts.delete(gameId);
            return;
        }
        
        if (updatedGame.isFull()) {
            await interaction.editReply({ 
                embeds: [createEmbed('🎮 Cờ Caro', '🤝 **Hòa!**', COLORS.TIE)],
                components: [] 
            });
            ticTacToeGames.delete(gameId);
            timeouts.delete(gameId);
            return;
        }
        
        const rows2 = createBoard(updatedGame);
        await interaction.editReply({ 
            embeds: [createEmbed('🎮 Cờ Caro', '**🎯 Lượt của bạn!**', COLORS.GAME)],
            components: rows2 
        });
        timeouts.delete(gameId);
    }, 800);
    
    timeouts.set(gameId, timeout);
}

// ==========================================
// 13. LỆNH XỔ SỐ - LÔ ĐỀ
// ==========================================

function generateNumber() {
    return Math.floor(Math.random() * 100).toString().padStart(2, '0');
}

function getLotteryResult() {
    return {
        special: generateNumber(),
        first: generateNumber(),
        second: [generateNumber(), generateNumber()],
        third: [generateNumber(), generateNumber(), generateNumber()]
    };
}

function checkWin(betNumber, result) {
    const all = [result.special, result.first, ...result.second, ...result.third];
    return all.includes(betNumber);
}

function calcReward(betNumber, result, betAmount) {
    if (betNumber === result.special) return betAmount * 70;
    if (betNumber === result.first) return betAmount * 50;
    if (result.second.includes(betNumber)) return betAmount * 30;
    if (result.third.includes(betNumber)) return betAmount * 20;
    return 0;
}

async function handleDe(message, args) {
    const userId = message.author.id;
    if (args.length < 2) return message.reply('⚠️ `!de <số 00-99> <cược>`');
    
    const betNum = args[0].padStart(2, '0');
    if (!/^\d{2}$/.test(betNum)) return message.reply('⚠️ Nhập số 00-99!');
    
    const betAmount = parseInt(args[1]);
    if (isNaN(betAmount) || betAmount <= 0) return message.reply('⚠️ Nhập số xu hợp lệ!');
    
    if (!removeMoney(userId, betAmount)) {
        return message.reply(`❌ Không đủ tiền! Số dư: ${formatMoney(getBalance(userId))}`);
    }
    
    const result = getLotteryResult();
    const isWin = checkWin(betNum, result);
    let reward = 0;
    let msg = '';
    
    if (isWin) {
        reward = calcReward(betNum, result, betAmount);
        addMoney(userId, reward);
        msg = `🎉 **TRÚNG ĐỀ!** Số ${betNum} về!\n💰 Nhận ${formatMoney(reward)}`;
    } else {
        msg = `😢 Không trúng! Số ${betNum} không về.\n💸 Mất ${formatMoney(betAmount)}`;
    }
    
    await message.reply({ embeds: [createEmbed('🎰 Kết Quả Xổ Số',
        `ĐB: ${result.special} | Nhất: ${result.first}\nNhì: ${result.second.join(' ')} | Ba: ${result.third.join(' ')}`,
        isWin ? COLORS.SUCCESS : COLORS.ERROR,
        [{ name: '📊 Kết quả', value: msg }, { name: '💰 Số dư', value: formatMoney(getBalance(userId)), inline: true }]
    )] });
}

async function handleLo(message, args) {
    const userId = message.author.id;
    if (args.length < 2) return message.reply('⚠️ `!lo <số 00-99> <cược>`');
    
    const betNum = args[0].padStart(2, '0');
    if (!/^\d{2}$/.test(betNum)) return message.reply('⚠️ Nhập số 00-99!');
    
    const betAmount = parseInt(args[1]);
    if (isNaN(betAmount) || betAmount <= 0) return message.reply('⚠️ Nhập số xu hợp lệ!');
    
    if (!removeMoney(userId, betAmount)) {
        return message.reply(`❌ Không đủ tiền! Số dư: ${formatMoney(getBalance(userId))}`);
    }
    
    const result = getLotteryResult();
    const isWin = checkWin(betNum, result);
    let reward = 0;
    let msg = '';
    
    if (isWin) {
        reward = calcReward(betNum, result, betAmount);
        addMoney(userId, reward);
        msg = `🎉 **TRÚNG LÔ!** Số ${betNum} về!\n💰 Nhận ${formatMoney(reward)}`;
    } else {
        msg = `😢 Không trúng! Số ${betNum} không về.\n💸 Mất ${formatMoney(betAmount)}`;
    }
    
    await message.reply({ embeds: [createEmbed('🎰 Kết Quả Xổ Số',
        `ĐB: ${result.special} | Nhất: ${result.first}\nNhì: ${result.second.join(' ')} | Ba: ${result.third.join(' ')}`,
        isWin ? COLORS.SUCCESS : COLORS.ERROR,
        [{ name: '📊 Kết quả', value: msg }, { name: '💰 Số dư', value: formatMoney(getBalance(userId)), inline: true }]
    )] });
}

async function handleTaiXiu(message, args) {
    const userId = message.author.id;
    if (args.length < 2) return message.reply('⚠️ `!taixiu <tài|xiu> <cược>`');
    
    const choice = args[0].toLowerCase();
    if (!['tài','xiu'].includes(choice)) return message.reply('⚠️ Chọn `tài` hoặc `xiu`!');
    
    const betAmount = parseInt(args[1]);
    if (isNaN(betAmount) || betAmount <= 0) return message.reply('⚠️ Nhập số xu hợp lệ!');
    
    if (!removeMoney(userId, betAmount)) {
        return message.reply(`❌ Không đủ tiền! Số dư: ${formatMoney(getBalance(userId))}`);
    }
    
    const d1 = Math.floor(Math.random()*6)+1;
    const d2 = Math.floor(Math.random()*6)+1;
    const d3 = Math.floor(Math.random()*6)+1;
    const total = d1+d2+d3;
    const result = total >= 11 ? 'tài' : 'xiu';
    const isWin = choice === result;
    const emojis = ['⚀','⚁','⚂','⚃','⚄','⚅'];
    
    let reward = 0;
    let msg = '';
    if (isWin) {
        reward = betAmount * 2;
        addMoney(userId, reward);
        msg = `🎉 **THẮNG!** ${choice} (tổng ${total})`;
    } else {
        msg = `😢 **THUA!** ${choice} (tổng ${total})`;
    }
    
    await message.reply({ embeds: [createEmbed('🎲 Tài Xỉu',
        `${emojis[d1-1]} ${emojis[d2-1]} ${emojis[d3-1]}\nTổng: ${total}`,
        isWin ? COLORS.SUCCESS : COLORS.ERROR,
        [{ name: '📊 Kết quả', value: msg }, { name: '💰 Thưởng', value: isWin ? formatMoney(reward) : '0 xu', inline: true }]
    )] });
}

// ==========================================
// 14. LỆNH !GAME (ĐÃ SỬA LỖI)
// ==========================================

async function handleGameCommand(message) {
    const userId = message.author.id;
    const balance = getBalance(userId);
    const isAdminUser = isAdmin(userId);
    
    const embed1 = createEmbed(
        '🎮 **TRUNG TÂM GAME (1/2)**',
        `💰 Số dư: ${formatMoney(balance)}${isAdminUser ? '\n🔐 **Bạn là Admin!**' : ''}`,
        COLORS.INFO,
        [
            { name: '━━━ 🎯 GAME GIẢI TRÍ ━━━', value: '─────────────────', inline: false },
            { name: '`!guess [cược]`', value: '🎯 Đoán số (1-100)', inline: true },
            { name: '`!dice`', value: '🎲 Tung xúc xắc', inline: true },
            { name: '`!rps [kéo|búa|bao]`', value: '✊ Kéo búa bao', inline: true },
            { name: '━━━ 🧠 GAME TRÍ TUỆ ━━━', value: '─────────────────', inline: false },
            { name: '`!hangman`', value: '🔤 Đoán từ', inline: true },
            { name: '`!trivia`', value: '🧠 Đố vui', inline: true },
            { name: '━━━ 🃏 GAME MAY RỦI ━━━', value: '─────────────────', inline: false },
            { name: '`!blackjack`', value: '🃏 Blackjack 21 điểm', inline: true },
            { name: '`!slot [cược]`', value: '🎰 Máy đánh bạc', inline: true },
            { name: '`!tictactoe [cược]`', value: '🎮 Cờ caro', inline: true }
        ]
    );
    
    const embed2 = createEmbed(
        '🎮 **TRUNG TÂM GAME (2/2)**',
        `💰 Số dư: ${formatMoney(balance)}${isAdminUser ? '\n🔐 **Bạn là Admin!**' : ''}`,
        COLORS.INFO,
        [
            { name: '━━━ 🎰 XỔ SỐ ━━━', value: '─────────────────', inline: false },
            { name: '`!de <số> <cược>`', value: '🎯 Đánh đề (x70)', inline: true },
            { name: '`!lo <số> <cược>`', value: '🎯 Đánh lô (x20-50)', inline: true },
            { name: '`!taixiu <tài|xiu> <cược>`', value: '🎲 Tài Xỉu (x2)', inline: true },
            { name: '━━━ 💰 TIỀN TỆ ━━━', value: '─────────────────', inline: false },
            { name: '`!balance`', value: '💰 Kiểm tra số dư', inline: true },
            { name: '`!daily`', value: '🎁 Nhận thưởng ngày', inline: true },
            { name: '`!transfer @user <số>`', value: '💸 Chuyển tiền', inline: true },
            { name: '`!leaderboard`', value: '🏆 Bảng xếp hạng', inline: true }
        ]
    );
    
    // Thêm lệnh Admin nếu là Admin
    if (isAdminUser) {
        embed2.addFields({
            name: '━━━ 🔐 LỆNH ADMIN ━━━',
            value: '─────────────────\n`!admin` để xem danh sách',
            inline: false
        });
    }
    
    await message.reply({ embeds: [embed1] });
    await message.reply({ embeds: [embed2] });
}

// ==========================================
// 15. LỆNH ADMIN
// ==========================================

async function handleAdminCommand(message, args) {
    const userId = message.author.id;
    if (!isAdmin(userId)) {
        return message.reply('❌ Bạn không có quyền!');
    }
    
    if (args.length === 0) {
        return message.reply({ embeds: [createEmbed('🔐 Lệnh Admin',
            '`!admin give @user <số>` - Cộng xu\n' +
            '`!admin remove @user <số>` - Trừ xu\n' +
            '`!admin set @user <số>` - Set xu\n' +
            '`!admin broadcast <nội dung>` - Thông báo\n' +
            '`!admin resetgames` - Reset game\n' +
            '`!admin cleardata` - Xóa dữ liệu\n' +
            '`!admin shutdown` - Tắt bot',
            COLORS.ADMIN
        )] });
    }
    
    const sub = args[0].toLowerCase();
    const subArgs = args.slice(1);
    
    if (sub === 'give') {
        const target = message.mentions.users.first();
        if (!target) return message.reply('⚠️ Tag người cần cộng!');
        const amount = parseInt(subArgs[1]);
        if (isNaN(amount) || amount <= 0) return message.reply('⚠️ Nhập số xu hợp lệ!');
        addMoney(target.id, amount);
        return message.reply(`✅ Đã cộng ${formatMoney(amount)} cho ${target.username}`);
    }
    
    if (sub === 'remove') {
        const target = message.mentions.users.first();
        if (!target) return message.reply('⚠️ Tag người cần trừ!');
        const amount = parseInt(subArgs[1]);
        if (isNaN(amount) || amount <= 0) return message.reply('⚠️ Nhập số xu hợp lệ!');
        if (!removeMoney(target.id, amount)) return message.reply(`❌ ${target.username} không đủ tiền!`);
        return message.reply(`✅ Đã trừ ${formatMoney(amount)} của ${target.username}`);
    }
    
    if (sub === 'set') {
        const target = message.mentions.users.first();
        if (!target) return message.reply('⚠️ Tag người cần set!');
        const amount = parseInt(subArgs[1]);
        if (isNaN(amount) || amount < 0) return message.reply('⚠️ Nhập số xu hợp lệ!');
        userBalances.set(target.id, amount);
        return message.reply(`✅ Đã set số dư của ${target.username} thành ${formatMoney(amount)}`);
    }
    
    if (sub === 'broadcast') {
        const content = subArgs.join(' ');
        if (!content) return message.reply('⚠️ Nhập nội dung!');
        const embed = createEmbed('📢 Thông Báo', content, COLORS.ADMIN);
        for (const guild of client.guilds.cache.values()) {
            const channel = guild.channels.cache.filter(c => c.type === 0).first();
            if (channel) await channel.send({ embeds: [embed] });
        }
        return message.reply('✅ Đã gửi thông báo!');
    }
    
    if (sub === 'resetgames') {
        guessGames.clear();
        ticTacToeGames.clear();
        hangmanGames.clear();
        triviaGames.clear();
        blackjackGames.clear();
        return message.reply('✅ Đã reset tất cả game!');
    }
    
    if (sub === 'cleardata') {
        userBalances.clear();
        dailyCooldown.clear();
        return message.reply('✅ Đã xóa toàn bộ dữ liệu!');
    }
    
    if (sub === 'shutdown') {
        await message.reply('🔴 Bot đang tắt...');
        process.exit(0);
    }
    
    return message.reply('⚠️ Lệnh admin không hợp lệ!');
}

// ==========================================
// 16. SỰ KIỆN BOT
// ==========================================

client.once('ready', () => {
    console.log('='.repeat(50));
    console.log(`✅ BOT ĐÃ SẴN SÀNG!`);
    console.log(`📛 Tên: ${client.user.tag}`);
    console.log(`🌐 Server: ${client.guilds.cache.size}`);
    console.log(`👥 Users: ${client.users.cache.size}`);
    console.log(`🔐 Admin ID: ${ADMIN_IDS.join(', ')}`);
    console.log('='.repeat(50));
    client.user.setActivity('!help để xem game', { type: 'PLAYING' });
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId.startsWith('ttt_')) {
        await handleTicTacToeButton(interaction);
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
            case 'help':
                await handleHelp(message);
                break;
            case 'game':
                await handleGameCommand(message);
                break;
            case 'guess':
                await handleGuess(message, args);
                break;
            case 'dice':
                await handleDice(message);
                break;
            case 'rps':
                await handleRPS(message, args);
                break;
            case 'tictactoe':
            case 'ttt':
                await handleTicTacToe(message);
                break;
            case 'hangman':
                await handleHangman(message, args);
                break;
            case 'trivia':
                await handleTrivia(message, args);
                break;
            case 'blackjack':
            case 'bj':
                await handleBlackjack(message, args);
                break;
            case 'slot':
                await handleSlot(message, args);
                break;
            case 'de':
                await handleDe(message, args);
                break;
            case 'lo':
                await handleLo(message, args);
                break;
            case 'taixiu':
            case 'tx':
                await handleTaiXiu(message, args);
                break;
            case 'balance':
            case 'bal':
                await handleBalance(message);
                break;
            case 'daily':
                await handleDaily(message);
                break;
            case 'transfer':
            case 'pay':
                await handleTransfer(message, args);
                break;
            case 'leaderboard':
            case 'lb':
                await handleLeaderboard(message);
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
// 17. KHỞI ĐỘNG BOT
// ==========================================

const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.error('❌ Không tìm thấy DISCORD_TOKEN!');
    process.exit(1);
}

client.login(token).catch(error => {
    console.error('❌ Lỗi đăng nhập:', error);
    process.exit(1);
});

process.on('unhandledRejection', error => {
    console.error('⚠️ Unhandled Rejection:', error);
});
