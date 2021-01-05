require("dotenv").config();

// Importing MongoDB
const MongoClient = require('mongodb').MongoClient;
const URI = process.env.DB_URI;
var dbs;

module.exports = {
    connect: async (callback) => {
        let client = new MongoClient(URI, { useNewUrlParser: true, useUnifiedTopology: true });
        try {
            await client.connect();
            dbs = {
                duncehotel: client.db("duncehotel")
            };
            callback(null);
        } catch(err) {
            callback(err);
        }
    },
    query: async (dbName, colName, callback) => {
        callback(dbs[dbName].collection(colName));
    }
}