const database = require('../bin/database');
const economyConfig = require('../config/economy.json');

function User(data) {
    if (!data) data = {};

    this._id = data._id;
    this.balance = data.balance || economyConfig.starting;
    this.lastDailyClaim = data.lastDailyClaim;
}

User.get = async (id) => {
    let user;
    await new Promise(function(resolve, reject) {
        database.query("duncehotel", "users", async (col) => {
            user = await col.findOne({ _id: id }, {});
            resolve();
        });
    });
    return (user) ? new User(user) : null;
}

User.prototype.save = async function(callback) {
    database.query("duncehotel", "users", async (col) => {
        try {
            if (!await col.findOne({ _id: this._id }, {})) {
                await col.insertOne(this);
            } else {
                let updateValues = {};
                for (key in this) {
                    if (key != '_id') updateValues[key] = this[key];
                }
                await col.updateOne({ _id: this._id }, { $set: updateValues });
            }
        } catch(err) {callback(err)};
    });
}

module.exports = User;