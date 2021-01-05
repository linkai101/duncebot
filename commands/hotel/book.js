const Discord = require('discord.js');
const Commando = require('discord.js-commando');
const Room = require('../../lib/room');
const User = require('../../lib/user');
const config = require('../../config/config.json');
const economyConfig = require('../../config/economy.json');

module.exports = class BookCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'book',
            aliases: [],
            group: 'hotel',
            memberName: 'book',
            description: 'Book a room.',
            args: [
                {
                    key: 'type',
                    prompt: 'What type of room would you like to book?',
                    type: 'string',
                    default: '',
                },
            ],
            throttling: {
                usages: 2,
                duration: 30
            }
        });
    }

    async run(message, args) {
        // DM only
        if (message.channel.type !== 'dm' && !this.client.isOwner(message.author)) return message.channel.send("⚠️ - This command can only be used in a DM channel!")

        // Check if user already has a room
        if (await Room.getByHost(message.author.id)) {
            // User already has a room
            return message.channel.send("🚫 - You can only book `1` room at a time!");
        }

        // Get user from db
        var userDb = await User.get(message.author.id);
        // If user doesn't exist in db (deleted or for other reason), add to db
        if (!userDb) {
            await new Promise(function(resolve, reject) {
                userDb = new User({ _id: message.author.id });
                userDb.save((err) => {
                    if (err) console.error(err);
                    resolve();
                });
            });
        }

        // Declare room variable
        var room = new Room({ members: { host: message.author.id } });
        
        const command = this; // Allows to pass through command variable to functions
        await new Promise(function(resolve, reject) {
            if (args.type != '' && ['quad', 'suite', 'presidential'].includes(args.type.toLowerCase())) {
                // Check if user has enough money
                if (userDb.balance < economyConfig.roomPrices[args.type.toLowerCase()]) {
                    // User does not have enough money
                    message.channel.send("🚫 - You do not have enough money!");
                    selectType({ command: command, message: message, userDb: userDb }, (type) => {
                        room.type = type;
                        resolve();
                    })
                } else {
                    // User has enough money, proceed
                    room.type = args.type.toLowerCase();
                    resolve();
                }
            } else if (args.type != '' && !['quad', 'suite', 'presidential'].includes(args.type.toLowerCase())) {
                // Invalid room type
                message.channel.send('⚠️ - Invalid room type!');
                selectType({ command: command, message: message, userDb: userDb }, (type) => {
                    room.type = type;
                    resolve();
                });
            } else {
                selectType({ command: command, message: message, userDb: userDb }, (type) => {
                    room.type = type;
                    resolve();
                });
            }
        });

        // Stop command if room type is not selected
        if (!room.type) return;

        // Confirm book room
        var isConfirmed;
        await new Promise(function(resolve, reject) {
            confirmRoom({ command: command, message: message, userDb: userDb, type: room.type }, (confirmed) => {
                isConfirmed = confirmed;
                resolve();
            });
        });
        if (!isConfirmed) return;

        // Deduct room price
        userDb.balance -= economyConfig.roomPrices[room.type];
        userDb.save((err) => {if (err) console.error(err)});

        // Find and assign available room number
        room.number = await Room.getNextAvailableRoom();

        // Save and set up room
        await new Promise(function(resolve, reject) {
            room.setup(command.client, (err) => {
                if (err) console.error(err);
                resolve();
            });
        });

        // Room info message
        const roomInfoEmbed = new Discord.MessageEmbed()
        .setAuthor(`${(room.type == 'presidential') ? '👑' : (room.type == 'suite') ? '🎩' : '🛏️'} Room ${room.number}`, ``, ``)
        .setTitle(`Here is your key! 🔑`)
        .setDescription(`**Room ${room.number}** has been set up for you!\nYou can access your room in the **dunce hotel**.`)
        message.channel.send(roomInfoEmbed);

        // Send welcome and info messages in room channel
        const roomWelcomeEmbed = new Discord.MessageEmbed()
        .setAuthor(`${(room.type == 'presidential') ? '👑' : (room.type == 'suite') ? '🎩' : '🛏️'} Room ${room.number}`, ``, ``)
        .setTitle(`Welcome to your room!`)
        .setDescription(`Thank you for staying at the **dunce hotel**! Enjoy your stay～`)
        .addFields([
            { name: `Room info`, value:
                `Type: \`${(room.type == 'presidential') ? '👑' : (room.type == 'suite') ? '🎩' : '🛏️'} ${room.type.charAt(0).toUpperCase() + room.type.slice(1)}\``+
                `\nCapacity: \`${(room.type == 'presidential') ? 12 : (room.type == 'suite') ? 8 : 4}\``+
                `\nHost: \`${this.client.guilds.cache.get(config.guildID).members.cache.get(room.members.host).user.tag}\`` },
            { name: `Useful commands`, value: 
                `Type \`;invite\` or \`;uninvite\` to invite or uninvite users.`+
                `\nType \`;upgrade\` to upgrade this room.`+
                `\nType \`;close\` to close this room.`+
                `\nType \`;help\` for a full list of commands.`
            }
        ]);
        this.client.channels.cache.get(room.category).children.find(channel => channel.position == 0).send(roomWelcomeEmbed).then(msg => { msg.pin() });
        this.client.channels.cache.get(room.category).children.find(channel => channel.position == 0).send(`Your room is ready! <@${room.members.host}>`).then(msg => { msg.delete() });
    }

    async runInDMs(user) { // Run from reaction
        // Check if user already has a room
        if (await Room.getByHost(user.id)) {
            // User already has a room
            return user.send("🚫 - You can only book `1` room at a time!");
        }

        // Get user from db
        var userDb = await User.get(user.id);
        // If user doesn't exist in db (deleted or for other reason), add to db
        if (!userDb) {
            await new Promise(function(resolve, reject) {
                userDb = new User({ _id: user.id });
                userDb.save((err) => {
                    if (err) console.error(err);
                    resolve();
                });
            });
        }

        // Declare room variable
        var room = new Room({ members: { host: user.id } });
        
        const command = this; // Allows to pass through command variable to functions
        await new Promise(function(resolve, reject) {
            selectType({ command: command, user: user, userDb: userDb }, (type) => {
                room.type = type;
                resolve();
            });
        });

        // Stop command if room type is not selected
        if (room.type == null) return;

        // Confirm book room
        var isConfirmed;
        await new Promise(function(resolve, reject) {
            confirmRoom({ command: command, user: user, userDb: userDb, type: room.type }, (confirmed) => {
                isConfirmed = confirmed;
                resolve();
            });
        });
        if (!isConfirmed) return;

        // Deduct room price
        userDb.balance -= economyConfig.roomPrices[room.type];
        userDb.save((err) => {if (err) console.error(err)});

        // Find and assign available room number
        room.number = await Room.getNextAvailableRoom();

        // Save and set up room
        await new Promise(function(resolve, reject) {
            room.setup(command.client, (err) => {
                if (err) console.error(err);
                resolve();
            });
        });

        // Room info message
        const roomInfoEmbed = new Discord.MessageEmbed()
        .setAuthor(`${(room.type == 'presidential') ? '👑' : (room.type == 'suite') ? '🎩' : '🛏️'} Room ${room.number}`, ``, ``)
        .setTitle(`Here is your room key! 🔑`)
        .setDescription(`**Room ${room.number}** has been set up for you!\nYou can access your room in the **dunce hotel**.`)
        user.send(roomInfoEmbed);

        // Send welcome and info messages in room channel
        const roomWelcomeEmbed = new Discord.MessageEmbed()
        .setAuthor(`${(room.type == 'presidential') ? '👑' : (room.type == 'suite') ? '🎩' : '🛏️'} Room ${room.number}`, ``, ``)
        .setTitle(`Welcome to your room!`)
        .setDescription(`Thank you for staying at the **dunce hotel**! Enjoy your stay～`)
        .addFields([
            { name: `Room info`, value:
                `Type: \`${(room.type == 'presidential') ? '👑' : (room.type == 'suite') ? '🎩' : '🛏️'} ${room.type.charAt(0).toUpperCase() + room.type.slice(1)}\``+
                `\nCapacity: \`${(room.type == 'presidential') ? 12 : (room.type == 'suite') ? 8 : 4}\``+
                `\nHost: \`${this.client.guilds.cache.get(config.guildID).members.cache.get(room.members.host).user.tag}\`` },
            { name: `Useful commands`, value: 
                `Type \`;invite\` or \`;uninvite\` to invite or uninvite users.`+
                `\nType \`;upgrade\` to upgrade this room.`+
                `\nType \`;close\` to close this room.`+
                `\nType \`;help\` for a full list of commands.`
            }
        ]);
        this.client.guilds.cache.get(config.guildID).channels.cache.get(room.category).children.find(channel => channel.position == 0).send(roomWelcomeEmbed).then(msg => { msg.pin() });
        this.client.guilds.cache.get(config.guildID).channels.cache.get(room.category).children.find(channel => channel.position == 0).send(`Your room is ready! <@${room.members.host}>`).then(msg => { msg.delete() });
    }
}

