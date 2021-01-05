const Discord = require("discord.js");
const presence = require('../bin/presence');
const database = require('../bin/database');

/*
    PRESENCE SLASH COMMAND
    Will be disabled until perms support for slash commands come.
    !! Fix bugs before enabling. !!
*/

/*client.api.applications(client.user.id).guilds(config.guild).commands.post({
    data: {
        name: "presence",
        description: "Updates the bot's status.",

        options: [
            {
                name: "activityEnabled",
                description: "Visibility of the bot activity.",
                type: 5,
                required: false
            },
            {
                name: "activityName",
                description: "Name of the bot activity.",
                type: 3,
                required: false
            },
            {
                name: "activityType",
                description: "Type of the bot activity. (PLAYING/LISTENING/STREAMING/WATCHING)",
                type: 3,
                required: false
            },
            {
                name: "activityURL",
                description: "URL of the bot activity. (STREAMING or WATCHING only)",
                type: 3,
                required: false
            },
            {
                name: "status",
                description: "Online status of the bot.",
                type: 3,
                required: false
            },
            {
                name: "afk",
                description: "Afk status of the bot.",
                type: 5,
                required: false
            }
        ]
    }
});*/

// TODO: Settings sometimes doesn't update

module.exports = {
    run: function(client, interaction) {
        const args = interaction.data.options;
        if (!args) display(client, interaction);
        else set(client, interaction, args);
    }
}

async function display(client, interaction) {
    let presenceInfo;
    await new Promise(function(resolve, reject) {
        database.query("duncehotel", "config", async (col) => {
            presenceInfo = (await col.findOne({ config: "presence" }, {})).presence;
            resolve();
        });
    });

    const presenceDisplayEmbed = new Discord.MessageEmbed()
    .setThumbnail(client.user.avatarURL({ format: 'png' }))
    .setTitle(`${client.user.username} Presence`)
    .addFields(
        { name: 'Status', value: presenceInfo.status, inline: true },
        { name: 'AFK', value: presenceInfo.afk, inline: true },
        { name: 'Activity', value: presenceInfo.activity.name },
        { name: 'Enabled', value: `${presenceInfo.activity.enabled}`, inline: true },
        { name: 'Type', value: presenceInfo.activity.type, inline: true },
        { name: 'URL', value: `[URL](${presenceInfo.activity.url})`, inline: true },
    );

    client.api.interactions(interaction.id, interaction.token).callback.post({
        data: {
            type: 4,
            data: await createAPIMessage(client, interaction, presenceDisplayEmbed)
        }
    });
}

async function set(client, interaction, args) {
    args.forEach(setting => {
        if (setting.name == 'activityname') setting.name = 'activity.name';
        else if (setting.name == 'activitytype') setting.name = 'activity.type';
        else if (setting.name == 'activityurl') setting.name = 'activity.url';
        else if (setting.name == 'activityenabled') setting.name = 'activity.enabled';
    });

    await new Promise(function(resolve, reject) {
        database.query("duncehotel", "config", async (col) => {
            args.forEach(async setting => {
                await col.updateOne({ config: "presence" }, { $set: { ['presence.'+setting.name]: setting.value } });
            });
            resolve();
        });
    });

    presence.set(client);
    client.api.interactions(interaction.id, interaction.token).callback.post({
        data: {
            type: 4,
            data: {
                content: `✅ Presence updated!`
            }
        }
    });
}

async function createAPIMessage(client, interaction, content) {
    const apiMessage = await Discord.APIMessage.create(client.channels.resolve(interaction.channel_id), content)
        .resolveData()
        .resolveFiles();

    return { ...apiMessage.data, files: apiMessage.files };
}