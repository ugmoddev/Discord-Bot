const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
require('dotenv').config();

// Tạo bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Khi bot online
client.once('ready', () => {
    console.log(`✅ Bot đã online: ${client.user.tag}`);
    console.log(`📊 Đang ở ${client.guilds.cache.size} server`);
    console.log(`👥 Phục vụ ${client.users.cache.size} người dùng`);
});

// Xử lý tin nhắn
client.on('messageCreate', async (message) => {
    // Bỏ qua tin nhắn từ bot
    if (message.author.bot) return;
    
    // Prefix là dấu .
    if (!message.content.startsWith('.')) return;
    
    // Lấy lệnh
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    // Lệnh ping
    if (command === 'ping') {
        const sent = await message.reply('🏓 Đang tính...');
        const ping = sent.createdTimestamp - message.createdTimestamp;
        await sent.edit(`🏓 Pong! Ping: ${ping}ms | WebSocket: ${Math.round(client.ws.ping)}ms`);
    }
    
    // Lệnh hello
    if (command === 'hello') {
        await message.reply(`👋 Xin chào ${message.author.username}!`);
    }
    
    // Lệnh info
    if (command === 'info') {
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('🤖 Thông tin Bot')
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                { name: '📛 Tên', value: client.user.username, inline: true },
                { name: '🆔 ID', value: client.user.id, inline: true },
                { name: '📊 Servers', value: `${client.guilds.cache.size}`, inline: true },
                { name: '👥 Users', value: `${client.users.cache.size}`, inline: true },
                { name: '⏰ Uptime', value: `${Math.floor(client.uptime / 1000)} giây`, inline: true },
                { name: '📦 Node.js', value: process.version, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Bot của bạn' });
        
        await message.reply({ embeds: [embed] });
    }
    
    // Lệnh infobot (thông tin chi tiết về bot)
    if (command === 'infobot') {
        const uptime = client.uptime;
        const days = Math.floor(uptime / 86400000);
        const hours = Math.floor((uptime % 86400000) / 3600000);
        const minutes = Math.floor((uptime % 3600000) / 60000);
        const seconds = Math.floor((uptime % 60000) / 1000);
        
        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('📊 Thông tin chi tiết về Bot')
            .setThumbnail(client.user.displayAvatarURL({ size: 512 }))
            .addFields(
                { name: '🤖 Tên Bot', value: client.user.username, inline: true },
                { name: '🆔 ID Bot', value: client.user.id, inline: true },
                { name: '📅 Ngày tạo', value: client.user.createdAt.toLocaleString('vi-VN'), inline: true },
                { name: '📊 Số Server', value: `${client.guilds.cache.size}`, inline: true },
                { name: '👥 Số User', value: `${client.users.cache.size}`, inline: true },
                { name: '💬 Số Channel', value: `${client.channels.cache.size}`, inline: true },
                { name: '⏰ Thời gian hoạt động', value: `${days} ngày ${hours} giờ ${minutes} phút ${seconds} giây`, inline: false },
                { name: '📦 Phiên bản Node.js', value: process.version, inline: true },
                { name: '💻 Phiên bản Discord.js', value: require('discord.js').version, inline: true },
                { name: '💾 RAM sử dụng', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true }
            )
            .setTimestamp()
            .setFooter({ 
                text: `Yêu cầu bởi ${message.author.username}`,
                iconURL: message.author.displayAvatarURL()
            });
        
        await message.reply({ embeds: [embed] });
    }
    
    // Lệnh server (thông tin server)
    if (command === 'server') {
        const guild = message.guild;
        const embed = new EmbedBuilder()
            .setColor(0xff9900)
            .setTitle(`📊 Thông tin Server: ${guild.name}`)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
                { name: '👥 Thành viên', value: `${guild.memberCount}`, inline: true },
                { name: '📅 Ngày tạo', value: guild.createdAt.toLocaleString('vi-VN'), inline: true },
                { name: '💬 Channels', value: `${guild.channels.cache.size}`, inline: true },
                { name: '🎭 Roles', value: `${guild.roles.cache.size}`, inline: true }
            )
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
    
    // Lệnh clear (xóa tin nhắn)
    if (command === 'clear') {
        if (!message.member.permissions.has('ManageMessages')) {
            return message.reply('❌ Bạn không có quyền!');
        }
        
        const amount = parseInt(args[0]);
        if (!amount || amount < 1 || amount > 100) {
            return message.reply('❌ Vui lòng nhập số từ 1-100\nVí dụ: `.clear 10`');
        }
        
        try {
            const deleted = await message.channel.bulkDelete(amount, true);
            const msg = await message.channel.send(`✅ Đã xóa ${deleted.size} tin nhắn`);
            setTimeout(() => msg.delete(), 3000);
        } catch (error) {
            await message.reply('❌ Không thể xóa tin nhắn cũ hơn 14 ngày!');
        }
    }
    
    // Lệnh help
    if (command === 'help') {
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('📚 Danh sách lệnh')
            .setDescription('Tất cả lệnh đều bắt đầu bằng dấu `.`')
            .addFields(
                { name: '.ping', value: 'Kiểm tra ping của bot', inline: true },
                { name: '.hello', value: 'Bot chào bạn', inline: true },
                { name: '.info', value: 'Thông tin cơ bản về bot', inline: true },
                { name: '.infobot', value: 'Thông tin chi tiết về bot', inline: true },
                { name: '.server', value: 'Thông tin về server hiện tại', inline: true },
                { name: '.clear [số]', value: 'Xóa tin nhắn (cần quyền)', inline: true },
                { name: '.help', value: 'Hiển thị danh sách lệnh này', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Prefix: .` });
        
        await message.reply({ embeds: [embed] });
    }
});

// Đăng nhập
client.login(process.env.TOKEN)
    .then(() => {
        console.log('🚀 Bot đã sẵn sàng!');
    })
    .catch(error => {
        console.error('❌ Lỗi đăng nhập:', error);
    });

// Xử lý lỗi
process.on('unhandledRejection', error => {
    console.error('Lỗi không xử lý được:', error);
});
