var GameState = require("./GameState.js").GameState;

function GameSession(id) {
    this.id = id;
    // Map of playerIds to players
    this.players = {};
    this.minPlayers = 3;
    this.maxPlayers = 10;
    this.state = GameState.WAIT_TO_START;
    // For functions to coordinate processing. Ensure a game state isn't processed multiple times
    this.processingStateLock = {};
    this.cards = [];
    this.centerCards = [];
}

GameSession.prototype.constructor = GameSession;

GameSession.prototype.getNumPlayers = function() {
    return Object.keys(this.players).length;
}

// Accepts either a player or a playerId
GameSession.prototype.hasPlayer = function(player) {
    let playerId = player;
    if (typeof player === "object") {
        playerId = player.id;
    }
    return !!this.players[playerId];
}

GameSession.prototype.getPlayerIds = function() {
    return Object.keys(this.players);
}

GameSession.prototype.tryGetProcessingLock = function(state) {
    // See if the lock is already taken
    if (this.processingStateLock["state"] === state
        && this.processingStateLock["locked"] === true) {
        return false;
    }
    this.processingStateLock = { 
        state: state,
        locked: true
    };
    return true;
}

// Passes in the player and an incrementing index (starting from 0) to fn
GameSession.prototype.forEachPlayer = function(fn) {
    let playerIds = this.getPlayerIds();
    for (let i = 0; i < playerIds.length; i++) {
        let playerId = playerIds[i];
        let player = this.players[playerId];
        fn(player, i);
    }
}

// Return list of playerIds with specified role
GameSession.prototype.getPlayersWithRole = function(role) {
    let retArr = [];
    this.forEachPlayer( function(player) {
        if (player.roleCard === role) {
            retArr.push(player.id);
        }
    });
    return retArr;
}

GameSession.prototype.getCardsAsStrArr = function() {
    let retArr = [];
    for (let card of this.cards) {
        retArr.push(card.name);
    }
    return retArr;
}

// Makes shallow copy of the cards associated with this game
GameSession.prototype.getCopyOfCards = function() {
    let copyArr = [];
    for (let card of this.cards) {
        copyArr.push(card);
    }
    return copyArr;
}

// GameSession.generateDeck = function(numPlayers, includeCardsArr, excludeCardsArr) {
//     // TODO
// }

module.exports.GameSession = GameSession;