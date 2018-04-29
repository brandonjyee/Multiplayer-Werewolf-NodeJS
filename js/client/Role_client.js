function Role() {
    this.imgDir = "assets/roles/";
    this.imgFile = "";
    this.instructions = "";

    this.getImgUrl = function() {
        return this.imgDir + this.imgFile;
    };
    this.doRoleAction = function() {};
}

Role.prototype.constructor = Role;

var RoleMap = {};

var Werewolf = new Role();
Werewolf.imgFile = "werewolf.png";
Werewolf.instructions = "WEREWOLVES, wake up and look for other werewolves. If there is only one Werewolf, you may look at a card from the center.";
Werewolf.doRoleAction = function() {
    // Display component for seeing other werewolves
};
RoleMap["werewolf"] = Werewolf;

var Villager = new Role();
Villager.imgFile = "villager.png";
Villager.instructions = "VILLAGERS, you are fast asleep while others are scheming...";
RoleMap["villager"] = Villager;

var Robber = new Role();
Robber.imgFile = "robber.png";
Robber.instructions = "ROBBER, wake up. You may exchange your card with another player's card, and then view your new card.";
RoleMap["robber"] = Robber;

var Troublemaker = new Role();
Troublemaker.imgFile = "troublemaker.png";
Troublemaker.instructions = "TROUBLEMAKER, wake up. You may exchange cards between two other players.";
RoleMap["troublemaker"] = Troublemaker;

var Seer = new Role();
Seer.imgFile = "seer.png";
Seer.instructions = "SEER, wake up. You may look at another player's card or two of the center cards.";
RoleMap["seer"] = Seer;