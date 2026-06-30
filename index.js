// ==========================================
// DISCORD GAME BOT - FULL INTEGRATED CODE
// ==========================================

const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    Events,
    Partials  // THÊM PARTIALS
} = require('discord.js');

// ==========================================
// 1. CẤU HÌNH BOT - SỬA INTENTS
// ==========================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,  // THÊM
        GatewayIntentBits.GuildMessageReactions,  // THÊM
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction
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
    TIE: 0xFFFF00
};

// ==========================================
// 2. LƯU TRỮ DỮ LIỆU GAME
// ==========================================

const gameStates = new Map();
const ticTacToeGames = new Map();

// ==========================================
// 3. CLASS GAME ĐOÁN SỐ
// ==========================================

class GuessGame {
    constructor() {
        this.number = Math.floor(Math.random() * 100) + 1;
        this.attempts = 0;
        this.guessed = false;
        this.startTime = Date.now();
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
// 4. CLASS GAME CỜ CARO
// ==========================================

class TicTacToe {
    constructor() {
        this.board = Array(9).fill(' ');
        this.turn = 'player';
        this.moves = 0;
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
// 5. HÀM TIỆN ÍCH
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

function getDiceEmoji(value) {
    const emojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    return emojis[value - 1];
}

function getDiceName(value) {
    const names = ['một', 'hai', 'ba', 'bốn', 'năm', 'sáu'];
    return names[value - 1];
}

// ==========================================
// 6. TẠO BOARD CỜ CARO
// ==========================================

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

// ==========================================
// 7. XỬ LÝ LỆNH
// ==========================================

async function handleGuessCommand(message, args) {
    const userId = message.author.id;

    if (args.length === 0) {
        const game = new GuessGame();
        gameStates.set(userId, game);

        const embed = createEmbed(
            '🎯 Game Đoán Số',
            'Tôi đã chọn một số từ 1 đến 100!',
            COLORS.SUCCESS,
            [
                { name: '📝 Cách chơi', value: 'Gõ `!guess <số>` để đoán', inline: true },
                { name: '💡 Gợi ý', value: 'Số của tôi nằm trong khoảng 1-100', inline: true }
            ]
        );
        embed.setFooter({ text: '🍀 Chúc bạn may mắn!' });
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
    const embed = createEmbed('🎯 Game Đoán Số', result.message, result.color);
    
    if (game.guessed) {
        embed.addFields({ name: '📊 Thống kê', value: game.getStats() });
        embed.setFooter({ text: '🎉 Chúc mừng bạn đã thắng!' });
    }

    await message.reply({ embeds: [embed] });
}

async function handleTicTacToeCommand(message) {
    const game = new TicTacToe();
    const gameId = Date.now().toString() + message.author.id;
    ticTacToeGames.set(gameId, game);

    const embed = createEmbed(
        '🎮 Game Cờ Caro',
        '**Lượt của bạn!** Chọn ô bên dưới',
        COLORS.GAME,
        [
            { name: '❌ Bạn', value: 'X', inline: true },
            { name: '⭕ Bot', value: 'O', inline: true },
            { name: '📊 Trạng thái', value: 'Đang chơi...', inline: true }
        ]
    );

    const rows = createTicTacToeBoard(game);
    const msg = await message.reply({ embeds: [embed], components: rows });
    
    ticTacToeGames.set(msg.id, game);
    ticTacToeGames.delete(gameId);
}

async function handleRPSCommand(message, args) {
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
    
    let result, color;
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
            { name: '📊 Thống kê', value: `Bạn chọn: ${userChoice}\nBot chọn: ${botChoice}`, inline: true }
        ]
    );

    await message.reply({ embeds: [embed] });
}

async function handleDiceCommand(message) {
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const total = dice1 + dice2;

    const embed = createEmbed(
        '🎲 Game Xúc Xắc',
        `${getDiceEmoji(dice1)} ${getDiceEmoji(dice2)}`,
        COLORS.DICE,
        [
            { name: '🎲 Kết quả', value: `**${getDiceName(dice1)}** + **${getDiceName(dice2)}** = **${total}**`, inline: false },
            { name: '📊 Tổng', value: `${total} điểm`, inline: true },
            { name: '🎯 Trạng thái', value: total >= 7 ? '🔥 Cao' : '❄️ Thấp', inline: true }
        ]
    );
    embed.setFooter({ text: `Lần tung của ${message.author.username}` });

    await message.reply({ embeds: [embed] });
}

async function handleHelpCommand(message) {
    const embed = createEmbed(
        '🎮 Danh sách lệnh game',
        'Dưới đây là các game có sẵn:',
        COLORS.INFO,
        [
            { name: '🎯 `!guess`', value: 'Game đoán số (1-100)', inline: true },
            { name: '🎲 `!dice`', value: 'Tung xúc xắc', inline: true },
            { name: '✊ `!rps [kéo|búa|bao]`', value: 'Kéo búa bao', inline: true },
            { name: '🎮 `!tictactoe`', value: 'Cờ caro với bot', inline: true },
            { name: '❓ `!help`', value: 'Hiển thị hướng dẫn này', inline: true }
        ]
    );
    embed.setFooter({ text: 'Chúc bạn chơi vui vẻ! 🎉' });

    await message.reply({ embeds: [embed] });
}

// ==========================================
// 8. XỬ LÝ BUTTON INTERACTION
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
    if (winner) {
        const result = winner === 'X' ? '🎉 Bạn thắng!' : '😢 Bot thắng!';
        const color = winner === 'X' ? COLORS.SUCCESS : COLORS.ERROR;
        const embed = createEmbed('🎮 Game Cờ Caro', `**${result}**`, color);
        embed.setFooter({ text: '🏆 Trò chơi kết thúc!' });
        
        await interaction.update({ embeds: [embed], components: [] });
        ticTacToeGames.delete(gameId);
        return;
    }

    if (game.isFull()) {
        const embed = createEmbed('🎮 Game Cờ Caro', '🤝 **Hòa!**', COLORS.TIE);
        embed.setFooter({ text: 'Không ai thắng!' });
        
        await interaction.update({ embeds: [embed], components: [] });
        ticTacToeGames.delete(gameId);
        return;
    }

    const rows = createTicTacToeBoard(game);
    const embed = createEmbed(
        '🎮 Game Cờ Caro',
        '**🤖 Lượt của bot...**',
        COLORS.GAME,
        [
            { name: '❌ Bạn', value: 'X', inline: true },
            { name: '⭕ Bot', value: 'O', inline: true },
            { name: '📊 Trạng thái', value: 'Bot đang suy nghĩ...', inline: true }
        ]
    );
    
    await interaction.update({ embeds: [embed], components: rows });

    setTimeout(async () => {
        const updatedGame = ticTacToeGames.get(gameId);
        if (!updatedGame) return;

        const botIndex = updatedGame.botMove();
        if (botIndex === -1) return;

        updatedGame.makeMove(botIndex, 'bot');

        const winner2 = updatedGame.checkWinner();
        if (winner2) {
            const result = winner2 === 'X' ? '🎉 Bạn thắng!' : '😢 Bot thắng!';
            const color = winner2 === 'X' ? COLORS.SUCCESS : COLORS.ERROR;
            const embed = createEmbed('🎮 Game Cờ Caro', `**${result}**`, color);
            embed.setFooter({ text: '🏆 Trò chơi kết thúc!' });
            
            await interaction.editReply({ embeds: [embed], components: [] });
            ticTacToeGames.delete(gameId);
            return;
        }

        if (updatedGame.isFull()) {
            const embed = createEmbed('🎮 Game Cờ Caro', '🤝 **Hòa!**', COLORS.TIE);
            embed.setFooter({ text: 'Không ai thắng!' });
            
            await interaction.editReply({ embeds: [embed], components: [] });
            ticTacToeGames.delete(gameId);
            return;
        }

        const rows2 = createTicTacToeBoard(updatedGame);
        const embed2 = createEmbed(
            '🎮 Game Cờ Caro',
            '**🎯 Lượt của bạn!**',
            COLORS.GAME,
            [
                { name: '❌ Bạn', value: 'X', inline: true },
                { name: '⭕ Bot', value: 'O', inline: true },
                { name: '📊 Trạng thái', value: 'Đến lượt bạn!', inline: true }
            ]
        );
        
        await interaction.editReply({ embeds: [embed2], components: rows2 });
    }, 1000);
}

// ==========================================
// 9. SỰ KIỆN BOT
// ==========================================

client.once('ready', () => {
    console.log('='.repeat(50));
    console.log(`✅ BOT ĐÃ SẴN SÀNG!`);
    console.log(`📛 Tên: ${client.user.tag}`);
    console.log(`🌐 Server: ${client.guilds.cache.size}`);
    console.log(`👥 Users: ${client.users.cache.size}`);
    console.log('='.repeat(50));
    client.user.setActivity('!help để xem lệnh', { type: 'PLAYING' });
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
                await handleHelpCommand(message);
                break;
            case 'guess':
                await handleGuessCommand(message, args);
                break;
            case 'tictactoe':
            case 'ttt':
                await handleTicTacToeCommand(message);
                break;
            case 'rps':
                await handleRPSCommand(message, args);
                break;
            case 'dice':
                await handleDiceCommand(message);
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
// 10. KHỞI ĐỘNG BOT
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
