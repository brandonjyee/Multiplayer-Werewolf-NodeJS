var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);
var gs = require('./server/GameServer.js').GameServer;

//app.use('/server', express.static(__dirname + '/server'));

// The default route will return the page containing the client code
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

// The admin page
app.get('/admin', function(req, res) {
    res.sendFile(__dirname + '/admin.html');
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
    /*let gameLoopFn = function () {
        let randNum = Math.floor(Math.random() * 1000);
        io.emit('numbers-update', randNum);
    };*/

    // Set the server processing interval
    setInterval(gameLoopFn, server.clientUpdateRate);
    // Send server stats 
    setInterval(serverStatsFn, timesPerSecToMs(5));
});

function timesPerSecToMs(num) {
    return 1000 / num;
}

var gameLoopFn = function () {
    let randNum = Math.floor(Math.random() * 1000);
    io.emit('numbers-update', randNum);
};

var serverStatsFn = function() {
    let stats = {};
    stats.numSocketsConnected = server.getNumConnected();
    stats.numPlayers = gs.getNumPlayers();
    stats.numGames = gs.getNumGames();
    
    io.emit("server-stats", stats);
};

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

    socket.on('disconnect', function() {
        console.log('Socket disconnection with ID ' + socket.id);
        // Remove the connection from the GameServer
        delete gs.socketMap[socket.id];
    });

    socket.on("ask-client-id", function(clientMsg) {
        console.log("client asked for client id. Param: " + pp(clientMsg));
        let playerId = clientMsg.clientId;
        if (!playerId) {
            playerId = gs.generatePlayerId();
        }
        // Save the connection
        gs.socketMap[playerId] = socket;
        // Generate a Player object to represent the player
        gs.addPlayer(playerId);
        // Send id to client
        socket.emit("client-id", playerId);
    });

    socket.on("ask-game-id", function(clientMsg) {
        console.log("client asked for gameId. Param: " + pp(clientMsg));
        console.log("number of gamesessions currently: " + gs.getNumGames());
        let gameSessionId = clientMsg.gameSessionId;
        // If client hasn't provided a gameId they'd like to join, server will provide one
        if (!gameSessionId) {
            console.log("need to generate gamesessionid for client");
            gameSessionId = gs.joinOpenGame(clientMsg.clientId);
        }
        console.log("sending gameSessionId: " + gameSessionId);
        socket.emit("game-session-id", gameSessionId);
    })

}

// Pretty print an object
function pp(obj) {
    return JSON.stringify(obj, undefined, 2);
}