const Discord = require('discord.js');
const Commando = require('discord.js-commando');
const Room = require('../../lib/room');
const User = require('../../lib/user');
const config = require('../../config/config.json');
const economyConfig = require('../../config/economy.json');

module.exports = class UpgradeCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'upgrade',
            aliases: [],
            group: 'hotel',
            memberName: 'upgrade',
            description: 'Upgrade your room.',
            args: [
                {
                    key: 'type',
                    prompt: 'What type of room would you like to upgrade to?',
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
        // Check if command was run in dm or in appropriate room channel and check if user is host
        let room = await Room.getByCategory(message.channel.parentID);
        if (
            message.channel.type !== 'dm'
            && (!room || message.author.id != room.members.host)
        ) return message.channel.send("⚠️ - This command can only be used in a room that you are host in!");

        if (!room) {
            room = await Room.getByHost(message.author.id);
            if (!room) return message.channel.send("⚠️ - You haven't booked a room!");
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

        const command = this; // Allows to pass through command variable to functions

        // Prompt for upgrade room type
        var newType;
        await new Promise(function(resolve, reject) {
            if (args.type != '' && ['suite', 'presidential'].includes(args.type.toLowerCase())) {
                // Check if user has enough money
                if (userDb.balance < economyConfig.roomPrices[args.type.toLowerCase()]) {
                    // User does not have enough money
                    message.channel.send("🚫 - You do not have enough money!");
                    selectType({ command: command, message: message, room: room, userDb: userDb }, (type) => {
                        newType = type;
                        resolve();
                    });
                } else {
                    // User has enough money, proceed
                    newType = args.type.toLowerCase();
                    resolve();
                }
            } else if (args.type != '' && !['suite', 'presidential'].includes(args.type.toLowerCase())) {
                // Invalid room type
                if (args.type == 'quad') message.channel.send('⚠️ - You cannot upgrade to room type \`🛏️ Quad\`!')
                else message.channel.send('⚠️ - Invalid room type!');
                selectType({ command: command, message: message, room: room, userDb: userDb }, (type) => {
                    newType = type;
                    resolve();
                });
            } else {
                selectType({ command: command, message: message, room: room, userDb: userDb }, (type) => {
                    newType = type;
                    resolve();
                });
            }
        });
        if (!newType) return;

        room.type = newType;

        // Confirm
        var isConfirmed;
        await new Promise(function(resolve, reject) {
            confirmRoom({ command: command, message: message, room: room, userDb: userDb }, (confirmed) => {
                isConfirmed = confirmed;
                resolve();
            });
        });
        if (!isConfirmed) return;

        // Deduct cost from balance
        userDb.balance -= economyConfig.roomPrices[room.type];
        userDb.save((err) => {if (err) console.error(err)});

        // Update on db
        await new Promise(function(resolve, reject) {
            room.upgrade(command.client, (err) => {
                if (err) console.error(err);
                resolve();
            });
        });

        message.channel.send(`✅ - Your room has been upgraded to \`${(room.type == 'presidential') ? '👑' : '🎩'} ${room.type.charAt(0).toUpperCase() + room.type.slice(1)}\`!`)

        // Send upgraded messages in room channel
        const roomUpgradedEmbed = new Discord.MessageEmbed()
        .setAuthor(`${(room.type == 'presidential') ? '👑' : (room.type == 'suite') ? '🎩' : '🛏️'} Room ${room.number}`, ``, ``)
        .setTitle(`Room upgraded!`)
        .setDescription(`**Room ${room.number}** has been upgraded to \`${(room.type == 'presidential') ? '👑' : '🎩'} ${room.type.charAt(0).toUpperCase() + room.type.slice(1)}\`!`)
        let firstRoomChannel = this.client.channels.cache.get(room.category).children.find(channel => channel.position == 0);
        if (firstRoomChannel && firstRoomChannel.type === 'text' || firstRoomChannel.type === 'news') {
            firstRoomChannel.send(roomUpgradedEmbed);
            firstRoomChannel.send(`Your room has been upgraded to \`${(room.type == 'presidential') ? '👑' : '🎩'} ${room.type.charAt(0).toUpperCase() + room.type.slice(1)}\`! <@${room.members.host}>`).then(msg => { msg.delete() });
        }
    }

    async runInDMs(user) {
        // Check if user has room
        let room = await Room.getByHost(user.id);
        if (!room) return user.send("⚠️ - You haven't booked a room!");

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

        const command = this; // Allows to pass through command variable to functions

        // Prompt for upgrade room type
        var newType;
        await new Promise(function(resolve, reject) {
            selectType({ command: command, user: user, room: room, userDb: userDb }, (type) => {
                newType = type;
                resolve();
            });
        });
        if (!newType) return;

        room.type = newType;

        // Confirm
        var isConfirmed;
        await new Promise(function(resolve, reject) {
            confirmRoom({ command: command, user: user, room: room, userDb: userDb }, (confirmed) => {
                isConfirmed = confirmed;
                resolve();
            });
        });
        if (!isConfirmed) return;

        // Deduct cost from balance
        userDb.balance -= economyConfig.roomPrices[room.type];
        userDb.save((err) => {if (err) console.error(err)});

        // Update on db
        await new Promise(function(resolve, reject) {
            room.upgrade(command.client, (err) => {
                if (err) console.error(err);
                resolve();
            });
        });

        user.send(`✅ - Your room has been upgraded to \`${(room.type == 'presidential') ? '👑' : '🎩'} ${room.type.charAt(0).toUpperCase() + room.type.slice(1)}\`!`)

        // Send upgraded messages in room channel
        const roomUpgradedEmbed = new Discord.MessageEmbed()
        .setAuthor(`${(room.type == 'presidential') ? '👑' : (room.type == 'suite') ? '🎩' : '🛏️'} Room ${room.number}`, ``, ``)
        .setTitle(`Room upgraded!`)
        .setDescription(`**Room ${room.number}** has been upgraded to \`${(room.type == 'presidential') ? '👑' : '🎩'} ${room.type.charAt(0).toUpperCase() + room.type.slice(1)}\`!`)
        let firstRoomChannel = this.client.channels.cache.get(room.category).children.find(channel => channel.position == 0);
        if (firstRoomChannel && firstRoomChannel.type === 'text' || firstRoomChannel.type === 'news') {
            firstRoomChannel.send(roomUpgradedEmbed);
            firstRoomChannel.send(`Your room has been upgraded to \`${(room.type == 'presidential') ? '👑' : '🎩'} ${room.type.charAt(0).toUpperCase() + room.type.slice(1)}\`! <@${room.members.host}>`).then(msg => { msg.delete() });
        }
    }
}

async function selectType(data, callback) { // data: { command, message/user, room, userDb }
    // Check if is at max upgrade
    if (data.room.type == 'presidential') {
        ((data.message) ? data.message.channel : data.user).send("⚠️ - Your room has already been maxed out!");
        return callback(null);
    }

    const roomTypeEmbed = new Discord.MessageEmbed()
    .setAuthor(`${(data.room.type == 'presidential') ? '👑' : (data.room.type == 'suite') ? '🎩' : '🛏️'} Room ${data.room.number}`, ``, ``)
    .setTitle(`Upgrade your room`)
    .setDescription((data.userDb.balance >= economyConfig.roomPrices[(data.room.type == 'suite') ? 'presidential' : 'suite']) ? 'React with an emoji to select a room type.' : `⚠️ You don\'t have enough money to upgrade this room!`)
    .addFields(
        { name: `🎩 ${(data.userDb.balance >= economyConfig.roomPrices.suite && data.room.type == 'quad') ? 'Suite' : '~~Suite~~'}`, value: `Upgrade price: \`$${economyConfig.roomPrices.suite}\` *(one time, keep forever)*\n8 members, moderation perms` },
        { name: `👑 ${(data.userDb.balance >= economyConfig.roomPrices.presidential) ? 'Presidential' : '~~Presidential~~'}`, value: `Upgrade price: \`$${economyConfig.roomPrices.presidential}\` *(one time, keep forever)*\n12 members, moderation perms, manage channels` },
    )
    .setFooter(`${(data.message) ? data.message.author.tag : data.user.tag} | Balance: $${data.userDb.balance}`, (data.message) ? data.message.author.avatarURL() : data.user.avatarURL());
    ((data.message) ? data.message.channel.send(roomTypeEmbed) : data.user.send(roomTypeEmbed))
    .then((msg) => {
        // Check if user has enough money for any
        if (data.userDb.balance < economyConfig.roomPrices.suite) return callback(null);

        // TODO: Visual bug, if user reacts too quickly, sometimes the bot removes reactions too early, resulting in an extra reaction
        if (data.userDb.balance >= economyConfig.roomPrices.suite && data.room.type == 'quad') msg.react('🎩');
        if (data.userDb.balance >= economyConfig.roomPrices.presidential) msg.react('👑');
        msg.react('❌');

        const filter = (reaction, user) => {
            return ['❌', ((data.userDb.balance >= economyConfig.roomPrices.suite && data.room.type == 'quad') ? '🎩' : null), ((data.userDb.balance >= economyConfig.roomPrices.presidential) ? '👑' : null)]
                .includes(reaction.emoji.name)
            && user.id === ((data.message) ? data.message.author.id : data.user.id);
        };
        msg.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
        .then(collected => {
            const reaction = collected.first();
            if (reaction.emoji.name === '🎩') { // Suite selected
                // Remove all reactions and proceed
                if (msg.reactions.resolve('🎩')) msg.reactions.resolve('🎩').users.remove(data.command.client.user.id);
                if (msg.reactions.resolve('👑')) msg.reactions.resolve('👑').users.remove(data.command.client.user.id);
                if (msg.reactions.resolve('❌')) msg.reactions.resolve('❌').users.remove(data.command.client.user.id);
                msg.edit(roomTypeEmbed.setDescription('Selected: `🎩 Suite`'));

                return callback('suite');
            } else if (reaction.emoji.name === '👑') { // Presidential selected
                // Remove all reactions and proceed
                if (msg.reactions.resolve('🎩')) msg.reactions.resolve('🎩').users.remove(data.command.client.user.id);
                if (msg.reactions.resolve('👑')) msg.reactions.resolve('👑').users.remove(data.command.client.user.id);
                if (msg.reactions.resolve('❌')) msg.reactions.resolve('❌').users.remove(data.command.client.user.id);
                msg.edit(roomTypeEmbed.setDescription('Selected: `👑 Presidential`'));

                return callback('presidential');
            } else if (reaction.emoji.name === '❌') { // Cancel operation
                // Remove all reactions and proceed
                if (msg.reactions.resolve('🎩')) msg.reactions.resolve('🎩').users.remove(data.command.client.user.id);
                if (msg.reactions.resolve('👑')) msg.reactions.resolve('👑').users.remove(data.command.client.user.id);
                if (msg.reactions.resolve('❌')) msg.reactions.resolve('❌').users.remove(data.command.client.user.id);
                msg.edit(roomTypeEmbed.setDescription('❌ Operation canceled.'));
                return callback(null);
            }
        })
        .catch(collected => { // Time limit has passed or error occured
            // Remove reactions and proceed
            if (msg.reactions.resolve('🎩')) msg.reactions.resolve('🎩').users.remove(data.command.client.user.id);
            if (msg.reactions.resolve('👑')) msg.reactions.resolve('👑').users.remove(data.command.client.user.id);
            if (msg.reactions.resolve('❌')) msg.reactions.resolve('❌').users.remove(data.command.client.user.id);
            msg.edit(roomTypeEmbed.setDescription('⚠️ Time limit passed! Rerun command to continue.'));
            return callback(null);
        });
    });
}

async function confirmRoom(data, callback) { // data: { command, message/user, room, userDb }
    const confirmEmbed = new Discord.MessageEmbed()
    .setAuthor(`${(data.room.type == 'presidential') ? '👑' : (data.room.type == 'suite') ? '🎩' : '🛏️'} Room ${data.room.number}`, ``, ``)
    .setTitle(`Confirm Room`)
    .setDescription(`Are you sure you want to upgrade to this room?`)
    .addField(`Type`, `\`${(data.room.type == 'presidential') ? '👑' : '🎩'} ${data.room.type.charAt(0).toUpperCase() + data.room.type.slice(1)}\``+
        `\nPrice: \`${(data.room.type == 'presidential') ? `$${economyConfig.roomPrices.presidential}` : `$${economyConfig.roomPrices.suite}`}\``)
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
