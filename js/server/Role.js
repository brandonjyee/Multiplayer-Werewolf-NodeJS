var Util = require('../Util.js').Util;

function Role(name) {
  this.name = name;
  this.action = '';

  this.processRoleAction = function(gameServer, clientMsg) {};

  // Returns whether player has done their role action
  this.roleActionDone = function(player) {
      return !!player.actions.roleAction;
  };
}

Role.prototype.constructor = Role;

// Map of role name to Role obj
Roles = {};

// =========================== WEREWOLF ===========================

var WEREWOLF = new Role('werewolf');
WEREWOLF.action = 'Open your eyes and see who are the other werewolves.';
WEREWOLF.processRoleAction = function(gameServer, clientMsg) {
  // Usually Werewolves don't do anything. Just look at each other.
  // If only one werewolf then can view one center card
  // ** New id for cards, esp for center cards
  let clientId = clientMsg.clientId;
  let gameId = clientMsg.gameId;
  let actionData = clientMsg.actionData;

  let player = gs.players[clientId];

  player.actions.roleAction = actionData;
  console.log('set werewolf data. playerId: ' + clientId + ' actionData: ' + actionData);
};
Roles[WEREWOLF.name] = WEREWOLF;

// =========================== SEER ===========================

var SEER = new Role('seer');
SEER.action = "Look at another player's card or two of the center cards.";
SEER.processRoleAction = function(gameServer, clientMsg) {
  // Selected either another player or two center cards. Should cards have Ids?
  let clientId = clientMsg.clientId;
  let gameId = clientMsg.gameId;
  let roleCard = clientMsg.roleCard;
  let actionData = clientMsg.actionData;

  // *** Check if client packet has valid info
  let game = gs.games[gameId];
  let player = gs.players[clientId];

  // Check validity
  if (actionData === 'center' || game.hasPlayer(actionData)) {
    // It's a valid input
    // Return results to user
    player.actions.roleAction = actionData;
    console.log(
      'set seer data. playerId: ' + clientId + ' actionData: ' + actionData
    );
  } else {
    console.error('Invalid seer data. actionData: ' + actionData);
  }
};
Roles[SEER.name] = SEER;

// ========================== ROBBER ===========================

var ROBBER = new Role('robber');
ROBBER.action =
  "Exchange your card with another player's card. View your new card.";
ROBBER.processRoleAction = function(gameServer, clientMsg) {
  // Selected either another player or two center cards. Should cards have Ids?
  let clientId = clientMsg.clientId;
  let gameId = clientMsg.gameId;
  let roleCard = clientMsg.roleCard;
  let actionData = clientMsg.actionData;

  // *** Check if client packet has valid info
  let game = gs.games[gameId];
  let player = gs.players[clientId];
};
Roles[ROBBER.name] = ROBBER;

// ========================== TROUBLEMAKER ===========================

var TROUBLEMAKER = new Role('troublemaker');
TROUBLEMAKER.action = 'Exchange cards between two other players.';
Roles[TROUBLEMAKER.name] = TROUBLEMAKER;

// =========================== VILLAGER ===========================

var VILLAGER = new Role('villager');
VILLAGER.action = 'You are fast asleep while others are scheming...';
Roles[VILLAGER.name] = VILLAGER;

// ======================= Utility Functions ===========================

Roles.getRandomRole = function() {
  let roleKeys = Object.keys(Role);
  let randIndex = Util.randInt(roleKeys.length - 1);
  return Role[randIndex];
};

Roles.generateRandomDeck = function(numPlayers) {
  /* Should always be 3 more cards than # of players.
        3 players:
        2 werewolves; 1 Seer; 1 Robber; 1 Troublemaker; 1 Villager

        4 players:
        +1 Villager

        5 players:
        +2 Villagers
    */
  let numCards = numPlayers + 3;
  let cards = [];
  cards.push(WEREWOLF, WEREWOLF, SEER, ROBBER, TROUBLEMAKER, VILLAGER);

  if (numPlayers >= 4) {
    cards.push(VILLAGER);
  }
  if (numPlayers >= 5) {
    cards.push(VILLAGER);
  }
  // if (numPlayers > 5) {
  //     numCards -= cards.length;
  //     while (numCards > 0) {
  //         cards.push(Role.getRandomRole());
  //         numCards--;
  //     }
  // }

  Util.shuffle(cards);
  return cards;
};

Roles.getFullDeck = function() {
  let retArr = [];
  // 16 cards total
  // 1 doppelganger
  // TODO
  // 2 werewolves
  retArr.push(WEREWOLF, WEREWOLF);
  // 1 minion
  // TODO
  // 2 masons
  // TODO
  // 1 seer
  retArr.push(SEER);
  // 1 robber
  retArr.push(ROBBER);
  // 1 troublemaker
  retArr.push(TROUBLEMAKER);
  // 1 drunk
  // TODO
  // 1 insomniac
  // TODO
  // 3 villagers
  retArr.push(VILLAGER, VILLAGER, VILLAGER);
  // 1 hunter
  // 1 tanner
};

Object.freeze(Roles);

module.exports.Roles = Roles;
