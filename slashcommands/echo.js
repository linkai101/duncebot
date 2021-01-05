const Discord = require('discord.js');

/*
    ECHO SLASH COMMAND
    Demo command, disable in production
*/

module.exports = {
    run: async function(client, interaction) {
        const args = interaction.data.options;

        const content = args.find(arg => arg.name.toLowerCase() == "content").value;
        const embed = new Discord.MessageEmbed()
            .setDescription(content)
            .setAuthor(interaction.member.user.username);

        client.api.interactions(interaction.id, interaction.token).callback.post({
            data: {
                type: 4,
                data: await createAPIMessage(client, interaction, embed)
            }
        });
    }
}

async function createAPIMessage(client, interaction, content) {
    const apiMessage = await Discord.APIMessage.create(client.channels.resolve(interaction.channel_id), content)
        .resolveData()
        .resolveFiles();

    return { ...apiMessage.data, files: apiMessage.files };
}
