var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);
var gs = require('./server/GameServer.js').GameServer;

// The default route will return the page containing the client code
app.get('/', function(req, res) {
    res.sendFile(__dirname+'/index.html');
});

// The client accesses the http server to get the web page that contains the client code
// Once the page loads the client code, the client will attempt to establish a websocket
// connection to the server
server.listen(8081, function() { 
    console.log('Listening on ' + server.address().port);
    
    // Rate at which update packets are sent to client
    let packetsPerSecond = 5;
    server.clientUpdateRate = 1000 / packetsPerSecond; 
    
    // This represents the main server loop that executes at regular intervals
    let gameLoopFn = function () {
        let randNum = Math.floor(Math.random() * 1000);
        io.emit('numbers-update', randNum);
    };

    // Set the server processing interval
    setInterval(gameLoopFn, server.clientUpdateRate);
});

io.on('connection', function(socket) {
    console.log('Socket connection established with ID ' + socket.id);
    console.log(server.getNumConnected() + ' already connected');

    registerSocketEventListeners(socket);
});

server.getNumConnected = function() {
    return Object.keys(gs.socketMap).length;
    //return Object.keys(gs.players).length;
};

function registerSocketEventListeners(socket) {
    // =============== Register the socket listening events =========
    socket.on('disconnect', function() {
        console.log('Socket disconnection with ID ' + socket.id);
        // Remove the connection from the GameServer
        delete gs.socketMap[socket.id];
    });

    socket.on("ask-client-id", function(clientId) {
        console.log("client asked for client id. Param: " + clientId);
        let playerId = clientId;
        if (!playerId) {
            playerId = gs.generatePlayerId();
        }

        // Save the connection
        gs.socketMap[playerId] = socket;
    
        // Send id to client
        socket.emit("client-id", playerId);
    });

    socket.on("ask-reconnect", function(clientId) {
        console.log("client asked for reconnect with id " + clientId);
    });

    // ================================================================
}