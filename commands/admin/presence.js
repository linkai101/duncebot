const Discord = require('discord.js');
const Commando = require('discord.js-commando');
const presence = require('../../bin/presence');
const database = require('../../bin/database');

module.exports = class PresenceCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'presence',
            aliases: [],
            group: 'admin',
            memberName: 'presence',
            description: 'Set presence info.',
            args: [
                {
                    key: 'setting',
                    prompt: 'Which presence setting would you like to change?',
                    type: 'string',
                    default: '',
                },
                {
                    key: 'value',
                    prompt: 'What value would you like to change the presence setting to?',
                    type: 'string',
                    default: '',
                },
            ],
            ownerOnly: true
        });
    }

    async run(message, args) {
        if (args.setting == '') return display(this, message);
        else return set(this, message, args);
    }
}

async function display(command, message) {
    let presenceInfo;
    await new Promise(function(resolve, reject) {
        database.query("duncehotel", "config", async (col) => {
            presenceInfo = (await col.findOne({ config: "presence" }, {})).presence;
            resolve();
        });
    });

    const presenceDisplayEmbed = new Discord.MessageEmbed()
    .setThumbnail(command.client.user.avatarURL({ format: 'png' }))
    .setAuthor(`⚙️ ${command.client.user.username} Presence`, '', '')
    .addFields(
        { name: 'Status', value: presenceInfo.status, inline: true },
        { name: 'AFK', value: presenceInfo.afk, inline: true },
        { name: 'Activity', value: presenceInfo.activity.name },
        { name: 'Enabled', value: `${presenceInfo.activity.enabled}`, inline: true },
        { name: 'Type', value: presenceInfo.activity.type, inline: true },
        { name: 'URL', value: `[URL](${presenceInfo.activity.url})`, inline: true },
    )
    .setFooter(`${command.client.commandPrefix}${command.name} <setting> <value>\nSettings: enabled, status, afk, activity, type, url`)
    message.channel.send(presenceDisplayEmbed);
}

async function set(command, message, args) {
    if (args.setting == 'afk' || args.setting == 'enabled') {
        if (args.value == 'true' || args.value == 'false') {
            args.value = args.value == 'true';
        } else {
            return message.channel.send(`⚠️ Invalid input - Value for ${args.setting} must be 'true' or 'false'!`)
        }
    }

    if (args.setting != 'status'
    && args.setting != 'afk'
    && args.setting != 'activity'
    && args.setting != 'enabled'
    && args.setting != 'type'
    && args.setting != 'url') return message.channel.send(`⚠️ Invalid input - ${args.value} is not a valid presence setting!`)

    if (args.setting == 'activity') args.setting = 'activity.name';
    else if (args.setting == 'type') args.setting = 'activity.type';
    else if (args.setting == 'url') args.setting = 'activity.url';
    else if (args.setting == 'enabled') args.setting = 'activity.enabled';

    await new Promise(function(resolve, reject) {
        database.query("duncehotel", "config", async (col) => {
            await col.updateOne({ config: "presence" }, { $set: { ['presence.'+args.setting]: args.value } })
            resolve();
        });
    });
    presence.set(command.client);
    message.channel.send(`✅ Presence changed - ${args.setting} has been set to ${args.value}.`);
}