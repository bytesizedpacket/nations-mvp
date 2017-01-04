// Work in progress replacement client script

// init socket.io
var socket = io();

// start game loop
createjs.Ticker.on("tick", tick);
createjs.Ticker.setFPS(60);

// Useful prototypes/helper functions
// -- {

// Same as .replace(), except covers all occurrences
String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

// Returns a value needed to change something X units per second, independently of frame rate.
function unitsPerSecond(event, px){
    return event.delta/1000*px;
}

// -- }

// Init global variables
// Undefined at game start
var stage;
// game state booleans
var loggedIn = false;
var gameActive = false;
// HTML elements
var loginField = document.getElementById("loginField");
var usernameInput = document.getElementById("usernameInput");
var deniedReason = document.getElementById("deniedReason");
// Local player
var localPlayerObj = {name: "", id: "", x: 0, y: 0};

// Listen for 'enter' key to login
addEventListener("keydown", handleInputDown);
function handleInputDown(event){
    switch(event.keyCode){
        case 13:
            if(!gameActive && document.activeElement == usernameInput){
                attemptLogin();
            }
            break;
    }
}

// Attempts to log in with the given information
function attemptLogin(){
    socket.emit('loginAttempt', usernameInput.value);
}

// Successful login, set player object & start init
socket.on('loginAccepted', function(playerObj){
    loggedIn = true;
    localPlayerObj = playerObj;
    gameInit();
});

// Unsuccessful login, displays reason from server
socket.on('loginDenied', function(reason){
    loginField.value = "";
    deniedReason = reason;
});

// Initialize game before loop starts.
function gameInit(){
    // TODO: game/var init

    // TODO: webpage/UI init
    stage = new createjs.Stage("game");

    // Create local player
    // TODO: render player
    // Create player nameplate
    // TODO: render local player nameplate

    // Server forcibly updates the player's info
    // Player object
    socket.on('forceUpdatePlayer', function(playerObj){
        // TODO: forcibly update player
    });

    // Server provides an array of players for the client to render
    // NOTE: THIS WILL NOT INCLUDE THE CURRENT PLAYER
    // Array of player objects
    socket.on('updateAllPlayers', function(playerArray){
        // TODO: Update all players
    });

    // Displays a message about player disconnect, and performs any necessary UI updates.
    // Sprite rendering/removal is handled elsewhere.
    // Player object
    socket.on('playerDisconnect', function(otherPlayerObj){
        // TODO: Player disconnect
    });

    // Player receives a boop from somebody else
    // Player object
    socket.on('boop', function(otherPlayerObj){
        // TODO: boops
    });

}

// Game loop, repeats every frame
function tick(event){
    if(!gameActive){
        // pre-init behavior
    }else{
        // gameplay behavior
        // TODO: main game loop
        // TODO: input handling (per-frame checks)
    }
}