const Discord = require('discord.js');
const Commando = require('discord.js-commando');
const Room = require('../../lib/room');

module.exports = class LeaveCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'leave',
            aliases: [],
            group: 'hotel',
            memberName: 'leave',
            description: 'Leave a room that you\'re invited to.',
            throttling: {
                usages: 2,
                duration: 30
            }
        });
    }

    async run(message) {
        // Check if command was run in appropriate room channel
        let room = await Room.getByCategory(message.channel.parentID);
        if (message.channel.type === 'dm' || !room) return message.channel.send("⚠️ - This command can only be used in a room!");

        // Check if user is host
        if (room.members.host == message.author.id) return message.channel.send("⚠️ - You cannot leave your own room! If you would like to close this room, use the command \`;close\`.");

        const command = this;

        // Remove user's visitor role and update on db
        await new Promise(function(resolve, reject) {
            room.uninvite(message.author.id, command.client, (err) => {
                if (err) console.error(err);
                resolve();
            });
        });

        // Send dm to user
        const leftEmbed = new Discord.MessageEmbed()
        .setAuthor(`${(room.type == 'presidential') ? '👑' : (room.type == 'suite') ? '🎩' : '🛏️'} Room ${room.number}`, ``, ``)
        .setTitle(`You have left!`)
        .setDescription(`You have left **Room ${room.number}**!\nSorry to see you go :(`)
        message.author.send(leftEmbed);

        // Send message to channel
        message.channel.send(`🚶 - \`${message.author.tag}\` has left this room!`);
    }
}
