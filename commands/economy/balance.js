const Discord = require('discord.js');
const Commando = require('discord.js-commando');
const User = require('../../lib/user');
const config = require('../../config/config');

module.exports = class BalanceCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'balance',
            aliases: ['bal'],
            group: 'economy',
            memberName: 'balance',
            description: 'View your balance.',
            args: [
                {
                    key: 'user',
                    prompt: 'Who would you like to view the balance of?',
                    type: 'user',
                    default: '',
                },
            ],
            throttling: {
                usages: 2,
                duration: 30
            },
        });
    }

    async run(message, args) {
        let user = await User.get((args.user != '') ? args.user.id : message.author.id);

        // If user doesn't exist in db (deleted or for other reason), add to db
        if (!user) {
            user = new User({ _id: (args.user != '') ? args.user.id : message.author.id });
            user.save(err => {
                if (err) console.error(err);
            });
        }

        const balanceEmbed = new Discord.MessageEmbed()
        .setAuthor(`💵 ${(args.user != '') ? this.client.guilds.cache.get(config.guildID).members.cache.get(user._id).user.username+'\'s' : 'Your'} balance`, ``, ``)
        .setDescription(`Balance: \`$${user.balance}\``)
        .setFooter(`${message.author.tag}`, message.author.avatarURL())
        message.channel.send(balanceEmbed);
    }
}