async function selectType(data, callback) { // data: { command, message/user, userDb }
    const roomTypeEmbed = new Discord.MessageEmbed()
    .setAuthor(`📝 Book a room`, ``, ``)
    .setTitle(`Which type of room would you like?`)
    .setDescription((data.userDb.balance >= economyConfig.roomPrices.quad) ? 'React with an emoji to select a room type.' : `⚠️ You don\'t have enough money to book a room!`)
    .addFields(
        { name: `🛏️ ${(data.userDb.balance >= economyConfig.roomPrices.quad) ? 'Quad' : '~~Quad~~'}`, value: `Price: \`$${economyConfig.roomPrices.quad}\` *(one time, keep forever)*\n4 members` },
        { name: `🎩 ${(data.userDb.balance >= economyConfig.roomPrices.suite) ? 'Suite' : '~~Suite~~'}`, value: `Price: \`$${economyConfig.roomPrices.suite}\` *(one time, keep forever)*\n8 members, moderation perms` },
        { name: `👑 ${(data.userDb.balance >= economyConfig.roomPrices.presidential) ? 'Presidential' : '~~Presidential~~'}`, value: `Price: \`$${economyConfig.roomPrices.presidential}\` *(one time, keep forever)*\n12 members, moderation perms, manage channels` },
    )
    .setFooter(`${(data.message) ? data.message.author.tag : data.user.tag} | Balance: $${data.userDb.balance}`, (data.message) ? data.message.author.avatarURL() : data.user.avatarURL());
    ((data.message) ? data.message.channel.send(roomTypeEmbed) : data.user.send(roomTypeEmbed))
    .then((msg) => {
        // Check if user has enough money for any
        if (data.userDb.balance < economyConfig.roomPrices.quad) return callback(null);

        // TODO: Visual bug, if user reacts too quickly, sometimes the bot removes reactions too early, resulting in an extra reaction
        msg.react('🛏️');
        if (data.userDb.balance >= economyConfig.roomPrices.suite) msg.react('🎩');
        if (data.userDb.balance >= economyConfig.roomPrices.presidential) msg.react('👑');
        msg.react('❌');

        const filter = (reaction, user) => {
            return ['❌', '🛏️', ((data.userDb.balance >= economyConfig.roomPrices.suite) ? '🎩' : null), ((data.userDb.balance >= economyConfig.roomPrices.presidential) ? '👑' : null)]
                .includes(reaction.emoji.name)
            && user.id === ((data.message) ? data.message.author.id : data.user.id);
        };
        msg.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
        .then(collected => {
            const reaction = collected.first();
            if (reaction.emoji.name === '🛏️') { // Quad selected
                // Remove all reactions and proceed
                if (msg.reactions.resolve('🛏️')) msg.reactions.resolve('🛏️').users.remove(data.command.client.user.id);
                if (msg.reactions.resolve('🎩')) msg.reactions.resolve('🎩').users.remove(data.command.client.user.id);
                if (msg.reactions.resolve('👑')) msg.reactions.resolve('👑').users.remove(data.command.client.user.id);
                if (msg.reactions.resolve('❌')) msg.reactions.resolve('❌').users.remove(data.command.client.user.id);
                msg.edit(roomTypeEmbed.setDescription('Selected: `🛏️ Quad`'));

                return callback('quad');
            } else if (reaction.emoji.name === '🎩') { // Suite selected
                // Remove all reactions and proceed
                if (msg.reactions.resolve('🛏️')) msg.reactions.resolve('🛏️').users.remove(data.command.client.user.id);
                if (msg.reactions.resolve('🎩')) msg.reactions.resolve('🎩').users.remove(data.command.client.user.id);
                if (msg.reactions.resolve('👑')) msg.reactions.resolve('👑').users.remove(data.command.client.user.id);
                if (msg.reactions.resolve('❌')) msg.reactions.resolve('❌').users.remove(data.command.client.user.id);
                msg.edit(roomTypeEmbed.setDescription('Selected: `🎩 Suite`'));

                return callback('suite');
            } else if (reaction.emoji.name === '👑') { // Presidential selected
                // Remove all reactions and proceed
                if (msg.reactions.resolve('🛏️')) msg.reactions.resolve('🛏️').users.remove(data.command.client.user.id);
                if (msg.reactions.resolve('🎩')) msg.reactions.resolve('🎩').users.remove(data.command.client.user.id);
                if (msg.reactions.resolve('👑')) msg.reactions.resolve('👑').users.remove(data.command.client.user.id);
                if (msg.reactions.resolve('❌')) msg.reactions.resolve('❌').users.remove(data.command.client.user.id);
                msg.edit(roomTypeEmbed.setDescription('Selected: `👑 Presidential`'));

                return callback('presidential');
            } else if (reaction.emoji.name === '❌') { // Cancel operation
                // Remove all reactions and proceed
                if (msg.reactions.resolve('🛏️')) msg.reactions.resolve('🛏️').users.remove(data.command.client.user.id);
                if (msg.reactions.resolve('🎩')) msg.reactions.resolve('🎩').users.remove(data.command.client.user.id);
                if (msg.reactions.resolve('👑')) msg.reactions.resolve('👑').users.remove(data.command.client.user.id);
                if (msg.reactions.resolve('❌')) msg.reactions.resolve('❌').users.remove(data.command.client.user.id);
                msg.edit(roomTypeEmbed.setDescription('❌ Operation canceled.'));
                return callback(null);
            }
        })
        .catch(collected => { // Time limit has passed or error occured
            // Remove reactions and proceed
            if (msg.reactions.resolve('🛏️')) msg.reactions.resolve('🛏️').users.remove(data.command.client.user.id);
            if (msg.reactions.resolve('🎩')) msg.reactions.resolve('🎩').users.remove(data.command.client.user.id);
            if (msg.reactions.resolve('👑')) msg.reactions.resolve('👑').users.remove(data.command.client.user.id);
            if (msg.reactions.resolve('❌')) msg.reactions.resolve('❌').users.remove(data.command.client.user.id);
            msg.edit(roomTypeEmbed.setDescription('⚠️ Time limit passed! Rerun command to continue.'));
            return callback(null);
        });
    });
}

