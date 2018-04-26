var Player = require('./Player.js').Player;
var GameSession = require('./GameSession.js').GameSession;
var GameState = require('./GameState.js').GameState;
var Util = require('../Util.js').Util;


var GameServer = {
    lastPlayerID: 0,
    // Map of socket id's to the player id's of the associated players. **Duno why have this
    socketToPlayerMap: {},
    // Map of playerId to socket obj
    playerToSocketMap: {},
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
    GameServer.socketToPlayerMap[socketID] = playerID;
};

GameServer.getPlayerID = function(socketID) {
    return GameServer.socketToPlayerMap[socketID];
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
        if (gameSession.getNumPlayers() < gameSession.maxPlayers) {
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
        gameId = GameServer.uuidv4();
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
    game.state = GameState.GIVE_ROLES;
    // Now that we've set the number of players, create the deck of role cards
    game.cards = generateRandomDeck();
    console.log("Created card deck for game. gameId: " + gameId + " deck: " + Util.pp(game.cards));
    // Need to send msg to client
    return true;
}

GameServer.giveRoleCards = function(gameId) {
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

    // Get the deck of role cards
    let players = game.players;
    let cards = game.cards; // Cards should already be shuffled

    // Return a list of pairings: { playerId1: card, playerId2: card, ... }
    let pairings = [];
    for (let i = 0; i < players.length; i++) {
        let player = players[i];
        let card = cards[i];
        player.roleCard = card;
        pairings.push({ 
            playerId: player.id,
            card: card
        });
    }
    // After assigning player cards, assign the remaining cards to the center
    for (let i = players.length; i < cards.length; i++) {
        game.centerCards.push(cards[i]);
    }
    return pairings;
}

function generateRandomDeck(numPlayers) {
    /* Should always be 3 more cards than # of players.
        3 players: 
        2 werewolves; 1 Seer or 1 Robber; 1 Troublemaker; 1 Villager

        4 players:
        +1 Villager

        5 players:
        +2 Villagers
    */
    let cards = [];
    cards.push("werewolf", "werewolf", "troublemaker", "villager");
    if (Math.random() <= .5) {
        cards.push("seer");
    } else {
        cards.push("robber");
    }

    if (numPlayers === 4) {
        cards.push("villager");
    } else if (numPlayers === 5) {
        cards.push("villager");
        cards.push("villager");
    }

    shuffleCards(cards);
    return cards;
}

function shuffleCards(cardsArr) {
    // Shuffle the cards by doing a lot of swaps
    let numSwaps = cardsArr.length * 3;
    for (let i = 0; i < numSwaps; i++) {
        let index1 = Util.randInt(cardsArr.length - 1);
        let index2 = Util.randInt(cardsArr.length - 1);
        let temp = cardsArr[index1];
        cardsArr[index1] = cardsArr[index2];
        cardsArr[index2] = temp;
    }
}

module.exports.GameServer = GameServer;