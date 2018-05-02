var GameState = require("./GameState.js").GameState;

function GameSession(id) {
    this.id = id;
    // Map of playerIds to players
    this.players = {};
    this.minPlayers = 3;
    this.maxPlayers = 5; // Don't know what deck to make past 5 players
    this.state = GameState.WAIT_TO_START;
    // For functions to coordinate processing. Ensure a game state isn't processed multiple times
    this.processingStateLock = {};
    this.cards = [];
    this.centerCards = [];

    //
    // this.gameActions = {};
        /* {

        }*/
}

GameSession.prototype.constructor = GameSession;

GameSession.prototype.getNumPlayers = function() {
    return Object.keys(this.players).length;
}

// Just get name and id
GameSession.prototype.getPlayerData_Basic = function() {
    let retArr = [];
    let players = this.getPlayers();
    for (let player of players) {
        retArr.push({
            playerName: player.getName(),
            playerId: player.getId()
        });
    }
    return retArr;
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

GameSession.prototype.getPlayers = function() {
    let retArr = [];
    let playerIds = this.getPlayerIds();
    for (let playerId of playerIds) {
        retArr.push(this.players[playerId]);
    }
    return retArr;
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

GameSession.getRoleActions = function() {
    let actionsArr = [];
    for (let player of this.players) {
        actionsArr.push(player.actions);
    }
    return actionsArr;
}

GameSession.roleActionsDone = function() {
    // Check if all players in the game have done their role action
    for (let player of this.players) {
        let done = player.roleActionDone();
        if (!done) {
            return false;
        }
    }
    return true;
}

// GameSession.generateDeck = function(numPlayers, includeCardsArr, excludeCardsArr) {
//     // TODO
// }

module.exports.GameSession = GameSession;
