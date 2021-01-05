const Discord = require('discord.js');
const Commando = require('discord.js-commando');
const Room = require('../../lib/room');
const config = require('../../config/config.json');

module.exports = class MembersCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'members',
            aliases: [],
            group: 'hotel',
            memberName: 'members',
            description: 'See the members of a room.',
            throttling: {
                usages: 2,
                duration: 30
            }
        });
    }

    async run(message) {
        // Check if command was run in dm or in appropriate room channel
        let room = await Room.getByCategory(message.channel.parentID);
        if (!room) {
            room = await Room.getByHost(message.author.id);
            if (!room) return message.channel.send("⚠️ - You haven't booked a room!")
        }

        let visitorsValue;
        if (room.members.visitors.length != 0) {
            visitorsValue = room.members.visitors;
            for (let i=0; i<visitorsValue.length; i++) {
                visitorsValue[i] = '`'+this.client.users.cache.get(visitorsValue[i]).tag+'`';
            }
            visitorsValue = visitorsValue.join('\n');
        } else {
            visitorsValue = '`None`';
        }

        const membersEmbed = new Discord.MessageEmbed()
        .setAuthor(`${(room.type == 'presidential') ? '👑' : (room.type == 'suite') ? '🎩' : '🛏️'} Room ${room.number}`, ``, ``)
        .setTitle(`Members`)
        .setDescription(
            `Type: \`${(room.type == 'presidential') ? '👑' : (room.type == 'suite') ? '🎩' : '🛏️'} ${room.type.charAt(0).toUpperCase() + room.type.slice(1)}\``+
            `\nCapacity: \`${(room.type == 'presidential') ? 12 : (room.type == 'suite') ? 8 : 4}\``
        )
        .addFields([
            { name: `Host`, value: `\`${this.client.users.cache.get(room.members.host).tag}\`` },
            { name: `Visitors`, value: visitorsValue }
        ])
        message.channel.send(membersEmbed);
    }
}
