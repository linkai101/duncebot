const database = require('../bin/database');
const config = require('../config/config.json');

function Room(data) {
    if (!data) data = {};
    if (!data.members) data.members = {}
    if (!data.roles) data.roles = {}

    this._id = data._id;
    this.number = data.number;
    this.type = data.type;
    this.category = data.category;
    this.roles = {
        host: data.roles.host,
        visitor: data.roles.visitor
    };
    this.members = {
        host: data.members.host,
        visitors: data.members.visitors || []
    };
}

Room.getByHost = async (hostId) => {
    let room;
    await new Promise(function(resolve, reject) {
        database.query("duncehotel", "rooms", async (col) => {
            room = await col.findOne({ "members.host": hostId }, {});
            resolve();
        });
    });
    return (room) ? new Room(room) : null;
}

Room.getByNumber = async (number) => {
    let room;
    await new Promise(function(resolve, reject) {
        database.query("duncehotel", "rooms", async (col) => {
            room = await col.findOne({ number: number }, {});
            resolve();
        });
    });
    return (room) ? new Room(room) : null;
}

Room.getByCategory = async (id) => {
    let room;
    await new Promise(function(resolve, reject) {
        database.query("duncehotel", "rooms", async (col) => {
            room = await col.findOne({ category: id }, {});
            resolve();
        });
    });
    return (room) ? new Room(room) : null;
}

Room.getNextAvailableRoom = async () => { // Returns the lowest available room number
    var number = 1;
    await new Promise(function(resolve, reject) {
        database.query("duncehotel", "rooms", async (col) => {
            while (await col.findOne({ number: number })) {
                number++;
            }
            resolve();
        });
    });
    return number;
}

Room.prototype.save = async function(callback) {
    database.query("duncehotel", "rooms", async (col) => {
        try {
            if (!await col.findOne({ _id: this._id }, {})) {
                await col.insertOne(this);
                return callback(null);
            } else {
                let updateValues = {};
                for (key in this) {
                    if (key != '_id') updateValues[key] = this[key];
                }
                await col.updateOne({ _id: this._id }, { $set: updateValues });
                return callback(null);
            }
        } catch(err) {
            return callback(err);
        }
    });
}

Room.prototype.setup = async function(client, callback) { // Creates and assigns roles, creates channels, and saves/updates to db
    let room = this;

    // check if room values are null
    if (!room.number || !room.type || !room.members || !room.members.host) return callback(new Error('Required room values are undefined!'));

    // Check if room with number exists
    if(await Room.getByNumber(room.number)) return callback(new Error('Room with number already exists!'));

    const guild = client.guilds.cache.get(config.guildID);

    // Create room roles
    await new Promise(function(resolve, reject) {
        guild.roles.create({ // Host
            data: {
                name: `room ${room.number} (host)`,
                mentionable: false
            }
        })
        .then(role => {
            room.roles.host = role.id; resolve();
        })
        .catch(err => {return callback(err)});
    });
    await new Promise(function(resolve, reject) {
        guild.roles.create({ // Visitor
            data: {
                name: `room ${room.number}`,
                mentionable: false
            }
        })
        .then(role => {
            room.roles.visitor = role.id; resolve();
        })
        .catch(err => {return callback(err)});
    });

    // Assign roles
    guild.members.cache.get(room.members.host).roles.add(room.roles.host);
    for (visitor of room.members.visitors) {
        if (guild.members.cache.get(visitor)) {
            guild.members.cache.get(visitor).roles.add(room.roles.visitor);
        }
    }

    // Creating category
    await new Promise(function(resolve, reject) {
        guild.channels.create(`Room ${room.number} (${guild.members.cache.get(room.members.host).user.tag})`, {
            type: 'category',
            permissionOverwrites: [
                { // Host
                    id: room.roles.host,
                    allow: [
                        'VIEW_CHANNEL', 'SEND_MESSAGES', 'EMBED_LINKS', 'ATTACH_FILES', 'ADD_REACTIONS', 'USE_EXTERNAL_EMOJIS', 'READ_MESSAGE_HISTORY', 'SEND_TTS_MESSAGES',
                        'CONNECT', 'SPEAK', 'USE_VAD', 'STREAM',
                        ... (room.type == 'suite' || room.type == 'presidential') ? ['MANAGE_MESSAGES', 'MUTE_MEMBERS', 'MOVE_MEMBERS', 'PRIORITY_SPEAKER'] : [],
                        ... (room.type == 'presidential') ? ['MANAGE_CHANNELS'] : []
                    ],
                    deny: []
                },
                { // Visitor
                    id: room.roles.visitor,
                    allow: [
                        'VIEW_CHANNEL', 'SEND_MESSAGES', 'EMBED_LINKS', 'ATTACH_FILES', 'ADD_REACTIONS', 'USE_EXTERNAL_EMOJIS', 'READ_MESSAGE_HISTORY', 'SEND_TTS_MESSAGES',
                        'CONNECT', 'SPEAK', 'USE_VAD', 'STREAM'
                    ],
                    deny: []
                },
                { // Everyone
                    id: guild.roles.everyone.id,
                    allow: [],
                    deny: ['VIEW_CHANNEL']
                },
            ],
        })
        .then(async category => {
            room.category = category.id;
            
            // Creating text channel
            await new Promise(function(resolve, reject) {
                guild.channels.create(`room-${room.number}`, {
                    type: 'text',
                    topic: `Type **;help** for a full list of commands. Enjoy your stay～`,
                    parent: category
                })
                .then(channel => { channel.setParent(room.category); resolve(); })
                .catch(err => {return callback(err)});
            });

            // Creating vc channel
            await new Promise(function(resolve, reject) {
                guild.channels.create(`room-${room.number}-vc`, {
                    type: 'voice',
                    userLimit: (room.type == 'presidential') ? 12 : (room.type == 'suite') ? 8 : 4,
                    parent: category
                })
                .then(channel => { channel.setParent(room.category); resolve(); })
                .catch(err => {return callback(err)});
            });

            resolve();
        })
        .catch(err => {return callback(err)});
    });

    // Save to db
    room.save(err => {if (err) return callback(err)});

    return callback(null);
}

