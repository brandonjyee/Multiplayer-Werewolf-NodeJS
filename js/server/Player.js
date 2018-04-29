
var GameServer = require('./GameServer.js').GameServer;

function Player(name) {
    this.id = "";
    this.name = name;
    this.gameSession = null;
    this.roleCard = null;
    this.actions = null;
}

Player.prototype.constructor = Player;

/*
Player.prototype.setIDs = function(socketId){
    this.id = GameServer.lastPlayerID++;
    this.socketID = socketId;
};
*/

Player.prototype.getCardAsStr = function() {
    if (!!this.roleCard) {
        return this.roleCard.name;
    }
    return "";
}

Player.prototype.getId = function() {
    return this.id;
}

Player.prototype.getName = function() {
    return this.name;
}

module.exports.Player = Player;