// var Client = {

// };
// Client.socket = io.connect();


// Check if client support Web Storage. Need it to store data
if (typeof(Storage) === "undefined") {
    console.log("Error: No Web Storage support!");
}
// Create web socket connection
let socket = io();

// Check existing session storage for data.
let thisPlayer = new ThisPlayer();
thisPlayer.loadFromSession();
// Players.setPlayer(thisPlayer);

// Map of playerId to an obj containing info related to player:
// profile-pic, player number, etc
// var playerIdMap = {};

// playerIdMap["test-id"] = {
//     playerName: "testName",
//     playerId: "test-id"
// };
// playerIdMap["test-id2"] = {
//     playerName: "testName2",
//     playerId: "test-id2"
// };
// Seer.displayActionChoices();
// Seer.lockInChoice();


// Populate text box(es) with random data
$("#client-name").val(faker.name.findName());

socket.on('numbers-update', function(randNum) {
    $('#displaynum').text(randNum);
});

socket.on(MsgType.ClientEndpoint.ServerUpdate, function(serverMsg) {
    processServerUpdate(serverMsg);
});

function processServerUpdate(serverMsg) {

    // Log the msg to the server message box so we can see it
    updateServerMsgBox(serverMsg);

    let type = serverMsg.type;
    // console.log("Received server-update. " + pp(serverMsg));
    if (type === MsgType.Server.GiveClientId) {
        processUpdateClientId(serverMsg);
    } else if (type === MsgType.Server.GiveGameId) {
        processUpdateGameId(serverMsg);
    } else if (type === "game-started") {
        // processGameStarted(serverMsg);
        // TODO. Countdown to start. Switch daylight bg to night
    } else if (type === MsgType.Server.GiveRole) {
        processUpdateRole(serverMsg);
    } else if (type === MsgType.Server.AnnouncerMsg) {
        processAnnouncerMsg(serverMsg);
    } else if (type === MsgType.Server.AskDoRoleAction) {
        processDoRoleAction(serverMsg);
    } else if (type === "error-msg") {
        processErrorMsg(serverMsg);
    }
    else if (type === MsgType.Server.GiveStats) {
        processGameStats(serverMsg);
    }
    else {
        console.log("Unknown server update type: " + type);
    }
}

function processUpdateClientId(serverMsg) {
    let playerId = serverMsg.data;
    thisPlayer.updatePlayerId(playerId);
    Players.setPlayer(thisPlayer, playerId);
    // Display it
    $(".client-id").text(playerId);
}

function processUpdateGameId(serverMsg) {
    let gameId = serverMsg.data;
    console.log("received game session id from server: " + gameId);
    thisPlayer.updateGameId(gameId);
    $(".game-session-id").text(gameId);
}

function processUpdateRole(serverMsg) {
    let roleCard = serverMsg.data;
    thisPlayer.updateRoleCard(roleCard);
    $(".role-card").text(roleCard);
    // Update role card bg
    console.log("roleCard: " + roleCard);
    let imgUrl = RoleMap[roleCard].getImgUrlForCSS();
    $("img.role-card-img").css("content", imgUrl);

    // Also change daylight bg to night bg. This should be changed later.
    $("#game-header .bg").css("content", "url(assets/night-1.png)");
}

function processAnnouncerMsg(serverMsg) {
    let newMsg = serverMsg.data;
    $(".announcer-msgs").prepend(newMsg);
}

function processDoRoleAction(serverMsg) {
    let roleStr = serverMsg.role;
    let role = RoleMap[roleStr];
    let data = serverMsg.data;

    $(".role-instructions").text(role.instructions);
    $(".role-data").text(data);

    Players.print();
    console.log("Displaying action choices for role: " + roleStr);
    role.displayActionChoices(data);
}

function processErrorMsg(serverMsg) {
    let msg = serverMsg.data;
    // TODO
}

function processGameStats(serverMsg) {
    let stats = serverMsg.data;
    let playerName = stats["playerName"];
    let playerId = stats["clientId"];
    let avatarUrl = stats["avatarUrl"];
    let gameId = stats["gameId"];

    let numPlayers = stats["numPlayers"];
    let gameState = stats["gameState"];
    let roleCard = stats["roleCard"];
    let allCards = stats["allCards"];
    let playersInGame = stats["playersInGame"];

    if (playerId) {
        Players.setPlayer(thisPlayer, playerId);
        $(".client-id").text(playerId);
    }
    if (avatarUrl && avatarUrl !== thisPlayer.avatarUrl) {
        thisPlayer.updateAvatarUrl(avatarUrl);
        $(".player-pic").css("content", "url(" + avatarUrl + ")");
    }
    if (gameId) { $(".game-session-id").text(gameId); }
    if (numPlayers) { $(".num-players-in-game").text(numPlayers); }
    if (gameState) { $(".game-state").text(gameState); }
    if (roleCard) { $(".role-card").text(roleCard); }
    if (allCards) { $(".all-cards").text(allCards.join("|")); }
    if (playersInGame) {
        Players.setPlayersFromServerStats(playersInGame);
    }
}

function updateServerMsgBox(anyVal) {
    if (anyVal) {
        $(".server-msgs").prepend(Util.getTimestamp() + " Received: " + Util.pp(anyVal) + "\n");
    }
}

$("#clear-local-data").click( function() {
    Players.clear();
    thisPlayer.clear();
});

$("#connect-to-server").click( function() {
    console.log("connect to server button clicked.");
    let clientMsg = createClientMsg(MsgType.Client.AskClientId);
    clientMsg.playerName = $("#client-name").val();
    sendToServer(clientMsg);
});

$("#join-game").click( function() {
    let clientMsg = createClientMsg(MsgType.Client.AskGameId);
    console.log("msg for game-id: " + Util.pp(clientMsg));
    sendToServer(clientMsg);
});

$("#start-game").click( function() {
    let clientMsg = createClientMsg(MsgType.Client.AskStartGame);
    sendToServer(clientMsg);
});

$("#do-game-action").click( function() {
    // let playerObj = //playerIdMap[clientId];
    let role = RoleMap[thisPlayer.roleCard]; //playerObj[];
    role.lockInChoice();

    // After clicking the button, disable it
    //$("#do-game-action").prop("disabled", true);
});

// Create the client msg to send to server
function createClientMsg(request) {
    // If clientId isn't in the cache, check session storage
    let playerId = thisPlayer.playerId;
    let gameId = thisPlayer.gameId;

    if (!playerId) {
        playerId = sessionStorage.getItem("clientId");
    }
    if (!gameId) {
        gameId = sessionStorage.getItem("gameId");
    }

    let msg = {
        clientId: playerId,
        gameSessionId: gameId,
        request: request
    };

    if (thisPlayer) {
        msg.avatarUrl = thisPlayer.avatarUrl;
        msg.roleCard = thisPlayer.roleCard;
    }
    console.log("In createClientMsg. clientId " + playerId + " thisPlayer: "+ thisPlayer.toString() + " clientMsg: " + Util.pp(msg));
    return msg;
}

function sendToServer(clientMsg) {
    socket.emit(MsgType.ServerEndpoint.AskServer, clientMsg);
}
