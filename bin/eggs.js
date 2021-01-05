const Discord = require("discord.js");
const config = require('../config/config.json');

module.exports = {
    hogwarts: (client, newState) => { // Room 9 3/4 easter egg
        if (newState.channelID == '795764232935178240') { // User joined 'room-9 3/4-vc' channel
            if (!newState.member.roles.cache.get('795769892867014697')) return; // Check if user has 'wizard' role
            newState.member.voice.setChannel(client.channels.cache.get('795768595111346206'));
            setTimeout(() => {
                newState.member.voice.setChannel(client.channels.cache.get('795769793516273664'));
            }, 5000);
        }
        if (newState.channelID == '795768595111346206') { // User joined 'hogwarts-express' channel
            setTimeout(() => {
                newState.member.voice.setChannel(client.channels.cache.get('795769793516273664'));
            }, 5000);
        }
    },
    wizard: (client, message) => { // Wizard easter egg
        const guild = client.guilds.cache.get(config.guildID);

        if (guild.members.cache.get(message.author.id).roles.cache.get('795769892867014697')) return;

        const phrases = [
            'avada kedavra',
            'expecto patronum',
            'wingardium leviosa',
            'expelliarmus'
        ];

        for (phrase of phrases) {
            if (message.content.toLowerCase().includes(phrase)) {
                // Give user wizard role
                guild.members.cache.get(message.author.id).roles.add('795769892867014697');

                const invitedEmbed = new Discord.MessageEmbed()
                .setAuthor(`🧙‍♂️ ℝ𝕆𝕆𝕄 𝟡 𝟛/𝟜`, ``, ``)
                .setTitle(`Yer a wizard, ${message.author.username}!`)
                .setDescription(`𝕐𝕠𝕦 𝕙𝕒𝕧𝕖 𝕓𝕖𝕖𝕟 𝕚𝕟𝕧𝕚𝕥𝕖𝕕 𝕥𝕠 **ℝ𝕆𝕆𝕄 𝟡 𝟛/𝟜**!\nYou can access this room in the **dunce hotel**.`)
                message.author.send(invitedEmbed);
            }
        }
    }
}