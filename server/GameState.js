
// function GameState(name, desc) {
//     this.name = name;
//     this.description = desc;
// }

// GameState.prototype.constructor = GameState;

// GameState.initial = new GameState

var GameState = {
    WAIT_TO_START: {
        name: "WAIT_TO_START",
        start_desc: "When game is created, this is its state. Wait on sufficient number of players to enter",
        end_desc: "Triggers when game starts. Needs: sufficient number of players. Transitions to GIVE_ROLES"
    },
    GIVE_ROLES: {
        name: "GIVE_ROLES",
        start_desc: "Triggers when start the game. Transitions from WAIT_TO_START.",
        end_desc: "Triggers when all players have received their role card. Transitions to GET_ROLE_INPUTS"
    },
    GET_ROLE_INPUTS: {
        name: "GET_ROLE_INPUTS",
        start_desc: "Triggers when all players have received their role cards. Transitions from GIVE_ROLES",
        end_desc: "Triggers when all players have seen the results of the actions. Transitions to SHOW_ACTION_RESULT"
    },
    SHOW_ACTION_RESULT: {
        name: "SHOW_ACTION_RESULT",
        start_desc: "Triggers when all players have done their role action (if they have anything to do)",
        end_desc: "Triggers when all players have seen the result of their actions. Transitions to DISCUSSION"
    },
    DISCUSSION: {
        name: "DISCUSSION",
        start_desc: "Triggers when all players have seen the result of their actions. Now they must discuss who to vote to kill",
        end_desc: "Triggers when discussion ends. Transitions to VOTE."
        // ** It's possible the voting and discussion may happen concurrently
    },
    VOTE: {
        name: "VOTE",
        start_desc: "Triggers after players have finished discussing who they want to vote to kill",
        end_desc: "Triggers when voting has completed."
    },
    GAME_RESULT: {
        name: "GAME_RESULT",
        start_desc: "Triggers when the voting has completed. Game will compute who wins and who loses.",
        end_desc: "Triggers when all players have seen the game results. Game is over."
    }
}

Object.freeze(GameState);

module.exports.GameState = GameState;