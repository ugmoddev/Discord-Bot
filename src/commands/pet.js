const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../models/User');
const { logger } = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pet')
        .setDescription('Pet system commands')
        .addSubcommand(sub => sub
            .setName('catch')
            .setDescription('Try to catch a wild pet'))
        .addSubcommand(sub => sub
            .setName('info')
            .setDescription('View your pet information')
            .addStringOption(opt => opt.setName('name').setDescription('Pet name')))
        .addSubcommand(sub => sub
            .setName('feed')
            .setDescription('Feed your pet')
            .addStringOption(opt => opt.setName('name').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('train')
            .setDescription('Train your pet')
            .addStringOption(opt => opt.setName('name').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('evolve')
            .setDescription('Evolve your pet')
            .addStringOption(opt => opt.setName('name').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('breed')
            .setDescription('Breed two pets')
            .addStringOption(opt => opt.setName('parent1').setRequired(true))
            .addStringOption(opt => opt.setName('parent2').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('equip')
            .setDescription('Equip a pet')
            .addStringOption(opt => opt.setName('name').setRequired(true))),

    cooldown: 5,

    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        
        switch (subcommand) {
            case 'catch': return this.catch(interaction);
            case 'info': return this.info(interaction);
            case 'feed': return this.feed(interaction);
            case 'train': return this.train(interaction);
            case 'evolve': return this.evolve(interaction);
            case 'breed': return this.breed(interaction);
            case 'equip': return this.equip(interaction);
            default: return interaction.reply('❌ Unknown pet command!');
        }
    },

    async catch(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        if (user.stats.stamina < 15) {
            return interaction.editReply('❌ Not enough stamina! Need 15 stamina.');
        }

        const petTypes = [
            { name: '🐱 Cat', rarity: 'Common', exp: 50 },
            { name: '🐶 Dog', rarity: 'Common', exp: 50 },
            { name: '🐰 Rabbit', rarity: 'Common', exp: 60 },
            { name: '🦊 Fox', rarity: 'Uncommon', exp: 80 },
            { name: '🐺 Wolf', rarity: 'Uncommon', exp: 90 },
            { name: '🐉 Dragon', rarity: 'Rare', exp: 150 },
            { name: '🦄 Unicorn', rarity: 'Rare', exp: 160 }
        ];

        const success = Math.random() < 0.3;
        user.stats.stamina -= 15;

        let result = '';
        let caughtPet = null;

        if (success) {
            const pet = petTypes[Math.floor(Math.random() * petTypes.length)];
            const petData = {
                id: `pet_${Date.now()}`,
                name: pet.name,
                type: pet.name.split(' ')[1] || 'Pet',
                level: 1,
                exp: 0,
                evolution: 0,
                rarity: pet.rarity,
                stats: {
                    hp: 50,
                    atk: 5 + Math.floor(Math.random() * 5),
                    def: 5 + Math.floor(Math.random() * 5)
                },
                skills: [],
                happiness: 100,
                hunger: 100,
                equipped: false
            };

            user.pets.push(petData);
            caughtPet = petData;
            result = `🎉 You caught a **${pet.name}** (${pet.rarity})!`;
            user.addExp(pet.exp);
        } else {
            result = '💨 The pet escaped! Try again!';
        }

        await user.save();

        const embed = new EmbedBuilder()
            .setColor(success ? '#00FF00' : '#FF0000')
            .setTitle('🐾 Catch a Pet')
            .setDescription(result)
            .addFields(
                { name: 'Stamina', value: `${user.stats.stamina}/${user.stats.maxStamina}`, inline: true },
                { name: 'Pets', value: `${user.pets.length}`, inline: true }
            );

        if (caughtPet) {
            embed.addFields(
                { name: 'Rarity', value: caughtPet.rarity, inline: true }
            );
        }

        embed.setTimestamp();
        await interaction.editReply({ embeds: [embed] });
    },

    async info(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        const petName = interaction.options.getString('name');
        let pet = null;

        if (petName) {
            pet = user.pets.find(p => p.name.toLowerCase().includes(petName.toLowerCase()));
        } else {
            pet = user.pets.find(p => p.equipped);
            if (!pet && user.pets.length > 0) {
                pet = user.pets[0];
            }
        }

        if (!pet) {
            return interaction.editReply('❌ No pet found! Use `/pet catch` to get one.');
        }

        const embed = new EmbedBuilder()
            .setColor('#FF69B4')
            .setTitle(`🐾 ${pet.name}`)
            .setDescription(`Level ${pet.level} ${pet.rarity}`)
            .addFields(
                { name: '❤️ HP', value: `${pet.stats.hp}`, inline: true },
                { name: '⚔️ ATK', value: `${pet.stats.atk}`, inline: true },
                { name: '🛡️ DEF', value: `${pet.stats.def}`, inline: true },
                { name: '😊 Happiness', value: `${pet.happiness}%`, inline: true },
                { name: '🍖 Hunger', value: `${pet.hunger}%`, inline: true },
                { name: '✨ Evolution', value: `${pet.evolution}`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async feed(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        const petName = interaction.options.getString('name');
        const pet = user.pets.find(p => p.name.toLowerCase().includes(petName.toLowerCase()));

        if (!pet) {
            return interaction.editReply('❌ Pet not found!');
        }

        if (user.coins < 50) {
            return interaction.editReply('❌ You need 50 coins to buy food!');
        }

        user.removeCoins(50);
        pet.hunger = Math.min(100, pet.hunger + 20);
        pet.happiness = Math.min(100, pet.happiness + 10);
        await user.save();

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🍖 Feeding Time')
            .setDescription(`You fed ${pet.name} some food!`)
            .addFields(
                { name: 'Hunger', value: `${pet.hunger}%`, inline: true },
                { name: 'Happiness', value: `${pet.happiness}%`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async train(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        const petName = interaction.options.getString('name');
        const pet = user.pets.find(p => p.name.toLowerCase().includes(petName.toLowerCase()));

        if (!pet) {
            return interaction.editReply('❌ Pet not found!');
        }

        if (user.stats.stamina < 10) {
            return interaction.editReply('❌ Not enough stamina! Need 10.');
        }

        user.stats.stamina -= 10;
        const statGain = Math.floor(Math.random() * 3) + 1;
        const stats = ['atk', 'def', 'hp'];
        const stat = stats[Math.floor(Math.random() * stats.length)];
        
        pet.stats[stat] += statGain;
        pet.exp += 10;
        pet.happiness = Math.max(0, pet.happiness - 5);

        if (pet.exp >= 100) {
            pet.exp = 0;
            pet.level++;
            pet.stats.hp += 5;
            pet.stats.atk += 2;
            pet.stats.def += 2;
        }

        await user.save();

        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('🏋️ Training')
            .setDescription(`${pet.name} trained and gained +${statGain} ${stat.toUpperCase()}!`)
            .addFields(
                { name: 'Level', value: `${pet.level}`, inline: true },
                { name: 'EXP', value: `${pet.exp}/100`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async evolve(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        const petName = interaction.options.getString('name');
        const pet = user.pets.find(p => p.name.toLowerCase().includes(petName.toLowerCase()));

        if (!pet) {
            return interaction.editReply('❌ Pet not found!');
        }

        if (pet.evolution >= 5) {
            return interaction.editReply('❌ Your pet has reached max evolution!');
        }

        if (pet.level < 10 * (pet.evolution + 1)) {
            return interaction.editReply(`❌ Need level ${10 * (pet.evolution + 1)} for next evolution!`);
        }

        pet.evolution++;
        pet.stats.hp += 20;
        pet.stats.atk += 10;
        pet.stats.def += 10;

        await user.save();

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('✨ Evolution!')
            .setDescription(`${pet.name} has evolved to evolution ${pet.evolution}!`)
            .addFields(
                { name: 'HP', value: `${pet.stats.hp}`, inline: true },
                { name: 'ATK', value: `${pet.stats.atk}`, inline: true },
                { name: 'DEF', value: `${pet.stats.def}`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async breed(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        const name1 = interaction.options.getString('parent1');
        const name2 = interaction.options.getString('parent2');

        const parent1 = user.pets.find(p => p.name.toLowerCase().includes(name1.toLowerCase()));
        const parent2 = user.pets.find(p => p.name.toLowerCase().includes(name2.toLowerCase()));

        if (!parent1 || !parent2) {
            return interaction.editReply('❌ One or both pets not found!');
        }

        if (parent1.id === parent2.id) {
            return interaction.editReply('❌ Cannot breed a pet with itself!');
        }

        if (user.coins < 1000) {
            return interaction.editReply('❌ Breeding costs 1000 coins!');
        }

        user.removeCoins(1000);

        const offspring = {
            id: `pet_${Date.now()}`,
            name: `🐾 ${parent1.name.split(' ').slice(1).join(' ')} Jr.`,
            type: parent1.type,
            level: 1,
            exp: 0,
            evolution: 0,
            rarity: parent1.rarity === 'Rare' || parent2.rarity === 'Rare' ? 'Uncommon' : 'Common',
            stats: {
                hp: Math.floor((parent1.stats.hp + parent2.stats.hp) / 4),
                atk: Math.floor((parent1.stats.atk + parent2.stats.atk) / 4),
                def: Math.floor((parent1.stats.def + parent2.stats.def) / 4)
            },
            skills: [],
            happiness: 100,
            hunger: 100,
            equipped: false
        };

        user.pets.push(offspring);
        await user.save();

        const embed = new EmbedBuilder()
            .setColor('#FF69B4')
            .setTitle('🐾 Breeding Success!')
            .setDescription(`A new pet has been born!`)
            .addFields(
                { name: 'Name', value: offspring.name, inline: true },
                { name: 'Rarity', value: offspring.rarity, inline: true },
                { name: 'HP', value: `${offspring.stats.hp}`, inline: true },
                { name: 'ATK', value: `${offspring.stats.atk}`, inline: true },
                { name: 'DEF', value: `${offspring.stats.def}`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async equip(interaction) {
        await interaction.deferReply();
        const user = await User.findOne({ userId: interaction.user.id });
        if (!user) return interaction.editReply('❌ Create an account first!');

        const petName = interaction.options.getString('name');
        const pet = user.pets.find(p => p.name.toLowerCase().includes(petName.toLowerCase()));

        if (!pet) {
            return interaction.editReply('❌ Pet not found!');
        }

        user.pets.forEach(p => p.equipped = false);
        pet.equipped = true;
        await user.save();

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Pet Equipped')
            .setDescription(`${pet.name} is now your active pet!`)
            .addFields(
                { name: 'Level', value: `${pet.level}`, inline: true },
                { name: 'Rarity', value: `${pet.rarity}`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};