Room.prototype.upgrade = async function(client, callback) { // Updates channel perms, saves/updates to db
    // Note: room.type has already been changed to the new room type
    let room = this;

    // check if room values are null
    if (!room.number || !room.type || !room.members || !room.members.host) return callback(new Error('Required room values are undefined!'));
    
    const guild = client.guilds.cache.get(config.guildID);

    // Update category perms
    client.channels.cache.get(room.category).overwritePermissions([
        { // Host
            id: room.roles.host,
            allow: [
                'VIEW_CHANNEL', 'SEND_MESSAGES', 'EMBED_LINKS', 'ATTACH_FILES', 'ADD_REACTIONS', 'USE_EXTERNAL_EMOJIS', 'READ_MESSAGE_HISTORY', 'SEND_TTS_MESSAGES',
                'CONNECT', 'SPEAK', 'USE_VAD', 'STREAM',
                ... (room.type == 'suite' || room.type == 'presidential') ? ['MANAGE_MESSAGES', 'MUTE_MEMBERS', 'MOVE_MEMBERS', 'PRIORITY_SPEAKER'] : [],
                ... (room.type == 'presidential') ? ['MANAGE_CHANNELS'] : []
            ],
            deny: []
        },
        { // Visitor
            id: room.roles.visitor,
            allow: [
                'VIEW_CHANNEL', 'SEND_MESSAGES', 'EMBED_LINKS', 'ATTACH_FILES', 'ADD_REACTIONS', 'USE_EXTERNAL_EMOJIS', 'READ_MESSAGE_HISTORY', 'SEND_TTS_MESSAGES',
                'CONNECT', 'SPEAK', 'USE_VAD', 'STREAM'
            ],
            deny: []
        },
        { // Everyone
            id: guild.roles.everyone.id,
            allow: [],
            deny: ['VIEW_CHANNEL']
        },
    ]);

    // Change vc capacity
    let vcChannel = client.channels.cache.get(room.category).children.find(channel => channel.name == `room-${room.number}-vc`);
    if (vcChannel) vcChannel.setUserLimit((room.type == 'presidential') ? 12 : (room.type == 'suite') ? 8 : 4);

    category.children.forEach(channel => { // Sync every channel in room
        channel.lockPermissions();
    });

    // Save to db
    room.save(err => {if (err) return callback(err)});

    return callback(null);
}

Room.prototype.invite = async function(userID, client, callback) { // Add role to visitor and save room to db
    // Check if room has capacity
    if(this.members.visitors.length >= ((this.type == 'presidential') ? 12 : (this.type == 'suite') ? 8 : 4)-1) return callback(new Error('Room is at full capacity!'));

    client.guilds.cache.get(config.guildID).members.cache.get(userID).roles.add(this.roles.visitor); // Assign role

    this.members.visitors.push(userID); // Add user to list

    // Save to db
    this.save(err => {if (err) return callback(err)});

    return callback(null);
}

Room.prototype.uninvite = async function(userID, client, callback) { // Remove role from visitor and save room to db
    client.guilds.cache.get(config.guildID).members.cache.get(userID).roles.remove(this.roles.visitor); // Remove role

    // Remove user from list 
    if (this.members.visitors.indexOf(userID) != -1) this.members.visitors.splice(this.members.visitors.indexOf(userID), 1);

    // Save to db
    this.save(err => {if (err) return callback(err)});

    return callback(null);
}

Room.prototype.close = async function(client, callback) { // Close room
    let room = this;

    // check if room values are null
    if (!room.number || !room.type || !room.members || !room.members.host || !room.category) return callback(new Error('Required room values are undefined!'));

    // Check if room exists in db
    let roomDb = await Room.getByCategory(room.category);
    if (!roomDb) return callback(new Error('Room does not exist on database!'));
    room = roomDb; // In case anything goes wrong and room does not equal roomDb

    const guild = client.guilds.cache.get(config.guildID);

    // Delete channels
    const category = guild.channels.cache.get(room.category);
    let channelsToDelete = category.children.size;
    await new Promise(function(resolve, reject) {
        category.children.forEach(channel => {
            channel.delete()
            .then(() => {
                channelsToDelete--;
                if (channelsToDelete == 0) {
                    category.delete().then((deleted) => {resolve()});
                }
            });
        });
    });

    // Delete roles
    await new Promise(function(resolve, reject) {
        guild.roles.cache.get(room.roles.visitor).delete().then((deleted) => {
            guild.roles.cache.get(room.roles.host).delete().then((deleted) => {resolve();});
        });
    });

    // Delete on db
    await new Promise(function(resolve, reject) {
        database.query("duncehotel", "rooms", async (col) => {
            await col.deleteOne({ category: room.category }, {});
            resolve();
        });
    });

    return callback(null);

}

module.exports = Room;