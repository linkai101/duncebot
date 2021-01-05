const Discord = require('discord.js');
const database = require('./database');
const config = require('../config/config.json');

module.exports = {
    set: async function (client, callback) {
        let channelId;
        await new Promise(function(resolve, reject) {
            database.query("duncehotel", "config", async (col) => {
                channelId = (await col.findOne({ config: "frontdesk" }, {})).channelId;
                resolve();
            });
        });

        const frontdeskEmbed = new Discord.MessageEmbed()
        .setAuthor(`💁‍♂️ Front Desk`, ``, ``)
        .setTitle(`Welcome to the **dunce hotel**!`)
        .addFields(
            { name: `📝 Book a room`, value: `We have plenty of rooms available for you!` },
            { name: `📈 Upgrade your room`, value: `Upgrade your room for more visitor slots and amenities!` },
            { name: `💸 Daily`, value: `Collect your daily earnings!` },
        )
        .setFooter(`React with an emoji to get started.`,``);

        client.channels.cache.get(channelId).send(frontdeskEmbed)
        .then((msg) => {
            msg.react('📝');
            msg.react('📈');
            msg.react('💸');

            database.query("duncehotel", "config", async (col) => {
                await col.updateOne({ config: "frontdesk" }, { $set: { 'messageId': msg.id } })
            });

            callback(msg.id);
        });
    },
    watch: async function(client) {
        let messageId;
        let channelId;
        await new Promise(function(resolve, reject) {
            database.query("duncehotel", "config", async (col) => {
                messageId = (await col.findOne({ config: "frontdesk" }, {})).messageId;
                channelId = (await col.findOne({ config: "frontdesk" }, {})).channelId;
                resolve();
            });
        });

        // If channelId not set in database
        if (channelId == '') throw new Error('channelId of frontdesk not set on database');
        
        // Check if message exists in channel
        await new Promise(async function(resolve, reject) {
            client.channels.cache.get(channelId).messages.fetch(messageId)
            .then(msg => {
                // Front desk message exists
                resolve();
            })
            .catch(async err => {
                await module.exports.set(client, (newMessageId) => {
                    messageId = newMessageId;
                    resolve();
                });
            });
        });

        client.channels.cache.get(channelId).messages.fetch(messageId)
        .then(msg => {
            const filter = (reaction, user) => {
                return ['📝', '📈', '💸'].includes(reaction.emoji.name) && user.id !== msg.author.id;
            };
            msg.createReactionCollector(filter, {})
            .on('collect', (reaction, user) => {
                const commands = client.registry.commands;
                if (reaction.emoji.name === '📝') { // Book a room
                    msg.reactions.resolve(reaction.emoji.name).users.remove(user.id); // Remove user's reaction

                    const reactionEmbed = new Discord.MessageEmbed()
                    .setAuthor(`💁‍♂️ Front Desk`, ``, ``)
                    .setDescription(`Selected: \`📝 Book a room\``);
                    user.send(reactionEmbed);

                    commands.get('book').runInDMs(user);
                } else if (reaction.emoji.name === '📈') { // Upgrade room
                    msg.reactions.resolve(reaction.emoji.name).users.remove(user.id); // Remove user's reaction

                    const reactionEmbed = new Discord.MessageEmbed()
                    .setAuthor(`💁‍♂️ Front Desk`, ``, ``)
                    .setDescription(`Selected: \`📈 Upgrade your room\``);
                    user.send(reactionEmbed);

                    commands.get('upgrade').runInDMs(user);
                } else if (reaction.emoji.name === '💸') { // Daily
                    msg.reactions.resolve(reaction.emoji.name).users.remove(user.id); // Remove user's reaction

                    const reactionEmbed = new Discord.MessageEmbed()
                    .setAuthor(`💁‍♂️ Front Desk`, ``, ``)
                    .setDescription(`Selected: \`💸 Daily\``);
                    user.send(reactionEmbed);

                    commands.get('daily').runInDMs(user);
                }
            })
        });
    }
};