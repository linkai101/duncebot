const Discord = require('discord.js');
const Commando = require('discord.js-commando');
const User = require('../../lib/user');

module.exports = class EcoCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'eco',
            aliases: [],
            group: 'admin',
            memberName: 'eco',
            description: 'Admin economy commands.',
            args: [
                {
                    key: 'action',
                    prompt: 'What action would you like to carry out? (set/give/take)',
                    type: 'string',
                },
                {
                    key: 'user',
                    prompt: 'Who would you like to run this action on?',
                    type: 'user',
                },
                {
                    key: 'amount',
                    prompt: 'How much money would you like this action to apply to?',
                    type: 'integer',
                },
            ],
            ownerOnly: true
        });
    }

    async run(message, args) {
        if (!['set', 'give', 'take'].includes(args.action)) return message.channel.send(`⚠️ - Invalid action! Must be: set, give, take`);

        var user = await User.get(args.user.id);
        // If user doesn't exist in db (deleted or for other reason), add to db
        if (!user) {
            user = new User({ _id: args.user.id });
        }

        let oldBalance = user.balance;

        switch (args.action) {
            case 'set':
                user.balance = args.amount;
                break;
            case 'give':
                user.balance += args.amount;
                break;
            case 'take':
                user.balance -= args.amount;
                break;
        }
        
        user.save((err) => {
            if (err) console.error(err);
        });

        message.channel.send(`✅ - \`${args.user.tag}\`'s balance has been changed from \`$${oldBalance}\` to \`$${user.balance}\``);
    }
}
