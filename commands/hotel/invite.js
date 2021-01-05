const Discord = require('discord.js');
const Commando = require('discord.js-commando');
const Room = require('../../lib/room');

module.exports = class InviteCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'invite',
            aliases: [],
            group: 'hotel',
            memberName: 'invite',
            description: 'Invite a user to your room.',
            args: [
                {
                    key: 'user',
                    prompt: 'Who would you like to invite to your room?',
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

        // Check if user already a room member or is self/host or is bot
        if (room.members.host == args.user.id) return message.channel.send("⚠️ - You cannot invite yourself!");
        if (room.members.visitors.includes(args.user.id)) return message.channel.send("⚠️ - This user is already a member of this room!");
        if (args.user.bot) return message.channel.send("⚠️ - You cannot invite bots, silly!");

        const command = this;

        // Assign user to visitor role and update on db (add room class method)
        let isAtCapacity = false;
        await new Promise(function(resolve, reject) {
            room.invite(args.user.id, command.client, (err) => {
                // Check if error is room at full capacity
                if (err && err.message == 'Room is at full capacity!') {
                    isAtCapacity = true;
                } else if (err) console.error(err);
                resolve();
            });
        });
        if (isAtCapacity) return message.channel.send("⚠️ - You cannot invite any more members as your room is at full capacity!");

        // Send dm to invited user
        const invitedEmbed = new Discord.MessageEmbed()
        .setAuthor(`${(room.type == 'presidential') ? '👑' : (room.type == 'suite') ? '🎩' : '🛏️'} Room ${room.number}`, ``, ``)
        .setTitle(`You have been invited!`)
        .setDescription(`\`${message.author.tag}\` has invited you to **Room ${room.number}**!\nYou can access this room in the **dunce hotel**.`)
        .setFooter(`If you wish to leave this room, use the command ;leave in a room channel.`, ``)
        args.user.send(invitedEmbed);

        message.channel.send(`✅ - \`${args.user.tag}\` has been invited to your room!`);
    }
}
