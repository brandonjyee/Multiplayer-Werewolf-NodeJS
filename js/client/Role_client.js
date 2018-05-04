function Role(name) {
    this.name = name;
    this.imgDir = "assets/roles/";
    this.imgFile = "";
    this.instructions = "";

    this.getImgUrl = function() {
        return this.imgDir + this.imgFile;
    };
    this.getImgUrlForCSS = function() {
        return "url(" + this.getImgUrl() + ")";
    };
    this.displayActionChoices = function(data) {};
    // Roles that have choice: robber, troublemaker, seer
    this.lockInChoice = function() {};
}

Role.prototype.constructor = Role;

// Map of role name to Role obj
var RoleMap = {};

// ============================ WEREWOLF =====================================

var Werewolf = new Role("werewolf");
Werewolf.imgFile = "werewolf.png";
Werewolf.instructions = "WEREWOLVES, wake up and look for other werewolves. If there is only one Werewolf, you may look at a card from the center.";
Werewolf.displayActionChoices = function(data) {
    // Display component for seeing other werewolves
    console.log("displaying action choices for werewolves");
    let playerIdsArr = data;
    // Remove self from the array
    Util.removeElemFromArr(playerIdsArr, thisPlayer.playerId);
    let html = "<span class='display'>";
    if (playerIdsArr.length === 0) {
        html = "...You are the only werewolf. You may look at a card from the center.";
    }
    for (let werewolfId of playerIdsArr) {
        html += "<input class='display' type='radio' value='" + werewolfId + "' disabled>";
        html += Players.getPlayer(werewolfId).name;
        html += "</input><br>";
        //html += "<img class='player-img' src='/assets/avatars/profile-locked.png'></img>";
    }
    html += "</span>";
    $("#action-choices").html("Showing other werewolves....<br>" + html);
};
RoleMap[Werewolf.name] = Werewolf;

// ============================ VILLAGER =====================================

var Villager = new Role("villager");
Villager.imgFile = "villager.png";
Villager.instructions = "VILLAGERS, you are fast asleep while others are scheming...";
Villager.displayActionChoices = function(data) {
    console.log("displaying action choices for villagers");
    $("#action-choices").text("...Villager does nothing but sleep. Wait for everyone to finish their actions.");
};
RoleMap[Villager.name] = Villager;

// ============================ ROBBER =====================================

var Robber = new Role("robber");
Robber.imgFile = "robber.png";
Robber.instructions = "ROBBER, wake up. You may exchange your card with another player's card, and then view your new card.";
Robber.displayActionChoices = function(data) {
    console.log("displaying action choices for robber");
    let html = "<form id='action-form' class='display'>";
    let otherPlayerIds = Players.getOtherPlayerIds(thisPlayer.playerId);
    let first = true;
    for (let otherPlayerId of otherPlayerIds) {
        html += "<input name='robber-choice' type='radio' value='" + otherPlayerId + "'";
        if (first) {
            html += " checked='checked'>";
            first = false;
        } else {
            html += ">";
        }
        html += Players.getPlayer(otherPlayerId).name;
        html += "</input><br>";
        // html += "<img class='player-img' src='/assets/avatars/profile-locked.png'></img>";
    }
    html += "</form>"

    $("#action-choices").html("Select a player to switch cards with.<br>" + html);

    // Enable the button
    $("#do-game-action").show();
};
Robber.lockInChoice = function() {
    let selPlayerId = $("input[name=robber-choice]:checked", "#action-form").val();
    console.log("selVal: " + selPlayerId);
    let clientMsg = createClientMsg(MsgType.Client.DidRoleAction);
    clientMsg.action = selPlayerId;
    sendToServer(clientMsg);
};
RoleMap[Robber.name] = Robber;

// ============================ TROUBLEMAKER =====================================

var Troublemaker = new Role("troublemaker");
Troublemaker.imgFile = "troublemaker.png";
Troublemaker.instructions = "TROUBLEMAKER, wake up. You may exchange cards between two other players.";
Troublemaker.displayActionChoices = function(data) {
    console.log("displaying action choices for troublemaker");
    let html = "<form id='troublemaker-action-form' class='display'>";
    let otherPlayerIds = Players.getOtherPlayerIds(thisPlayer.playerId);
    let count = 0;
    for (let otherPlayerId of otherPlayerIds) {
        html += "<input name='troublemaker-choice' type='checkbox' value='" + otherPlayerId + "'";
        if (count < 2) {
            html += " checked='checked'>";
            count++;
        } else {
            html += ">";
        }
        html += Players.getPlayer(otherPlayerId).name;
        html += "</input><br>";
        // html += "<img class='player-img' src='/assets/avatars/profile-locked.png'></img>";
    }
    html += "</form>";
    $("#action-choices").html("Select two players that will swap cards. <br>" + html);

    // Limit selection to only 2
    let selLimit = 2;
    $("#troublemaker-action-form input").on("change", function(event) {
        if ($(this).siblings(":checked").length >= selLimit) {
            this.checked = false;
        }
    })

    // Enable the button
    $("#do-game-action").show();
};
Troublemaker.lockInChoice = function() {
    let selected = [];
    $("#troublemaker-action-form input:checked").each(function() {
        selected.push($(this).attr("value"));
    });
    let selPlayerIds = $("#troublemaker-action-form input[name=seer-choice]:checked").val();
    // let selPlayerIds = $("input[name=seer-choice]:checked"), "#action-form").val();
    console.log("selVal: " + Util.pp(selPlayerIds));
    let clientMsg = createClientMsg(MsgType.Client.DidRoleAction);
    clientMsg.action = selPlayerIds;
    sendToServer(clientMsg);
}
RoleMap[Troublemaker.name] = Troublemaker;

// ============================ SEER =====================================

var Seer = new Role("seer");
Seer.imgFile = "seer.png";
Seer.instructions = "SEER, wake up. You may look at another player's card or two of the center cards.";
Seer.displayActionChoices = function(data) {
    console.log("displaying action choices for seer");
    let html = "<form id='action-form' class='display'>";
    let otherPlayerIds = Players.getOtherPlayerIds(thisPlayer.playerId);
    let first = true;
    for (let otherPlayerId of otherPlayerIds) {
        html += "<input name='seer-choice' class='display' type='radio' value='" + otherPlayerId + "'";
        if (first) {
            html += " checked='checked'>";
            first = false;
        } else {
            html += ">";
        }
        html += Players.getPlayer(otherPlayerId).name;
        html += "</input><br>";
        // html += "<img class='player-img' src='/assets/avatars/profile-locked.png'></img>";
    }
    html += "<input name='seer-choice' class='display' type='radio' value='center'>Two Center Cards</input>";
    html += "</form>"
    $("#action-choices").html("Select another player's card to look at. Or select two of the center cards to look at.<br>" + html);

    // Enable the button
    $("#do-game-action").show();
};
Seer.lockInChoice = function(socket) {
    let selPlayerId = $("input[name=seer-choice]:checked", "#action-form").val();
    console.log("selVal: " + selPlayerId);
    let clientMsg = createClientMsg(MsgType.Client.DidRoleAction);
    clientMsg.action = selPlayerId;
    sendToServer(clientMsg);
}
RoleMap[Seer.name] = Seer;
