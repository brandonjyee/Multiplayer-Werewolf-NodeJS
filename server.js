var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);
var gs = require('./server/GameServer.js').GameServer;
var Util = require('./Util.js').Util;

//app.use('/server', express.static(__dirname + '/server'));

// The default route will return the page containing the client code
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

// The admin page
app.get('/admin', function(req, res) {
    res.sendFile(__dirname + '/admin.html');
});

// Serve static files from assets directory
// app.use(express.static('assets'))
app.use('/assets', express.static(__dirname + '/assets'));

// The client accesses the http server to get the web page that contains the client code
// Once the page loads the client code, the client will attempt to establish a websocket
// connection to the server
server.listen(8081, function() { 
    console.log('Listening on ' + server.address().port);
    
    // This represents the main server loop that executes at regular intervals
    setInterval(gameLoopFn, timesPerSecToMs(5));
    // Send overall server stats at regular intervals
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
    
    io.emit("admin-server-stats", stats);
};

io.on('connection', function(socket) {
    console.log('Socket connection established with ID ' + socket.id);
    console.log(server.getNumConnected() + ' already connected');

    registerSocketEventListeners(socket);
});

// Perhaps only use endpoints to distinguish source and message data type?
function registerSocketEventListeners(socket) {

    socket.on('disconnect', function() {
        console.log('Socket disconnection with ID ' + socket.id);
        // Remove the connection from the GameServer
        let playerId = gs.socketToPlayerMap[socket.id];
        delete gs.socketToPlayerMap[socket.id];
        delete gs.playerToSocketMap[playerId];
    });

    // Client requests come through this endpoint. Supposedly each endpoint will open a new
    // TCP connection (need verification), so we'll try to keep the number of endpoints to a minimum
    // and have the server further delegate the processing based on info in the clientMsg
    socket.on("ask-server", function(clientMsg, callback) {
        processServerRequest(socket, clientMsg, callback);
    });

}

function processServerRequest(socket, clientMsg, callback) {
    let requestArr = clientMsg.request.split("|");
    let request = requestArr[0];
    if (request === "client-id") {
        processAskClientId(socket, clientMsg);
    } else if (request === "game-id") {
        processAskGameId(socket, clientMsg);
    } else if (request === "start-game") {
        processAskStartGame(socket, clientMsg);
    } else if (request === "stats") {
        processAskStats(socket, clientMsg, callback);
    }
    else {
        console.error("Unknown server request: " + request);
    }
}

function createServerMsg(type, data) {
    return {
        type: type,
        data: data
    };
}

function processAskClientId(socket, clientMsg) {
    console.log("client asked for client id. Param: " + Util.pp(clientMsg));
    let playerId = clientMsg.clientId;
    if (!playerId) {
        playerId = gs.generatePlayerId();
    }
    // Save the connection
    gs.socketToPlayerMap[socket.id] = playerId;
    gs.playerToSocketMap[playerId] = socket;
    // Generate a Player object to represent the player
    gs.addPlayer(playerId);
    // Send id to client
    let serverMsg = createServerMsg("client-id", playerId);
    socket.emit("server-update", serverMsg);
}

function processAskGameId(socket, clientMsg) {
    console.log("client asked for gameId. Param: " + Util.pp(clientMsg));
    console.log("number of gamesessions currently: " + gs.getNumGames());
    let clientId = clientMsg.clientId;
    let gameSessionId = clientMsg.gameSessionId;
    let joined = false;
    // If client has provided a gameId they'd like to join, attempt to join that game
    if (!!gameSessionId) {
        joined = gs.tryJoinGame(clientId, gameSessionId);
        if (!joined) {
            console.log("Failed to join existing game. Need to join new game.");
            gameSessionId = gs.joinOpenGame(clientId);
        }
    }
    // If client hasn't provided a gameId they'd like to join, server will provide one 
    else {
        console.log("need to generate gamesessionid for client");
        gameSessionId = gs.joinOpenGame(clientId);
    }
    console.log("sending gameSessionId: " + gameSessionId);
    let serverMsg = createServerMsg("game-session-id", gameSessionId);
    socket.emit("server-update", serverMsg);

    sendClientStats(socket, clientMsg.clientId);

    // Send client game stats at regular intervals
    //let intervalId = setInterval(clientGameStatsFn(socket, clientId, gameSessionId), timesPerSecToMs(1));
    // Maybe make the interval fn a part of an object. Can then set the intervalId as part of the object
    // So fn can stop itself upon seeing a certain condition.
    // Alternative to this setInterval is to send msg to all players in the game only when something happens
    // Also need to consider catching up players whose state goes out of sync with the server
}

// function clientGameStatsFn(socket, clientId, gameId) {
//     let game = gs.games[gameId];
//     if (!!game) {
//         // TODO
//     }
//     let stats = {};
//     stats.numSocketsConnected = server.getNumConnected();
//     stats.numPlayers = gs.getNumPlayers();
//     stats.numGames = gs.getNumGames();
    
//     socket.emit("client-server-stats", stats);
// }

function processAskStartGame(socket, clientMsg) {
    console.log("client asked to start the game. Param: " + Util.pp(clientMsg));
    let gameSessionId = clientMsg.gameSessionId;
    let started = gs.startGame(gameSessionId);

    sendClientStats(socket, clientMsg.clientId);
    
    // Schedule for game to hand out role cards in 1 sec
    if (started) {
        setTimeout(giveRolesFn(gameSessionId), timesPerSecToMs(1));
    }
}

// Returns a callback fn that will give roles to clients
function giveRolesFn(gameId) {
    let fn = function() {
        console.log("Giving roles to clients. gameId: " + gameId);
        let pairings = gs.giveRoleCards(gameId);
        // Notify clients what their role card is
        for (let i = 0; i < pairings.length; i++) {
            let playerId = pairings.playerId;
            let roleCard = pairings.roleCard;
            let socket = gs.playerToSocketMap[playerId];
            let serverMsg = createServerMsg("give-role", roleCard);
            socket.emit("server-update", serverMsg);

            sendClientStats(socket, playerId);
        }
    }
    return fn;
}

function processAskStats(socket, clientMsg, callback) {
    let requestArr = clientMsg.request.split("|");
    let request = requestArr[1];
    let gameSessionId = clientMsg.gameSessionId;
    let gameSession = gs.games[gameSessionId];

    if (request === "numPlayersInGame") {
        if (!!gameSession) {
            callback(gameSession.getNumPlayers());
        } else {
            console.log("unknown game session: " + gameSessionId);
        }
    } else if (request === "gameState") {
        if (!!gameSession) {
            callback(gameSession.state);
        } else {
            console.log("unknown game session: " + gameSessionId);
        }
    }
    else {
        console.error("Unknown ask-stats request: " + request);
    }
}

function createClientGameStatsData(clientId) {
    // clientId, gameId, numplayers, game state, client's role card
    let stats = {};
    let player = gs.players[clientId];
    if (!player) {
        console.error("Can't find player. id: " + clientId);
        return stats;
    }
    stats["clientId"] = clientId;

    let game = player.gameSession;
    if (!game) {
        return stats;
    }
    stats["gameId"] = game.id;

    let numPlayers = game.getNumPlayers();
    stats["numPlayers"] = numPlayers;
    stats["gameState"] = game.state.name;    
    stats["roleCard"] = player.roleCard;
    console.log("role card: " + Util.pp(player.roleCard));
    
    return stats;
}

function sendClientStats(socket, clientId) {
    let clientGameStats = createClientGameStatsData(clientId);
    let serverMsg = createServerMsg("stats", clientGameStats);
    socket.emit("server-update", serverMsg);
}

server.getNumConnected = function() {
    return Object.keys(gs.playerToSocketMap).length;
    //return Object.keys(gs.players).length;
};
