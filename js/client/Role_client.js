function Role() {
    this.imgDir = "assets/roles/";
    this.imgFile = "";
    this.instructions = "";

    this.getImgUrl = function() {
        return this.imgDir + this.imgFile;
    };
    this.displayActionChoices = function(data) {};
    // Roles that have choice: robber, troublemaker, seer
    this.lockInChoice = function(socket) {};
}

Role.prototype.constructor = Role;

var RoleMap = {};

// ============================ WEREWOLF =====================================

var Werewolf = new Role();
Werewolf.imgFile = "werewolf.png";
Werewolf.instructions = "WEREWOLVES, wake up and look for other werewolves. If there is only one Werewolf, you may look at a card from the center.";
Werewolf.displayActionChoices = function(data) {
    // Display component for seeing other werewolves
    console.log("displaying action choices for werewolves");
    let playerIdsArr = data;
    // Remove self from the array
    Util.removeElemFromArr(playerIdsArr, clientId);
    let html = "<span class='display'>";
    if (playerIdsArr.length === 0) {
        html = "...You are the only werewolf";
    }
    for (let werewolfId of playerIdsArr) {
        html += "<input class='display' type='radio' value='" + werewolfId + "' disabled>";
        html += playerIdMap[werewolfId].playerName;
        html += "</input><br>";
        //html += "<img class='player-img' src='/assets/avatars/profile-locked.png'></img>";
    }
    html += "</span>";
    $("#action-choices").html("Showing other werewolves....<br>" + html);
};
RoleMap["werewolf"] = Werewolf;

// ============================ VILLAGER =====================================

var Villager = new Role();
Villager.imgFile = "villager.png";
Villager.instructions = "VILLAGERS, you are fast asleep while others are scheming...";
Villager.displayActionChoices = function(data) {
    console.log("displaying action choices for villagers");
    $("#action-choices").text("...Villager does nothing but sleep");
};
RoleMap["villager"] = Villager;

// ============================ ROBBER =====================================

var Robber = new Role();
Robber.imgFile = "robber.png";
Robber.instructions = "ROBBER, wake up. You may exchange your card with another player's card, and then view your new card.";
Robber.displayActionChoices = function(data) {
    console.log("displaying action choices for robber");
    let html = "<form id='action-form' class='display'>";
    let otherPlayerIds = getOtherPlayerIds();
    for (let otherPlayerId of otherPlayerIds) {
        html += "<input name='robber-choice' type='radio' value='" + otherPlayerId + "'>"
        html += playerIdMap[otherPlayerId].playerName;
        html += "</input><br>";
        // html += "<img class='player-img' src='/assets/avatars/profile-locked.png'></img>";
    }
    html += "</form>"

    $("#action-choices").html("Select a player to switch cards with.<br>" + html);
};
Robber.lockInChoice = function(socket) {
    $("")
    socket.emit("", msg);
};
RoleMap["robber"] = Robber;

// ============================ TROUBLEMAKER =====================================

var Troublemaker = new Role();
Troublemaker.imgFile = "troublemaker.png";
Troublemaker.instructions = "TROUBLEMAKER, wake up. You may exchange cards between two other players.";
Troublemaker.displayActionChoices = function(data) {
    console.log("displaying action choices for troublemaker");
    let html = "<form id='action-form' class='display'>";
    let otherPlayerIds = getOtherPlayerIds();
    let count = 0;
    for (let otherPlayerId of otherPlayerIds) {
        html += "<input name='troublemaker-choice' type='checkbox' value='" + otherPlayerId + "'";
        if (count < 2) {
            html += " checked='checked'>";
            count++;
        } else {
            html += ">";
        }
        html += playerIdMap[otherPlayerId].playerName;
        html += "</input><br>";
        // html += "<img class='player-img' src='/assets/avatars/profile-locked.png'></img>";
    }
    html += "</form>";
    $("#action-choices").html("Select two players that will swap cards. <br>" + html);
};
Troublemaker.lockInChoice = function() {

}
RoleMap["troublemaker"] = Troublemaker;

// ============================ SEER =====================================

var Seer = new Role();
Seer.imgFile = "seer.png";
Seer.instructions = "SEER, wake up. You may look at another player's card or two of the center cards.";
Seer.displayActionChoices = function(data) {
    console.log("displaying action choices for seer");
    let html = "<form id='action-form' class='display'>";
    let otherPlayerIds = getOtherPlayerIds();
    let first = true;
    for (let otherPlayerId of otherPlayerIds) {
        html += "<input name='seer-choice' class='display' type='radio' value='" + otherPlayerId + "'";
        if (first) {
            html += " checked='checked'>";
            first = false;
        } else {
            html += ">";
        }
        html += playerIdMap[otherPlayerId].playerName;
        html += "</input><br>";
        // html += "<img class='player-img' src='/assets/avatars/profile-locked.png'></img>";
    }
    html += "<input name='seer-choice' class='display' type='radio' value='center'>Two Center Cards</input>";
    html += "</form>"
    $("#action-choices").html("Select another player's card to look at. Or select two of the center cards to look at.<br>" + html);
};
Seer.lockInChoice = function(socket) {
    let selVal = $("input[name=seer-choice]:checked", "#action-form").val();
    console.log("selVal: " + selVal);
    let clientMsg = createClientMsg(MsgType.Client.DidRoleAction);
    socket.emit("ask-server", clientMsg);
}
RoleMap["seer"] = Seer;
