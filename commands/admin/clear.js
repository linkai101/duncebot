const Discord = require('discord.js');
const Commando = require('discord.js-commando');

module.exports = class ClearCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'clear',
            aliases: [],
            group: 'admin',
            memberName: 'clear',
            description: 'Delete an amount of messages. (<=99)',
            args: [
                {
                    key: 'amount',
                    prompt: 'How many messages would you like to delete?',
                    type: 'integer',
                    default: 99,
                },
            ],
            ownerOnly: true,
            guildOnly: true
        });
    }

    async run(message, args) {
        if (args.amount > 99) args.amount = 99;
        message.channel.bulkDelete(args.amount+1, true);
        message.channel.send(`🗑 - Deleted \`${args.amount}\` messages!`)
        .then(msg => {
            setTimeout(async function() {
                if (await msg.channel.messages.cache.get(msg.id)) msg.delete();
            }, 5000);
        })
        .catch(console.error);
    }
}
