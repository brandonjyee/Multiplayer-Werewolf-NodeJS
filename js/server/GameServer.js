var Player = require('./Player.js').Player;
var GameSession = require('./GameSession.js').GameSession;
var GameState = require('./GameState.js').GameState;
var Role = require('./Role.js').Role;
var Util = require('../Util.js').Util;
var util = require('util');


var GameServer = {
    lastPlayerID: 0,
    // Map of socket id's to the player id's of the associated players. 
    // **Duno why have this
    socketToPlayerMap: {},
    // Map of playerId to socket obj
    playerToSocketMap: {},
    // Map of all connected players, fetchable by id
    players: {},
    // Game sessions, mapped by gameId
    games: {}
}

GameServer.generatePlayerId = function() {
    let clientId = 0;
    let found = false;
    // Generate IDs until found a fresh one
    while (!found) {
        clientId = Util.uuidv4();
        if (GameServer.players[clientId] === undefined) {
            found = true;
        }
    }
    return clientId;
}

// Map of {socket id, player id}
GameServer.addPlayerID = function(socketID, playerID) { 
    GameServer.socketToPlayerMap[socketID] = playerID;
};

GameServer.getPlayerID = function(socketID) {
    return GameServer.socketToPlayerMap[socketID];
};

// Returns the player corresponding to a specific *socket* ID
GameServer.getPlayer = function(socketID) { 
    return GameServer.players[GameServer.getPlayerID(socketID)];
};

GameServer.addPlayer = function(playerId, name) {
    let newPlayer = new Player(name);
    newPlayer.id = playerId;
    GameServer.players[playerId] = newPlayer;
}

// remove a socket id/player id mapping
GameServer.deleteSocketID = function(socketID) { 
    delete GameServer.socketToPlayerMap[socketID];
};

GameServer.tryJoinGame = function(playerId, gameId) {
    let player = GameServer.players[playerId];
    let game = GameServer.games[gameId];
    if (!!game) {
        // Check if the player is part of the game. Client can only rejoin a game they're already registered to
        if (!game.players[playerId]) {
            return false;
        } else {
            console.log("Game exists but player not registered to this game. { player " + playerId + " game: " + gameId + " }");
            return false;
        }
    } else {
        console.log("No such game. { player " + playerId + " game: " + gameId + " }");
        return false;
    }
    return true;
}

// Returns the game ID
GameServer.joinOpenGame = function(playerId) {
    // Maybe better idea is to add player to a queue and server loop will 
    // assign ppl in the queue to open games
    let player = GameServer.players[playerId];
    for (let gameId in GameServer.games) {
        let gameSession = GameServer.games[gameId];
        // If game is looking for more players, add this player to the game
        if (gameSession.getNumPlayers() < gameSession.maxPlayers
            && gameSession.state === GameState.WAIT_TO_START) {
            GameServer.addPlayerToGame(player, gameSession);

            // Return this game session's ID
            return gameSession.id;
        }
    }
    // If haven't found an existing game session, create a new one
    let newGameSession = GameServer.createGame();
    // Update the GameSession and Player
    GameServer.addPlayerToGame(player, newGameSession);
    return newGameSession.id;
}

GameServer.createGame = function() {
    // Loop until can generate a non-existing gameId
    while (true) {
        gameId = Util.uuidv4();
        // Create a new game session if there's no existing session with the given id
        if (!GameServer.games[gameId]) {
            let newGameSession = new GameSession(gameId);
            // Update the GameServer
            GameServer.games[gameId] = newGameSession;
            return newGameSession;
        }
    }
}

GameServer.addPlayerToGame = function(player, gameSession) {
    // Update GameSession
    gameSession.players[player.id] = player;
    // Update Player
    player.gameSession = gameSession;
}

// Get total number of active games
GameServer.getNumGames = function() {
    return Object.keys(GameServer.games).length;
}

// Gets total number of players connected to the server
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
};

