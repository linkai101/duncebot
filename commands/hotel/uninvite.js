const Discord = require('discord.js');
const Commando = require('discord.js-commando');
const Room = require('../../lib/room');

module.exports = class UninviteCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'uninvite',
            aliases: [],
            group: 'hotel',
            memberName: 'uninvite',
            description: 'Remove a user from your room.',
            args: [
                {
                    key: 'user',
                    prompt: 'Who would you like to uninvite from your room?',
                    type: 'user'
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
            if (!room) return message.channel.send("⚠️ - You haven't booked a room!")
        }

        // Check if user is not a room member or is self/host or is bot
        if (room.members.host == args.user.id) return message.channel.send("⚠️ - You cannot invite yourself!");
        if (!room.members.visitors.includes(args.user.id)) return message.channel.send("⚠️ - This user is not a member of this room!");
        if (args.user.bot) return message.channel.send("⚠️ - You cannot uninvite bots, silly!");

        const command = this;

        // Remove user's visitor role and update on db
        await new Promise(function(resolve, reject) {
            room.uninvite(args.user.id, command.client, (err) => {
                if (err) console.error(err);
                resolve();
            });
        });

        // Send dm to uninvited user
        const uninvitedEmbed = new Discord.MessageEmbed()
        .setAuthor(`${(room.type == 'presidential') ? '👑' : (room.type == 'suite') ? '🎩' : '🛏️'} Room ${room.number}`, ``, ``)
        .setTitle(`You have been uninvited!`)
        .setDescription(`\`${message.author.tag}\` has kicked you from **Room ${room.number}**!\nSorry :(`)
        args.user.send(uninvitedEmbed);

        message.channel.send(`✅ - \`${args.user.tag}\` has been uninvited from your room!`);
    }
}
