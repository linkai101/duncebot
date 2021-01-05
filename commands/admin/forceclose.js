const Discord = require('discord.js');
const Commando = require('discord.js-commando');
const Room = require('../../lib/room');

module.exports = class ForceCloseCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'forceclose',
            aliases: [],
            group: 'admin',
            memberName: 'forceclose',
            description: 'Forcibly close a user\'s room.',
            args: [
                {
                    key: 'user',
                    prompt: 'Who would you like to view the balance of?',
                    type: 'user',
                },
            ],
            ownerOnly: true
        });
    }

    async run(message, args) {
        // Check if user has a room
        let room = await Room.getByHost(args.user.id);
        if (!room) return message.channel.send(`⚠️ - \`${args.user.tag}\` hasn't booked a room!`);

        const command = this; // Allows to pass through command variable to functions

        // Delete room
        room.close(this.client, (err) => {
            if (err) console.error(err);
            args.user.send(`${(room.type == 'presidential') ? '👑' : (room.type == 'suite') ? '🎩' : '🛏️'} Room ${room.number} - Your room has been forcibly closed by \`${message.author.tag}\`. If you believe this is a mistake, please contact a hotel owner.`);
            message.channel.send(`✅ - \`${args.user.tag}\`'s room has been forcibly closed.`)
        });
    }
}
