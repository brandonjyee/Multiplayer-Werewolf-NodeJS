var GameState = require("./GameState.js").GameState;

function GameSession(id) {
    this.id = id;
    // Map of playerIds to players
    this.players = {};
    this.minPlayers = 3;
    this.maxPlayers = 10;
    this.state = GameState.WAIT_TO_START;
    // Map of 
    this.cards = [];
    this.centerCards = [];
}

GameSession.prototype.constructor = GameSession;

GameSession.prototype.getNumPlayers = function() {
    return Object.keys(this.players).length;
}

GameSession.prototype.hasPlayer = function(player) {
    return !!this.players[player.id];
}

GameSession.prototype.getPlayerIds = function() {
    return Object.keys(this.players);
}

GameSession.generateDeck = function(numPlayers, includeCardsArr, excludeCardsArr) {
    // TODO
}

module.exports.GameSession = GameSession;