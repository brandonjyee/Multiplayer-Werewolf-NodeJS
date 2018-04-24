
var GameServer = require('./GameServer.js').GameServer;

function Player(name) {
    this.name = name;
}

Player.prototype.setIDs = function(socketId){
    this.id = GameServer.lastPlayerID++;
    this.socketID = socketId;
};

module.exports.Player = Player;