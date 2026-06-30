const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Tạo client bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Load config
const config = require('./config.json');

// Tạo collection để lưu commands
client.commands = new Collection();

// Load commands từ thư mục commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
        console.log(`⚠️ Command ${file} missing required properties`);
    }
}

// Sự kiện khi bot sẵn sàng
client.once(Events.ClientReady, () => {
    console.log(`✅ Bot đã sẵn sàng! Đăng nhập với tên: ${client.user.tag}`);
    console.log(`📊 Đang hoạt động trên ${client.guilds.cache.size} servers`);
});

// Sự kiện khi có tin nhắn
client.on(Events.MessageCreate, async (message) => {
    // Bỏ qua tin nhắn từ bot
    if (message.author.bot) return;
    
    // Prefix mặc định
    const prefix = '!';
    
    // Kiểm tra tin nhắn bắt đầu bằng prefix
    if (!message.content.startsWith(prefix)) return;
    
    // Tách command và arguments
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    // Tìm command
    const command = client.commands.get(commandName);
    if (!command) return;
    
    try {
        // Thực thi command
        await command.execute(message, args);
    } catch (error) {
        console.error(error);
        await message.reply('Có lỗi xảy ra khi thực thi command này!');
    }
});

// Sự kiện khi có tương tác slash command
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({
            content: 'Có lỗi xảy ra khi thực thi command này!',
            ephemeral: true
        });
    }
});

// Đăng nhập bot
client.login(config.token);
