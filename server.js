var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);

// The default route will return the page containing the client code
app.get('/', function(req, res) {
    res.sendFile(__dirname+'/index.html');
});

// The client accesses the http server to get the web page that contains the client code
// Once the page loads the client code, the client will attempt to establish a websocket
// connection to the server
server.listen(8081, function() { 
    console.log('Listening on ' + server.address().port);
    // Rate at which update packets are sent
    let packetsPerSecond = 5;
    server.clientUpdateRate = 1000 / packetsPerSecond; 
    
    // This represents the main server loop that executes at regular intervals
    let gameLoopFn = function() {
        var randNum = Math.floor(Math.random() * 1000);
        io.emit('numbers-update', randNum);
    };
    setInterval(gameLoopFn, server.clientUpdateRate);
});

io.on('connection', function(socket) {
    console.log('Socket connection established with ID ' + socket.id);
});