async function confirmRoom(data, callback) { // data: { command, message/user, userDb, type }
    const confirmEmbed = new Discord.MessageEmbed()
    .setAuthor(`📝 Book a room`, ``, ``)
    .setTitle(`Confirm Room`)
    .setDescription(`Are you sure you want to book this room?`)
    .addField(`Type`, `\`${(data.type == 'presidential') ? '👑' : (data.type == 'suite') ? '🎩' : '🛏️'} ${data.type.charAt(0).toUpperCase() + data.type.slice(1)}\``+
        `\nPrice: \`${(data.type == 'presidential') ? `$${economyConfig.roomPrices.presidential}` : (data.type == 'suite') ? `$${economyConfig.roomPrices.suite}` : `$${economyConfig.roomPrices.quad}`}\``)
    .setFooter(`${(data.message) ? data.message.author.tag : data.user.tag} | Balance: $${data.userDb.balance}`, (data.message) ? data.message.author.avatarURL() : data.user.avatarURL());
    ((data.message) ? data.message.channel.send(confirmEmbed) : data.user.send(confirmEmbed))
    .then((msg) => {
        msg.react('✅');
        msg.react('❌');

        const filter = (reaction, user) => {
            return ['✅', '❌'].includes(reaction.emoji.name) && user.id === ((data.message) ? data.message.author.id : data.user.id);
        };
        msg.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
        .then(collected => {
            const reaction = collected.first();
            if (reaction.emoji.name === '✅') {
                // Remove all reactions and proceed
                if (msg.reactions.resolve('✅')) msg.reactions.resolve('✅').users.remove(data.command.client.user.id);
                if (msg.reactions.resolve('❌')) msg.reactions.resolve('❌').users.remove(data.command.client.user.id);
                msg.edit(confirmEmbed.setDescription('Selected: `✅ Yes`'));
                return callback(true);
            } else if (reaction.emoji.name === '❌') {
                // Remove all reactions and proceed
                if (msg.reactions.resolve('✅')) msg.reactions.resolve('✅').users.remove(data.command.client.user.id);
                if (msg.reactions.resolve('❌')) msg.reactions.resolve('❌').users.remove(data.command.client.user.id);
                msg.edit(confirmEmbed.setDescription('Selected: `❌ No`'));
                return callback(false);
            }
        })
        .catch(collected => { // Time limit has passed or error occured
            // Remove all reactions and proceed
            if (msg.reactions.resolve('✅')) msg.reactions.resolve('✅').users.remove(data.command.client.user.id);
            if (msg.reactions.resolve('❌')) msg.reactions.resolve('❌').users.remove(data.command.client.user.id);
            msg.edit(confirmEmbed.setDescription('⚠️ Time limit passed! Operation canceled.'));
            return callback(false);
        });
    });
}