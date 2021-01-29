// For repl.it hosting
const express = require('express');
const server = express();

server.all('/', (req, res) => {
    res.send('duncebot is alive!')
});

module.exports = () => {
    server.listen(3000, () =>{ console.log("Server is ready!")});
}