const Discord = require('discord.js');
const Commando = require('discord.js-commando');

module.exports = class LadderCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'ladder',
            aliases: [],
            group: 'economy',
            memberName: 'ladder',
            description: 'View the money leaderboard.',
            throttling: {
                usages: 2,
                duration: 30
            },
        });
    }

    run(message) {
        message.channel.send('⚠️ - This feature has not been implemented yet!');
    }
}
