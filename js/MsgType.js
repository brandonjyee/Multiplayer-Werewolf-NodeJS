var MsgType = {};

// Msgs that client will send to server
MsgType.Client = {
  AskClientId: "client-id",
  AskGameId: "game-id",
  AskStartGame: "start-game",
  DidRoleAction: "did-role-action",
  AskStats: "stats"
};
// Endpoints that client listens on
MsgType.ClientEndpoint = {
  ServerUpdate: "server-update"
};


// Msgs that server will send to client
MsgType.Server = {
  GiveClientId: "client-id",
  GiveGameId: "game-session-id",
  GiveRole: "give-role",
  AnnouncerMsg: "announcer-msg",
  AskDoRoleAction: "do-role-action",
  GiveStats: "stats"
};
// Endpoints that server listens on
MsgType.ServerEndpoint = {
  AskServer: "ask-server"
}

// This js file is shared with both server and client.
// Only export module for server-side code, else it'll result in an error client-side
if (typeof window === 'undefined') {
  module.exports.MsgType = MsgType;
}
