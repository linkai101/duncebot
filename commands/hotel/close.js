const Discord = require('discord.js');
const Commando = require('discord.js-commando');
const Room = require('../../lib/room');
const config = require('../../config/config.json');

module.exports = class CloseCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'close',
            aliases: [],
            group: 'hotel',
            memberName: 'close',
            description: 'Close a room.',
            throttling: {
                usages: 1,
                duration: 30
            }
        });
    }

    async run(message) {
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

        const command = this; // Allows to pass through command variable to functions

        // Confirm
        let isConfirmed;
        await new Promise(function(resolve, reject) {
            confirmClose({ command: command, message: message, room: room }, (confirmed) => {
                isConfirmed = confirmed;
                resolve();
            });
        });
        if (!isConfirmed) return;

        // Delete room
        room.close(this.client, (err) => {
            if (err) console.error(err);
            message.author.send(`${(room.type == 'presidential') ? '👑' : (room.type == 'suite') ? '🎩' : '🛏️'} Room ${room.number} - Your room has been closed. Thank you for staying at **dunce hotel**!`);
        });
    }
}

async function confirmClose(data, callback) { // data: { command, message, room }
    const confirmEmbed = new Discord.MessageEmbed()
    .setAuthor(`${(data.room.type == 'presidential') ? '👑' : (data.room.type == 'suite') ? '🎩' : '🛏️'} Room ${data.room.number}`, ``, ``)
    .setTitle(`Confirm Room Termination`)
    .setDescription(`Are you sure you want to close this room?`)
    .addField(`Room info`, 
        `Type: \`${(data.room.type == 'presidential') ? '👑' : (data.room.type == 'suite') ? '🎩' : '🛏️'} ${data.room.type.charAt(0).toUpperCase() + data.room.type.slice(1)}\``+
        `\nCapacity: \`${(data.room.type == 'presidential') ? 12 : (data.room.type == 'suite') ? 8 : 4}\``+
        `\nHost: \`${data.command.client.guilds.cache.get(config.guildID).members.cache.get(data.room.members.host).user.tag}\``,)
    .setFooter(data.message.author.tag, data.message.author.avatarURL());
    data.message.channel.send(confirmEmbed)
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
                // Don't remove reactions because channel will be deleted before reactions could be deleted, causing unknown channel error
                //msg.edit(confirmEmbed.setDescription('Selected: `✅ Yes`'));
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
