// ====================== Players ======================

var Players = {
  // Map of playerId to Player
  playerIdMap: {},
};

Players.getPlayer = function(playerId) {
  return Players.playerIdMap[playerId];
};

Players.setPlayer = function(player, playerId) {
  Players.playerIdMap[playerId] = player;
};

Players.setPlayersFromServerStats = function(playersInGame) {
  console.log("In Players.setPlayersFromServerStats. playersInGame: " + Util.pp(playersInGame));
  // Check if player is new or already exists
  for (let playerObj of playersInGame) {
    let playerId = playerObj.playerId;
    let player = Players.getPlayer(playerId);
    console.log("retrieved player: " + Util.pp(player));
    if (!player) {
      console.log("setting new player.");
      player = new Player();
      Players.setPlayer(player, playerId);
    }
    // Set data
    // playerName: player.getName(),
    // playerId: player.getId(),
    // avatarUrl: player.avatarUrl
    player.updatePlayerId(playerObj.playerId);
    player.updatePlayerName(playerObj.playerName);
    player.updateAvatarUrl(playerObj.avatarUrl);
    player.print("player after updates: ");
  }
};

// Returns list of players in game
Players.getAllPlayers = function() {
  let retArr = [];
  let playerIds = getAllPlayerIds();
  for (let playerId of playerIds) {
    retArr.push(Players.playerIdMap[playerId]);
  }
  return retArr;
};

Players.getAllPlayerIds = function() {
  let playerIds = Object.keys(Players.playerIdMap);
  return playerIds;
};

Players.getOtherPlayerIds = function(playerId) {
  let mapCopy = Object.assign({}, Players.playerIdMap);
  // console.log("mapCopy: " + Util.pp(mapCopy));
  delete mapCopy[playerId];
  // console.log("mapCopy after delete: " + Util.pp(mapCopy));
  let keys = Object.keys(mapCopy);
  // console.log("mapCopy keys: " + keys);
  return Object.keys(mapCopy);
};

Players.print = function(msg) {
  console.log(msg + 'Printing playerMap: ');
  console.log(Players.toString());
};

Players.toString = function() {
  return Util.pp(Players.playerIdMap);
}

Players.clear = function() {
  Players.playerIdMap = {};
};

// ====================== Player ======================

function Player() {
  this.playerId = '';
  this.name = '';
  this.avatarUrl = '';

  // Specific to a game session
  this.gameId = '';
  this.roleCard = '';
}

Player.prototype.constructor = Player;

Player.prototype.updatePlayerId = function(playerId) {
  this.playerId = playerId;
};

Player.prototype.updatePlayerName = function(name) {
  this.name = name;
};

Player.prototype.updateAvatarUrl = function(avatarUrl) {
  this.avatarUrl = avatarUrl;
};

Player.prototype.updateGameId = function(gameId) {
  this.gameId = gameId;
};

Player.prototype.updateRoleCard = function(roleCard) {
  this.roleCard = roleCard;
};

Player.prototype.print = function(msg) {
  console.log(msg + this.toString());
};

Player.prototype.toString = function() {
  return Util.pp(this);
};

Player.prototype.clear = function() {
  this.playerId = '';
  this.name = '';
  this.avatarUrl = '';
  this.gameId = '';
  this.roleCard = '';
};

// ====================== ThisPlayer ======================
// There's a distinction between the Player obj that represents the client
// and the Player obj that represents other players in the game.
// The Player obj that represents the client has more data and functions

function ThisPlayer() {
  Player.call();
}

ThisPlayer.prototype = Object.create(Player.prototype);
ThisPlayer.prototype.constructor = ThisPlayer;

ThisPlayer.prototype.loadFromSession = function() {
  this.playerId = sessionStorage.getItem('playerId');
  this.name = sessionStorage.getItem("playerName");
  this.gameId = sessionStorage.getItem('gameId');
  this.roleCard = sessionStorage.getItem('roleCard');
};

ThisPlayer.prototype.updatePlayerId = function(playerId) {
  this.playerId = playerId;
  sessionStorage.setItem('playerId', playerId);
};

ThisPlayer.prototype.updatePlayerName = function(name) {
  this.name = name;
  sessionStorage.setItem('playerName', name);
};

ThisPlayer.prototype.updateAvatarUrl = function(avatarUrl) {
  this.avatarUrl = avatarUrl;
  sessionStorage.setItem('avatarUrl', avatarUrl);
};

ThisPlayer.prototype.updateGameId = function(gameId) {
  this.gameId = gameId;
  sessionStorage.setItem('gameId', gameId);
};

ThisPlayer.prototype.updateRoleCard = function(roleCard) {
  this.roleCard = roleCard;
  sessionStorage.setItem('roleCard', roleCard);
};

ThisPlayer.prototype.clear = function() {
  Player.prototype.clear.call(this);
  sessionStorage.clear();
};
