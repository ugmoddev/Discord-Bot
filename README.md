# Discord Cowoncy-Style Game Bot

An advanced, feature-rich Discord game bot inspired by Cowoncy with gambling, battles, pets, adventures, and more!

## Features

### 🎲 Gambling Games
- Coin Flip, Dice, Blackjack, Poker, Roulette
- Slots, Baccarat, Crash, Hi-Lo
- Double or Nothing, Lucky Wheel, Lottery, Keno

### ⚔️ Battle System
- PvE (Player vs Environment) with 100+ monsters
- PvP with ELO ranking system
- Boss Battles and World Bosses
- Guild Wars, Arena, Endless Mode
- Survival Mode, Tower, Dungeon, Raid

### 🐾 Pet System
- Catch, Feed, Level Up, Evolve
- Breed, Train, Equip items
- Pet PvP battles

### 🎒 Adventure System
- Explore, Hunt, Fish, Mine
- Woodcutting, Farming, Treasure Hunt
- Expedition, Sailing, Cave/Desert/Jungle Exploration

### 💰 Economy
- Daily/Weekly/Monthly rewards
- Work, Beg, Crime, Rob, Heist
- Bank with interest, Investments
- Stock Market, Crypto, Business
- Shop, Marketplace, Auction House

### 🎯 Skill Games
- Memory, Typing Race, Math Quiz
- Trivia, Emoji Quiz, Guess Number
- Word Chain, Hangman, Puzzle, Simon Says

### 👥 Multiplayer Games
- Tic Tac Toe, Connect 4, Chess
- Checkers, UNO, Battleship
- Rock Paper Scissors, Duel
- Tournament, Team Battle

### 🏆 Progression System
- Level, Prestige, Ascension
- Achievements, Titles, Collections
- Badges, Leaderboards
- Daily/Weekly Missions, Battle Pass

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure `.env` file
4. Start the bot: `npm start`

## Deployment on Render

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect repository
4. Add environment variables
5. Deploy!

## Commands

### Gambling
- `/gamble coinflip [bet] [choice]` - Flip a coin
- `/gamble dice [bet] [guess]` - Roll dice
- `/gamble slots [bet]` - Play slots
- `/gamble roulette [bet] [color]` - Play roulette
- `/gamble blackjack [bet]` - Play blackjack
- `/gamble lottery [tickets]` - Buy lottery tickets

### Battle
- `/battle pve [level]` - Fight a monster
- `/battle pvp [opponent]` - Challenge to PvP
- `/battle boss` - Fight a boss
- `/battle dungeon` - Enter a dungeon
- `/battle arena` - Enter the arena

### Economy
- `/economy daily` - Claim daily reward
- `/economy weekly` - Claim weekly reward
- `/economy monthly` - Claim monthly reward
- `/economy work [job]` - Work for coins
- `/economy beg` - Beg for coins
- `/economy crime` - Commit a crime
- `/economy rob [target]` - Rob another player
- `/economy bank [action] [amount]` - Bank operations
- `/economy balance [user]` - Check balance
- `/economy shop [category]` - Browse shop
- `/economy buy [item] [quantity]` - Buy items

### Pet
- `/pet catch` - Catch a wild pet
- `/pet info [name]` - View pet info
- `/pet feed [name]` - Feed your pet
- `/pet train [name]` - Train your pet
- `/pet evolve [name]` - Evolve your pet
- `/pet breed [parent1] [parent2]` - Breed pets
- `/pet equip [name]` - Equip a pet

### Adventure
- `/adventure explore [area]` - Explore the world
- `/adventure hunt` - Go hunting
- `/adventure fish` - Go fishing
- `/adventure mine` - Go mining
- `/adventure farm` - Go farming
- `/adventure treasure` - Search for treasure
- `/adventure expedition` - Go on an expedition

### Progression
- `/progression profile [user]` - View profile
- `/progression leaderboard [type]` - View leaderboards
- `/progression prestige` - Prestige your account
- `/progression achievements` - View achievements
- `/progression dailyquest` - View daily quests
- `/progression battlepass` - View battle pass

### Admin
- `/admin givecoins [user] [amount]` - Give coins
- `/admin giveexp [user] [amount]` - Give EXP
- `/admin resetdata [user] [confirm]` - Reset user data
- `/admin maintenance [enabled]` - Toggle maintenance
- `/admin broadcast [message]` - Broadcast message

## Database Schema

- `users` - User profiles, stats, inventory
- `guilds` - Guild information
- `pets` - Pet data
- `monsters` - Monster definitions
- `items` - Item definitions
- `quests` - Quest definitions
- `transactions` - Transaction logs

## License

MIT License
