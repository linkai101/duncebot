const Discord = require('discord.js');
const Commando = require('discord.js-commando');

module.exports = class HelpCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'help',
            aliases: ['commands'],
            group: 'util',
            memberName: 'help',
            description: 'List of commands.',
            throttling: {
                usages: 2,
                duration: 30
            }
        });
    }

    run(message) {
        const commands = this.client.registry.commands;
        const prefix = this.client.commandPrefix;

        const helpEmbed = new Discord.MessageEmbed()
        .setAuthor(`📑 ${this.client.user.username} Commands`, ``, ``)
        .addFields(
            { name: `Hotel`, value: 
                `\`${prefix}${commands.get('book').name}\` ${commands.get('book').description}`+
                `\n\`${prefix}${commands.get('upgrade').name}\` ${commands.get('upgrade').description}`+
                `\n\`${prefix}${commands.get('invite').name}\` ${commands.get('invite').description}`+
                `\n\`${prefix}${commands.get('uninvite').name}\` ${commands.get('uninvite').description}`+
                `\n\`${prefix}${commands.get('members').name}\` ${commands.get('members').description}`+
                `\n\`${prefix}${commands.get('close').name}\` ${commands.get('close').description}`
            , inline: true },
            { name: `Economy`, value: 
                `\`${prefix}${commands.get('balance').name}\` ${commands.get('balance').description}`+
                `\n\`${prefix}${commands.get('ladder').name}\` ${commands.get('ladder').description}`+
                `\n\`${prefix}${commands.get('daily').name}\` ${commands.get('daily').description}`
            , inline: true },
            { name: `Utility`, value: 
                `\`${prefix}${commands.get('help').name}\` ${commands.get('help').description}`+
                `\n\`${prefix}${commands.get('ping').name}\` ${commands.get('ping').description}`+
                `\n\`${prefix}${commands.get('cleardms').name}\` ${commands.get('cleardms').description}`
            , inline: true },
        )
        .addFields((this.client.isOwner(message.author)) ? 
            [{ name: `Admin`, value: 
                `\`${prefix}${commands.get('presence').name}\` ${commands.get('presence').description}`+
                `\n\`${prefix}${commands.get('clear').name}\` ${commands.get('clear').description}`+
                `\n\`${prefix}${commands.get('forceclose').name}\` ${commands.get('forceclose').description}`
            , inline: true }]
        : []);
        message.channel.send(helpEmbed);
    }
}