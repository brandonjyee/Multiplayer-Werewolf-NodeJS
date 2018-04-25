var Player = require('./Player.js').Player;
var GameSession = require('./GameSession.js').GameSession;


var GameServer = {
    lastPlayerID: 0,
    // Map of socket id's to the player id's of the associated players
    socketMap: {},
    // Map of all connected players, fetchable by id
    players: {},
    // Game sessions, mapped by gameId
    games: {}
}

//A few helper functions

GameServer.uuidv4 = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
    /* // Cryptographically secure version
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    )*/
}

GameServer.generatePlayerId = function() {
    let clientId = 0;
    let found = false;
    // Generate IDs until found a fresh one
    while (!found) {
        clientId = GameServer.uuidv4(); //Math.floor(Math.random() * 100000);
        if (GameServer.players[clientId] === undefined) {
            found = true;
        }
    }
    return clientId;
}

// Map of {socket id, player id}
GameServer.addPlayerID = function(socketID, playerID) { 
    GameServer.socketMap[socketID] = playerID;
};

GameServer.getPlayerID = function(socketID) {
    return GameServer.socketMap[socketID];
};

// returns the player corresponding to a specific *socket* ID
GameServer.getPlayer = function(socketID) { 
    return GameServer.players[GameServer.getPlayerID(socketID)];
};

GameServer.addPlayer = function(playerId) {
    let newPlayer = new Player();
    newPlayer.id = playerId;
    GameServer.players[playerId] = newPlayer;
}

// remove a socket id/player id mapping
GameServer.deleteSocketID = function(socketID) { 
    delete GameServer.socketMap[socketID];
};

// Returns the game ID
GameServer.joinOpenGame = function(playerId) {
    // Maybe better idea is to add player to a queue and server loop will 
    // assign ppl in the queue to open games
    let player = GameServer.players[playerId];
    let retGameId = "";
    for (let gameId in GameServer.games) {
        let gameSession = GameServer.games[gameId];
        // If game is looking for more players, add this player to the game
        if (gameSession.getNumPlayers() < gameSession.maxPlayers) {
            GameServer.addPlayerToGame(player, gameSession);

            // Return this game session's ID
            retGameId = gameSession.id;
        }
    }
    // If haven't found an existing game session, create a new one
    if (!retGameId) {
        // Loop until can generate a non-existing gameId
        let found = false;
        while (!found) {
            gameId = GameServer.uuidv4();
            // Create a new game session
            if (!GameServer.games[gameId]) {
                let newGameSession = new GameSession();
                newGameSession.id = gameId;
                // Update the GameSession and Player
                GameServer.addPlayerToGame(player, newGameSession);
                // Update the GameServer
                GameServer.games[gameId] = newGameSession;
                found = true;
            }
        }
    }
    return gameId;
}

GameServer.addPlayerToGame = function(player, gameSession) {
    // Update GameSession
    gameSession.players[player.id] = player;
    // Update Player
    player.gameSession = gameSession;
}

GameServer.getNumGames = function() {
    return Object.keys(GameServer.games).length;
}

GameServer.getNumPlayers = function() {
    return Object.keys(GameServer.players).length;
}

// check if no other player is using same socket ID
GameServer.checkSocketID = function(id) { 
    return (GameServer.getPlayerID(id) === undefined);
};

// Check if no other player is using same player ID
GameServer.checkPlayerID = function(id) { 
    return (GameServer.players[id] === undefined);
};

// Data is the data object sent by the client to request the creation of a new player
GameServer.addNewPlayer = function(socket, data) {
    if (!data.name || data.name.length == 0) { 
        return;
    }
    // Creates a player with client specified name
    var player = new Player(data.name);

    // The playerId will be the socketId

    /*
    var document = player.dbTrim();
    GameServer.server.db.collection('players').insertOne(document,function(err){
        if(err) throw err;
        var mongoID = document._id.toString(); // The Mongo driver for NodeJS appends the _id field to the original object reference
        player.setIDs(mongoID,socket.id);
        GameServer.finalizePlayer(socket,player);
        GameServer.server.sendID(socket,mongoID);
    });
    */
};

