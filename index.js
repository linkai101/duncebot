require('dotenv').config();
const path = require('path');

// For repl.it hosting
const server = require('./server');
server();

// Importing config + lib functions
const config = require("./config/config.json");
const slashcommands = require('./bin/slashcommands');
const presence = require('./bin/presence');
const database = require('./bin/database');
const frontdesk = require('./bin/frontdesk');
const eggs = require('./bin/eggs');
const User = require('./lib/user');
const Room = require('./lib/room');

// Importing discord.js + Commando, instantiating client
//const Discord = require("discord.js");
const Commando = require('discord.js-commando');
//const client = new Discord.Client();
const client = new Commando.CommandoClient({
    commandPrefix: config.prefix,
    owner: config.owners
})

// Startup
client.once('ready', async () => {
    console.log("BOT> Ready!");

    // Connect to db
    await new Promise(function(resolve, reject) {
        database.connect((err) => {
            if (err) throw err;
            resolve();
        });
    });

    // Set up Commando
    client.registry
	.registerGroups([
		['hotel', 'Hotel commands'],
		['economy', 'Economy commands'],
		['util', 'Utility commands'],
		['admin', 'Admin commands']
	])
	.registerDefaultTypes()
    .registerCommandsIn(path.join(__dirname, 'commands'));
    //.registerDefaults()
	//.registerDefaultGroups()
    //.registerDefaultCommands()

    // Block commands in disabled channels
    client.dispatcher.addInhibitor(msg => {
        if (client.isOwner(msg.author)) return false;
        for (channel of config.disabledChannels) {
            if (msg.channel.id === channel) {
                return { reason: 'disabled-channel', response:
                    msg.channel.send(`⚠️ - Commands are not enabled in this channel!`)
                    .then(msgReply => {
                        if (msgReply) msgReply.delete({ timeout: 5000 });
                    })
                };
            }
        }
    });

    
    // Set up features
    presence.set(client);
    //slashcommands.post(client);
    //slashcommands.clear(client);
    //slashcommands.watch(client);
    frontdesk.watch(client);
});

client.on('message', (message) => {
    // Wizard easter egg
    eggs.wizard(client, message);
})

// User join
client.on('guildMemberAdd', async (member) => {
    // TODO: Send welcome message

    // Add user to db (if not in db)
    if (!await User.get(member.id)) {
        new User({ _id: member.id }).save((err) => {if (err) console.error(err)});
    }
});

// User leave/kicked
client.on('guildMemberRemove', async (member) => {
    // If user has rooms, close them
    let room = await Room.getByHost(member.id);
    if (room) {
        room.close(client, (err) => {
            if (err) console.error(err);
        });
    }
});

// Channel create
client.on('channelCreate', async (channel) => { // Automatically sync perms with parent on channel create
    if (!channel.guild || channel.guild.id != config.guildID || !channel.parent) return;

    // Check if parent of new channel is a room
    let room = await Room.getByCategory(channel.parentID);
    if (!room) return;

    channel.lockPermissions(); // Sync perms
});

// Member voice state changes (join/leave channel, mute/unmute)
client.on('voiceStateUpdate', (oldState, newState) => {
    if (oldState.member.user.bot) return;

    // Room 9 3/4 easter egg
    eggs.hogwarts(client, newState);
})

client.login(process.env.TOKEN);