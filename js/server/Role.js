var Util = require('../Util.js').Util;

var Role = {};

Role.WEREWOLF = {
    name: "werewolf",
    action: "Open your eyes and see who are the other werewolves."
};

Role.SEER = {
    name: "seer",
    action: "Look at another player's card or two of the center cards."
};

Role.ROBBER = {
    name: "robber",
    action: "Exchange your card with another player's card. View your new card."
};

Role.TROUBLEMAKER = {
    name: "troublemaker",
    action: "Exchange cards between two other players."
};

Role.VILLAGER = {
    name: "villager",
    action: "You are fast asleep while others are scheming..."
};

Role.getRandomRole = function() {
    let roleKeys = Object.keys(Role);
    let randIndex = Util.randInt(roleKeys.length - 1);
    return Role[randIndex];
}

Role.generateRandomDeck = function(numPlayers) {
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
    cards.push(Role.WEREWOLF, Role.WEREWOLF, Role.SEER, Role.ROBBER, Role.TROUBLEMAKER, Role.VILLAGER);

    if (numPlayers >= 4) {
        cards.push(Role.VILLAGER);
    } 
    if (numPlayers >= 5) {
        cards.push(Role.VILLAGER);
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
}

Role.getFullDeck = function() {
    let retArr = [];
    // 16 cards total
    // 1 doppelganger
    // TODO
    // 2 werewolves
    retArr.push(Role.WEREWOLF, Role.WEREWOLF);
    // 1 minion
    // TODO
    // 2 masons
    // TODO
    // 1 seer
    retArr.push(Role.SEER);
    // 1 robber
    retArr.push(Role.ROBBER);
    // 1 troublemaker
    retArr.push(Role.TROUBLEMAKER);
    // 1 drunk
    // TODO
    // 1 insomniac
    // TODO
    // 3 villagers
    retArr.push(Role.VILLAGER, Role.VILLAGER, Role.VILLAGER);
    // 1 hunter
    // 1 tanner
}


Object.freeze(Role);

module.exports.Role = Role;