GameServer.startGame = function(gameId) {
    let game = GameServer.games[gameId];
    // Check preconditions
    if (!game) {
        console.error("No such game with gameId: " + gameId);
        return false;
    }
    if (game.state !== GameState.WAIT_TO_START) {
        console.error("Trying to start a game that's not in initial state. State: " + Util.pp(game.state));
        return false;
    }
    if (game.getNumPlayers() < game.minPlayers) {
        console.error("Trying to start a game with not enough players. Need: " + game.minPlayers + " have: " + game.getNumPlayers());
        return false;
    }

    // Conditions have been met to start the game. Transition to give roles to players.
    // Check if can grab the lock on processing this game state. This is to coordinate
    // such that only one function processes this game state (in case multiple functions
    // are scheduled). Alternative is to ensure that only one function is scheduled, but
    // that might be difficult in some cases. Scheduling is currently handled by server.js, not by
    // GameServer.js.
    if (!game.tryGetProcessingLock(GameState.WAIT_TO_START)) {
        return false;
    }

    game.state = GameState.GIVE_ROLES;
    // Now that we've set the number of players, create the deck of role cards
    game.cards = Role.generateRandomDeck(game.getNumPlayers());
    console.log("Created card deck for game. gameId: " + gameId + " deck: " + Util.pp(game.cards));
    // Need to send msg to client
    return true;
}

GameServer.giveRoleCards = function(gameId) {
    console.log("in giveRoleCards. gameId: " + gameId);
    // Check preconditions
    let game = GameServer.games[gameId];
    if (!game) {
        console.error("Game doesn't exist. gameId: " + gameId);
        return false;
    }
    if (game.state !== GameState.GIVE_ROLES) {
        console.error("Game is NOT in a state to give role cards. state: " + game.state);
        return false;
    }
    // Try to get the processing lock
    if (!game.tryGetProcessingLock(GameState.GIVE_ROLES)) {
        return false;
    }

    let players = game.players;
    //console.log("players: " + util.inspect(players));
    // Cards should already be shuffled but doesn't hurt to shuffle again    
    let cards = game.getCopyOfCards();
    Util.shuffle(cards);
    console.log("cards: " + util.inspect(cards));

    // Return a list of pairings: { playerId1: card, playerId2: card, ... }
    let pairings = [];
    game.forEachPlayer( function(player, index) {
        let card = cards.pop();
        player.roleCard = card;
        pairings.push({ 
            playerId: player.id,
            roleCard: card
        });
    });
    console.log("pairings: " + Util.pp(pairings));
    // After assigning player cards, assign the remaining cards to the center
    //for (let i = playerIds.length; i < cards.length; i++) {
    while (cards.length > 0) {
        game.centerCards.push(cards.pop());
    }
    console.log("center cards: " + Util.pp(game.centerCards));

    Util.shuffle(cards);
    
    // Transition the game to the next state
    game.state = GameState.GET_ROLE_INPUTS;

    return pairings;
}

GameServer.processRoleInputs = function(gameId) {
    console.log("in processRoleInputs. gameId: " + gameId);
    // Check preconditions
    let game = GameServer.games[gameId];
    if (!game) {
        console.error("Game doesn't exist. gameId: " + gameId);
        return false;
    }
    if (game.state !== GameState.GET_ROLE_INPUTS) {
        console.error("Game is NOT in a state to process role inputs. state: " + game.state);
        return false;
    }
    // Try to get the processing lock
    if (!game.tryGetProcessingLock(GameState.GET_ROLE_INPUTS)) {
        return false;
    }

    let players = game.players;

}

// Returns array of objects: { playerId, socket}
GameServer.getPlayerSockets = function(gameId) {
    let sockets = [];
    let game = GameServer.games[gameId];
    let playerIds = game.getPlayerIds(); 
    for (let playerId of playerIds) {
        let socket = GameServer.playerToSocketMap[playerId];
        sockets.push({
            playerId: playerId,
            socket: socket
        });
    }
    return sockets;
}


module.exports.GameServer = GameServer;