/*
GameServer.loadPlayer = function(socket,id){
    GameServer.server.db.collection('players').findOne({_id: new ObjectId(id)},function(err,doc){
        if(err) throw err;
        if(!doc) {
            GameServer.server.sendError(socket);
            return;
        }
        var player = new Player();
        var mongoID = doc._id.toString();
        player.setIDs(mongoID,socket.id);
        player.getDataFromDb(doc);
        GameServer.finalizePlayer(socket,player);
    });
};

GameServer.finalizePlayer = function(socket,player){
    GameServer.addPlayerID(socket.id,player.id);
    GameServer.embedPlayer(player);
    GameServer.server.sendInitializationPacket(socket,GameServer.createInitializationPacket(player.id));
};

GameServer.createInitializationPacket = function(playerID){
    // Create the packet that the client will receive from the server in order to initialize the game
    return {
        player: GameServer.players[playerID].trim(), // info about the player
        nbconnected: GameServer.server.getNbConnected(),
        nbAOIhorizontal: AOIutils.nbAOIhorizontal, // info about AOI's
        lastAOIid: AOIutils.lastAOIid
    };
};
*/

/*
GameServer.savePlayer = function(player){
    // Save the progress of a player
    GameServer.server.db.collection('players').updateOne(
        {_id: new ObjectId(player.getMongoID())},
        {$set: player.dbTrim() },
        function(err){
            if(err) throw err;
    });
    player.setLastSavedPosition();
};

GameServer.deletePlayer = function(id){
    GameServer.server.db.collection('players').deleteOne({_id: new ObjectId(id)},function(err){
        if(err) throw err;
    });
};

GameServer.removePlayer = function(socketID){
    var player = GameServer.getPlayer(socketID);
    GameServer.removeFromLocation(player);
    player.setProperty('connected',false);
    player.die();
    var AOIs = player.listAdjacentAOIs(true);
    AOIs.forEach(function(aoi){
        GameServer.addDisconnectToAOI(aoi,player.id);
    });
    delete GameServer.players[player.id];
    GameServer.nbConnectedChanged = true;
    GameServer.deleteSocketID(socketID);
};
*/


/*
// called every 1/12 of sec
GameServer.update = function(){ 
    Object.keys(GameServer.players).forEach(function(key) {
        var player = GameServer.players[key];
        if(player.alive) player.update();
    });
    Object.keys(GameServer.monstersTable).forEach(function(key) {
        var monster = GameServer.monstersTable[key];
        if(monster.alive) monster.update();
    });
};
*/

/*
//Function responsible for setting up and sending update packets to clients
GameServer.updatePlayers = function(){ 
    Object.keys(GameServer.players).forEach(function(key) {
        var player = GameServer.players[key];
        var localPkg = player.getIndividualUpdatePackage(); // the local pkg is player-specific
        var globalPkg = GameServer.AOIs[player.aoi].getUpdatePacket(); // the global pkg is AOI-specific
        var individualGlobalPkg = clone(globalPkg,false); // clone the global pkg to be able to modify it without affecting the original
        // player.newAOIs is the list of AOIs about which the player hasn't checked for updates yet
        for(var i = 0; i < player.newAOIs.length; i++){
            individualGlobalPkg.synchronize(GameServer.AOIs[player.newAOIs[i]]); // fetch updates from the new AOIs
        }
        individualGlobalPkg.removeEcho(player.id); // remove redundant information from multiple update sources
        if(individualGlobalPkg.isEmpty()) individualGlobalPkg = null;
        if(individualGlobalPkg === null && localPkg === null && !GameServer.nbConnectedChanged) return;
        var finalPackage = {};
        if(individualGlobalPkg) finalPackage.global = individualGlobalPkg.clean();
        if(localPkg) finalPackage.local = localPkg.clean();
        if(GameServer.nbConnectedChanged) finalPackage.nbconnected = GameServer.server.getNbConnected();
        GameServer.server.sendUpdate(player.socketID,finalPackage);
        player.newAOIs = [];
    });
    GameServer.nbConnectedChanged = false;
    GameServer.clearAOIs(); // erase the update content of all AOIs that had any
};
*/


module.exports.GameServer = GameServer;