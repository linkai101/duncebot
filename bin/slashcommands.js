const Discord = require('discord.js');
const path = require('path');
const fs = require('fs');

const config = require('../config/config.json');

// Guild commands (instant, for specific guilds)
// client.api.applications(client.user.id).guilds('791026437552603227').commands.post

// Global commands (rolls out within 1hr, all guilds)
// client.api.applications(client.user.id).commands.post

// Arg types
// SUB_COMMAND[1], SUB_COMMAND_GROUP[2], STRING[3], INTEGER[4], BOOLEAN[5], USER[6], CHANNEL[7], ROLE[8]

// Get commands
// client.api.applications(client.user.id).guilds('791026437552603227').commands.get();

// Deleting commands
// client.api.applications(client.user.id).commands(COMMAND_ID).delete();
// client.api.applications(client.user.id).guilds('791026437552603227').commands(COMMAND_ID).delete();

module.exports = {
    post: async function(client) {
        client.api.applications(client.user.id).guilds(config.guildID).commands.post({
            data: {
                name: "echo",
                description: "Makes the bot echo your message.",

                options: [
                    {
                        name: "content",
                        description: "Content of the message.",
                        type: 3,
                        required: true
                    }
                ]
            }
        });
    },
    clear: async function(client) {
        let commands = await client.api.applications(client.user.id).guilds(config.guildID).commands.get();
        for (command of commands) {
            client.api.applications(client.user.id).guilds(config.guildID).commands(command.id).delete();
        }
    },
    watch: async function(client) {
        const commands = [];
        await new Promise(function(resolve, reject) {
            fs.readdir(path.join(__dirname, '../slashcommands'), function (err, files) {
                if (err) throw err;
                files.forEach(file => {
                    if (path.extname(file).toLowerCase() === '.js') commands.push(file.replace(/\.[^/.]+$/, ""));
                });
                resolve();
            });
        });

        client.ws.on('INTERACTION_CREATE', async interaction => {
            for (cmd of commands) {
                if (interaction.data.name.toLowerCase() == cmd) {
                    require('../slashcommands/'+cmd).run(client, interaction);
                }
            }
        });
    }
}
