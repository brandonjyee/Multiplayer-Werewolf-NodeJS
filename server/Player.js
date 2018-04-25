
var GameServer = require('./GameServer.js').GameServer;

function Player(name) {
    this.id = "";
    this.name = name;
    this.gameSession = {};
    this.roleCard = {};
}

Player.prototype.constructor = Player;

/*
Player.prototype.setIDs = function(socketId){
    this.id = GameServer.lastPlayerID++;
    this.socketID = socketId;
};
*/

module.exports.Player = Player;