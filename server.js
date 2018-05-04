var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);
var gs = require('./js/server/GameServer.js').GameServer;
var Role = require('./js/server/Role.js').Role;
var MsgType = require('./js/MsgType.js').MsgType;
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
    socket.on(MsgType.ServerEndpoint.AskServer, function(clientMsg, callback) {
        processServerRequest(socket, clientMsg, callback);
    });

}

function processServerRequest(socket, clientMsg, callback) {
    let requestArr = clientMsg.request.split("|");
    let request = requestArr[0];
    if (request === MsgType.Client.AskClientId) {
        processAskClientId(socket, clientMsg);
    } else if (request === MsgType.Client.AskGameId) {
        processAskGameId(clientMsg);
    } else if (request === MsgType.Client.AskStartGame) {
        processAskStartGame(clientMsg);
    } else if (request === MsgType.Client.DidRoleAction) {
        processRoleInput(clientMsg);
    }
    else if (request === MsgType.Client.AskStats) {
        processAskStats(clientMsg, callback);
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

function getRandomAvatarUrl() {
    let randPicNum = Util.randInt(17) + 1;
    let picUrl = "assets/avatars/profile-" + randPicNum + ".png";
    return picUrl;
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
    let player = gs.addPlayer(playerId, playerName);

    // Set a random avatar for the player
    player.avatarUrl = getRandomAvatarUrl();
    // console.log("player.avatarUrl: " + player.avatarUrl);

    // Send id to client
    let serverMsg = createServerMsg(MsgType.Server.GiveClientId, playerId);
    sendToClient(playerId, serverMsg);

    // Send all stats for client so far. That way client code for updating
    // its cache can be all in one event listener
    sendPlayerStats(playerId)
}

function processAskGameId(clientMsg) {
    console.log("client asked for gameId. Param: " + Util.pp(clientMsg));
    console.log("number of gamesessions currently: " + gs.getNumGames());
    let clientId = clientMsg.clientId;
    let gameSessionId = clientMsg.gameSessionId;
    let joined = false;
    // If client has provided a gameId they'd like to join, attempt to join that game
    if (gameSessionId) {
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
    let serverMsg = createServerMsg(MsgType.Server.GiveGameId, gameSessionId);
    sendToClient(clientId, serverMsg);

    // Update all players in the game (if any) of this new player connecting
    sendPlayerStatsToAll(gameSessionId);

    // Send client game stats at regular intervals
    //let intervalId = setInterval(clientGameStatsFn(socket, clientId, gameSessionId), timesPerSecToMs(1));
    // Maybe make the interval fn a part of an object. Can then set the intervalId as part of the object
    // So fn can stop itself upon seeing a certain condition.
    // Alternative to this setInterval is to send msg to all players in the game only when something happens
    // Also need to consider catching up players whose state goes out of sync with the server
}

function processAskStartGame(clientMsg) {
    console.log("client asked to start the game. Param: " + Util.pp(clientMsg));
    let gameSessionId = clientMsg.gameSessionId;
    let started = gs.startGame(gameSessionId);

    sendPlayerStats(clientMsg.clientId);

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

            let serverMsg = createServerMsg(MsgType.Server.GiveRole, roleCard.name);
            sendToClient(playerId, serverMsg);

            sendPlayerStats(playerId);
        }

        // Schedule for game to handle the players doing their role action
        setTimeout(getRoleInputsFn(gameId), secToMs(3));
    }
    return fn;
}

// Announcer will tell each client what they need to do for their action
var getRoleInputsFn = function(gameId) {
    let game = gs.games[gameId];
    let fn = function() {
        // Send to all clients "Everyone, close your eyes."
        let serverMsg = createServerMsg(MsgType.Server.AnnouncerMsg, "Everyone, close your eyes.");
        sendMsgToAllPlayers(gameId, serverMsg);

        // Send to each player, instructions specific to their role
        // Exact instructions will be client-side? Server, of course will validate
        // what the client sends. Actually, in the case of werewolves, need to know who
        // other werewolves are. Client could potentially ask to see other werewolves.

        game.forEachPlayer(function(player) {
            let data = "";
            let role = player.roleCard;
            if (role === Roles.werewolf) {
                // console.log("role is werewolf. playerId: " + player.id);
                // Get playerIds in game that have werewolf card
                let werewolfIds = game.getPlayersWithRole(Roles.werewolf);
                // console.log("players who are werewolves: " + Util.pp(werewolfIds));
                data = werewolfIds;
            }
            serverMsg = createServerMsg(MsgType.Server.AskDoRoleAction, data);
            serverMsg.role = role.name;
            serverMsg.playerInstructions = role.action;

            sendToClient(player.id, serverMsg);
        });
        // Schedule for game to check if all players have completed their
        // role actions. If so, process them and show the results
        setTimeout(processAllRoleActionsFn(gameId), secToMs(4));

    };
    return fn;
}

// TODO
var processAllRoleActionsFn = function(gameId) {
    return function() {
        console.log("In processAllRoleActionsFn.");
        let game = gs.games[gameId];
        // If not all players have completed their role action, check again later
        if (!game.allRoleActionsDone()) {
            console.log("rescheduling processAllRoleActionsFn to run again");
            setTimeout(processAllRoleActionsFn(gameId), secToMs(4));
            return;
        }

        let result = gs.processRoleInputs(gameId);

        // All players have completed their actions. Get processingLock
        // game.tryGetProcessingLock(GameState.SHOW_ACTION_RESULT);
    };
}

// *** Need to know when all players have completed their action. Might be time-based thing.
// Can also do a flag check?
function processRoleInput(clientMsg) {
    console.log("In processRoleInput. clientMsg: " + Util.pp(clientMsg));
    let clientId = clientMsg.clientId;
    let gameId = clientMsg.gameId;
    let roleCard = clientMsg.roleCard;
    let actionData = clientMsg.actionData;

    // *** Check if client packet has valid info
    let game = gs.games[gameId];
    let player = gs.players[clientId];

    let roleObj = Roles[roleCard];
    if (roleObj) {
        roleObj.processRoleAction(gs, clientMsg);
        console.log("processed role input. player: " + Object.inspect(player));
    } else {
        console.error("In processRoleInput. Unknown roleCard: " + roleCard);
    }
    // Check if all players have completed their role action. If so, set the next phase to start
    // Next phase is: SHOW_ACTION_RESULT
}

function processAskStats(clientMsg, callback) {
    let requestArr = clientMsg.request.split("|");
    let request = requestArr[1];
    let gameSessionId = clientMsg.gameSessionId;
    let gameSession = gs.games[gameSessionId];

    if (request === "numPlayersInGame") {
        if (gameSession) {
            callback(gameSession.getNumPlayers());
        } else {
            console.log("unknown game session: " + gameSessionId);
        }
    } else if (request === "gameState") {
        if (gameSession) {
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
    stats["avatarUrl"] = player.avatarUrl;
    // console.log("in create stats data. player.avatarUrl: " + player.avatarUrl);

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
    // console.log("role card: " + Util.pp(player.getCardAsStr()));
    stats["allCards"] = game.getCardsAsStrArr();

    return stats;
}

function sendToClient(playerId, msg) {
    let socket = gs.playerToSocketMap[playerId];
    if (!socket) {
        console.error("No socket for player. playerId: " + playerId);
    } else if (!socket.connected) {
        console.error("Socket exists but is not connected. playerId: " + playerId);
    } else {
        socket.emit(MsgType.ClientEndpoint.ServerUpdate, msg);
    }
}

function sendMsgToAllPlayers(gameId, msg) {
    let game = gs.getGame(gameId);
    if (game) {
        let playerIds = game.getPlayerIds();
        for (let playerId of playerIds) {
            sendToClient(playerId, msg)
        }
    } else {
        console.log("Game doesn't exist. gameId: " + gameId);
    }
}

function sendPlayerStats(playerId) {
    let playerGameStats = createPlayerGameStatsData(playerId);
    let serverMsg = createServerMsg(MsgType.Server.GiveStats, playerGameStats);
    sendToClient(playerId, serverMsg);
}

// Update all clients in the game
function sendPlayerStatsToAll(gameId) {
    let game = gs.getGame(gameId);
    if (game) {
        let playerIds = game.getPlayerIds();
        for (let playerId of playerIds) {
            sendPlayerStats(playerId)
        }
    } else {
        console.log("Game doesn't exist. gameId: " + gameId);
    }
}

server.getNumConnected = function() {
    return Object.keys(gs.playerToSocketMap).length;
    //return Object.keys(gs.players).length;
};
