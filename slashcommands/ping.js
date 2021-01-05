const Discord = require("discord.js");

/*
    PING SLASH COMMAND
    Demo command, disable in production
*/

module.exports = {
    run: function(client, interaction) {
        client.api.interactions(interaction.id, interaction.token).callback.post({
            data: {
                type: 4,
                data: {
                    content: "Pong!"
                }
            }
        });
    }
}