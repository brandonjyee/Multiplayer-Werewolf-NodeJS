var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);
var gs = require('./js/server/GameServer.js').GameServer;
var Role = require('./js/server/Role.js').Role;
var Util = require('./js/Util.js').Util;
var util = require('util');

//app.use('/server', express.static(__dirname + '/server'));

// The default route will return the page containing the client code
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/client-styles.css', function(req, res) {
    res.sendFile(__dirname + '/client-styles.css');
});

// The admin page
app.get('/admin', function(req, res) {
    res.sendFile(__dirname + '/admin.html');
});

// Serve static files from assets directory
app.use('/assets', express.static(__dirname + '/assets'));
app.use('/js', express.static(__dirname + '/js'));

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

function secToMs(num) {
    return 1000 * num;
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
    } else if (request === "did-role-action") {
        processRoleInput(socket, clientMsg);
    } 
    // else if (request === "did-role-action") {
    //     processRoleAction
    // } 
    else if (request === "stats") {
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
    let playerName = clientMsg.playerName;
    let playerId = clientMsg.clientId;
    if (!playerId) {
        playerId = gs.generatePlayerId();
    }
    // Save the connection
    gs.socketToPlayerMap[socket.id] = playerId;
    gs.playerToSocketMap[playerId] = socket;
    // Generate a Player object to represent the player
    gs.addPlayer(playerId, playerName);
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

    // sendPlayerStats(socket, clientMsg.clientId);

    // Update all players in the game (if any) of this new player connecting
    sendPlayerStatsToAll(gameSessionId);

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

    sendPlayerStats(socket, clientMsg.clientId);
    
    // Schedule for game to hand out role cards
    if (started) {
        setTimeout(giveRolesFn(gameSessionId), secToMs(2));
    }
}

// Returns a callback fn that will give roles to clients
function giveRolesFn(gameId) {
    let fn = function() {
        console.log("Giving roles to clients. gameId: " + gameId);
        let pairings = gs.giveRoleCards(gameId);
        console.log("pairings: " + util.inspect(pairings));
        // Notify each client what their role card is
        for (let i = 0; i < pairings.length; i++) {
            let playerId = pairings[i].playerId;
            let roleCard = pairings[i].roleCard;
            //console.log("playerToSocketMap: " + util.inspect(gs.playerToSocketMap));
            let socket = gs.playerToSocketMap[playerId];
            if (!socket) {
                console.error("No socket for player. playerId: " + playerId);
                console.error("keys for playerToSocketMap: " + util.inspect(Object.keys(gs.playerToSocketMap)));
            }
            let serverMsg = createServerMsg("give-role", roleCard.name);
            socket.emit("server-update", serverMsg);

            sendPlayerStats(socket, playerId);            
        }

        // Schedule for game to handle the players doing their role action 
        setTimeout(getRoleInputsFn(gameId), secToMs(4));  
    }
    return fn;
}

// Announcer will tell each client what they need to do for their action
var getRoleInputsFn = function(gameId) {
    let game = gs.games[gameId];
    let fn = function() {
        // Send to all clients "Everyone, close your eyes."
        let serverMsg = createServerMsg("announcer-msg", "Everyone, close your eyes.");
        sendMsgToAllPlayers(gameId, serverMsg);

        // Send to each player, instructions specific to their role
        // Exact instructions will be client-side? Server, of course will validate
        // what the client sends. Actually, in the case of werewolves, need to know who
        // other werewolves are. Client could potentially ask to see other werewolves.
        // let game = gs.games[gameId];
        // let playerIds = game.getPlayerIds();
        // for (let playerId of playerIds) {
        //     let player = game.players[playerId];
        // }

        game.forEachPlayer(function(player) {
            let data = "";
            let role = player.roleCard;
            if (role === Role.WEREWOLF) {
                // Get playerIds in game that have werewolf card
                let werewolfIds = game.getPlayersWithRole(Role.WEREWOLF);
                data = werewolfIds.join("|");
            }
            serverMsg = createServerMsg("do-role-action", data);
            serverMsg.role = role.name;
            serverMsg.playerInstructions = role.action;

            let socket = gs.playerToSocketMap[player.id];
            socket.emit("server-update", serverMsg);
        });
        
    };
    return fn;
}

// *** Need to know when all players have completed their action. Might be time-based thing.
// Can also do a flag check?
function processRoleInput(socket, clientMsg) {
    let clientId = clientMsg.clientId;
    let gameId = clientMsg.gameId;
    let roleCard = clientMsg.roleCard;
    let actionData = clientMsg.actionData;

    // *** Check if client packet has valid info
    let game = gs.games[gameId];
    let player = gs.players[clientId];

    if (roleCard === "werewolf") {
        // Werewolves don't do anything. Just look at each other.
    } else if (roleCard === "seer") {
        // Look at another player's card or two center cards. Should cards have Ids?
        // For now, either choose playerId or center
        // Check validity
        if (actionData === "center" || game.hasPlayer(actionData)) {
            // It's a valid input
            // Return results to user
            player.actions["action"] = actionData;
        }
    } else if (roleCard === "robber") {
        // 

    } else if (roleCard === "troublemaker") {

    } else if (roleCard === "villager") {

    } else {
        console.error("Unknown roleCard: " + roleCard);
    }
    // Check if all players have completed their role action. If so, set the next phase to start
    // Next phase is: SHOW_ACTION_RESULT
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

function createPlayerGameStatsData(clientId) {
    // clientId, gameId, numplayers, game state, client's role card
    let stats = {};
    let player = gs.players[clientId];
    if (!player) {
        console.error("Can't find player. id: " + clientId);
        return stats;
    }
    stats["clientId"] = clientId;
    stats["playerName"] = player.name;

    let game = player.gameSession;
    if (!game) {
        return stats;
    }
    stats["gameId"] = game.id;

    let numPlayers = game.getNumPlayers();
    stats["numPlayers"] = numPlayers;
    stats["playersInGame"] = game.getPlayerData_Basic();
    stats["gameState"] = game.state.name;    
    stats["roleCard"] = player.getCardAsStr();
    console.log("role card: " + Util.pp(player.getCardAsStr()));
    stats["allCards"] = game.getCardsAsStrArr();
    
    return stats;
}

function sendMsgToPlayer(socket, msg) {
    socket.emit("server-update", msg);
}

function sendMsgToAllPlayers(gameId, msg) {
    let socketObjs = gs.getPlayerSockets(gameId);
    for (let socketObj of socketObjs) {
        let socket = socketObj.socket;
        sendMsgToPlayer(socket, msg);
    }
}

function sendPlayerStats(socket, playerId) {
    let playerGameStats = createPlayerGameStatsData(playerId);
    let serverMsg = createServerMsg("stats", playerGameStats);
    //socket.emit("server-update", serverMsg);
    sendMsgToPlayer(socket, serverMsg);
}

// Update all clients in the game
function sendPlayerStatsToAll(gameId) {
    let socketsArr = gs.getPlayerSockets(gameId);
    for (let socketObj of socketsArr) {
        let playerId = socketObj.playerId;
        let socket = socketObj.socket;
        sendPlayerStats(socket, playerId);
    }
    // let game = gs.games[gameId];
    // let playerIds = game.getPlayerIds(); //Object.keys(game.players);
    // for (let playerId of playerIds) {
    //     let socket = gs.playerToSocketMap[playerId];
    //     sendPlayerStats(socket, playerId);
    // }
}

server.getNumConnected = function() {
    return Object.keys(gs.playerToSocketMap).length;
    //return Object.keys(gs.players).length;
};
