function GameSession() {
    this.id = "";
    // Map of players
    this.players = {};
    this.maxPlayers = 3;
}

GameSession.prototype.constructor = GameSession;

GameSession.prototype.getNumPlayers = function() {
    return Object.keys(this.players).length;
}

GameSession.prototype.hasPlayer = function(player) {
    return !!this.players[player.id];
}

module.exports.GameSession = GameSession;