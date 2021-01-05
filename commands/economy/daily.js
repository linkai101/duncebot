const Discord = require('discord.js');
const Commando = require('discord.js-commando');
const User = require('../../lib/user');
const economyConfig = require('../../config/economy.json');

module.exports = class DailyCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'daily',
            aliases: ['d'],
            group: 'economy',
            memberName: 'daily',
            description: 'Claim your daily earnings.',
            throttling: {
                usages: 2,
                duration: 30
            },
        });
    }

    async run(message) {
        let user = new User(await User.get(message.author.id));
        // If user doesn't exist in db (deleted or for other reason), add to db
        if (!user) {
            await new Promise(function(resolve, reject) {
                user = new User({ _id: message.author.id });
                user.save((err) => {
                    if (err) console.error(err);
                    resolve();
                });
            });
        }

        if (!user.lastDailyClaim || Math.floor(Math.abs(user.lastDailyClaim - new Date()) / (1000 * 60 * 60 * 24)) >= 1) {
            let isStreak = Math.floor(Math.abs(user.lastDailyClaim - new Date()) / (1000 * 60 * 60 * 24)) == 1;

            // Update balance
            if (!user.lastDailyClaim) user.balance += economyConfig.daily.normal;
            else if (isStreak) {
                // Streak
                user.balance += economyConfig.daily.streak;
            } else user.balance += economyConfig.daily.normal;

            // Update last claim timestamp
            user.lastDailyClaim = new Date();
            user.lastDailyClaim.setHours(0,0,0,0);

            user.save((err) => {if (err) console.error(err)});

            const dailyEmbed = new Discord.MessageEmbed()
            .setAuthor(`💸 Daily claimed`, ``, ``)
            .setDescription(((isStreak) ? `+${economyConfig.daily.streak} (streak)` : `+${economyConfig.daily.normal}`)
                +`\n\nBalance: \`$${user.balance}\``)
            .setFooter(`${message.author.tag}`, message.author.avatarURL())
            message.channel.send(dailyEmbed);
        } else {
            // Cannot claim daily
            message.channel.send('🚫 - You cannot claim daily yet!');
        }
        
        // Get Timezone offset
        //new Date().getTimezoneOffset()
    }

    async runInDMs(user) { // Run from reaction
        let userDb = new User(await User.get(user.id));
        // If user doesn't exist in db (deleted or for other reason), add to db
        if (!userDb) {
            await new Promise(function(resolve, reject) {
                userDb = new User({ _id: user.id });
                userDb.save((err) => {
                    if (err) console.error(err);
                    resolve();
                });
            });
        }
        if (!userDb.lastDailyClaim || Math.floor(Math.abs(userDb.lastDailyClaim - new Date()) / (1000 * 60 * 60 * 24)) >= 1) {
            let isStreak = Math.floor(Math.abs(userDb.lastDailyClaim - new Date()) / (1000 * 60 * 60 * 24)) == 1;

            // Update balance
            if (!user.lastDailyClaim) userDb.balance += economyConfig.daily.normal;
            else if (isStreak) {
                // Streak
                userDb.balance += economyConfig.daily.streak;
            } else userDb.balance += economyConfig.daily.normal;

            // Update last claim timestamp
            userDb.lastDailyClaim = new Date();
            userDb.lastDailyClaim.setHours(0,0,0,0);

            userDb.save((err) => {if (err) console.error(err)});

            const dailyEmbed = new Discord.MessageEmbed()
            .setAuthor(`💸 Daily claimed`, ``, ``)
            .setDescription(((isStreak) ? `+${economyConfig.daily.streak} (streak)` : `+${economyConfig.daily.normal}`)
                +`\n\nBalance: \`$${userDb.balance}\``)
            .setFooter(`${user.tag}`, user.avatarURL())
            user.send(dailyEmbed);
        } else {
            // Cannot claim daily
            user.send('🚫 - You cannot claim daily yet!');
        }
    }
}
