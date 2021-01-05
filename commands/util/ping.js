const Commando = require('discord.js-commando');

module.exports = class PingCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'ping',
            aliases: ['latency'],
            group: 'util',
            memberName: 'ping',
            description: 'Ping!',
            throttling: {
                usages: 2,
                duration: 10
            }
        });
    }

    async run(message) {
        const pingMessage = await message.channel.send('🏓 - Pinging...');
        pingMessage.edit(`🏓 **Pong!** - Roundtrip: **${Math.abs((pingMessage.editedTimestamp || pingMessage.createdTimestamp) - (message.editedTimestamp || message.createdTimestamp))}ms** ${this.client.ws.ping ? `- Heartbeat: **${Math.round(this.client.ws.ping)}ms` : ''}**`);
    }
}