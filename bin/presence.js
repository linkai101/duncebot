const database = require("./database");

module.exports = {
    set: async function (client) {
        let presence;
        await new Promise(function(resolve, reject) {
            database.query("duncehotel", "config", async (col) => {
                presence = (await col.findOne({ config: "presence" }, {})).presence;
                resolve();
            });
        });
        
        client.user.setPresence({ 
            activity: (presence.activity.enabled) ? { 
                name: presence.activity.name,
                type: presence.activity.type,
                url: presence.activity.url
            } : null,
            status: presence.status,
            afk: presence.afk
        })
        .catch(console.error);

        if (!presence.activity.enabled) client.user.setActivity(null);
    }
};

