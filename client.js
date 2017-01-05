// Work in progress replacement client script

// init socket.io
var socket = io();

// start game loop
createjs.Ticker.on("tick", tick);
createjs.Ticker.setFPS(60);

// Init global variables
// Undefined at game start
var stage;
// game state booleans
var loggedIn = false; // Is the player successfully logged in?
var gameActive = false; // Is the game running?
var movementLocked = false; // Is the player allowed to move?
// HTML elements
var loginField = document.getElementById("loginField"); // div tag containing all login elements
var usernameInput = document.getElementById("usernameInput"); // input box for username
var deniedReason = document.getElementById("deniedReason"); // div tag that displays reason for denied username
var chatbox = document.getElementById("chatbox"); // Textbox for chat messages
var chatlog = document.getElementById('chatlog'); // Div which contains chatlog
// UI
var chatQueue = []; // queue of messages to display in chat, capped at 10 length
// Local player
var localPlayerObj = {name: "", id: "", x: 0, y: 0}; // blank player object
// Input
var keys = []; // for input handling

// Useful prototypes/helper functions
// -- << -- << -- << -- << -- << -- << -- << -- << -- << -- << -- << -- <<

// Same as .replace(), except covers all occurrences
String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

// Returns a value needed to change something X units per second, independently of frame rate.
function unitsPerSecond(event, units) {
    return event.delta / 1000 * units;
}

// Updates the displayed chatlog with current contents of chatQueue array
function updateChatDisplay() {
    // TODO: update chat display func
}

// -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >>

// Keypress listeners
addEventListener("keydown", handleInputDown);
addEventListener("keyup", handleInputUp);

// any key is pressed
function handleInputDown(event) {
    keys[event.keyCode] = true; // True while key is held
    switch (event.keyCode) {
        case 13: // Enter
            if (!gameActive && document.activeElement == usernameInput) { // submit login info
                attemptLogin();
            }
            break;
    }
}

// any key is released
function handleInputUp(event) {
    keys[event.keyCode] = false; // False when key is released
}

// Attempt to log in with the given information
function attemptLogin() {
    localPlayerObj.name = usernameInput.value;
    socket.emit('loginAttempt', localPlayerObj);
}

// Successful login, set player object & start init
socket.on('loginAccepted', function (playerObj) {
    loggedIn = true;
    localPlayerObj = playerObj;
    loginField.innerHTML = "";
    gameInit();
});

// Unsuccessful login, displays reason from server
socket.on('loginDenied', function (reason) {
    console.log("Login denied with reason: " + reason);
    loginField.value = "";
    deniedReason.innerHTML = reason;
});

// Initialize game before loop starts.
function gameInit() {
    // Set any variables needed during gameplay
    // TODO: finish game/var init

    // Create startup UI
    // TODO: DPI-Aware, touch friendly
    stage = new createjs.Stage("game");
    chatbox.style.visibility = "visible";
    loginField.innerHTML = "";

    // Create local player
    // TODO: create player
    // Create player nameplate
    // TODO: create local player nameplate

    // Socket listeners
    // -- << -- << -- << -- << -- << -- << -- << -- << -- << -- << -- << -- <<

    // Server forcibly updates the player's info
    // Player object
    socket.on('forceUpdatePlayer', function (playerObj) {
        // TODO: forcibly update player
    });

    // Server provides an array of players for the client to render
    // NOTE: THIS WILL NOT INCLUDE THE CURRENT PLAYER
    // Array of player objects
    socket.on('updateAllPlayers', function (playerArray) {
        // TODO: Update all players
        // DESTROY ALL CURRENT OBJECTS AND START AGAIN FROM SCRATCG
        // FUCK EFFICIENCY
    });

    // Server reports new chat messages since last update
    // Array of strings
    socket.on('updateChat', function (msgArray) {
        // TODO: implement chat (handle queue clientside!)
    });

    // Performs any necessary game/UI  updates as a result of a player disconnecting. Server will only report nearby players
    // Object rendering/removal is handled in the render function, not here.
    // Player object
    socket.on('playerDisconnect', function (otherPlayerObj) {
        // TODO: Player disconnect (add to chat queue!)
    });

    // Player receives a boop from somebody else
    // Player object
    socket.on('boop', function (otherPlayerObj) {
        // TODO: receive boop indicators
    });

    // -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >>

    gameActive = true;

}

// Game loop, repeats every frame
function tick(event) {
    if (!gameActive) { // pre-init behavior

    } else { // gameplay behavior

        // TODO: finish main game loop

        // per-frame local variables
        var movementDirection = [0, 0];

        // movement handling
        if (!movementLocked) {
            if (key[65]) {
                movementDirection[0] -= 1;
            }
            if (key[68]) {
                movementDirection[0] += 1;
            }
            if (key[83]) {
                movementDirection[1] -= 1;
            }
            if (key[87]) {
                movementDirection[1] += 1;
            }
        }

        // character animation
        // TODO: animate local player
        nonexistentPlayerVariable.x += unitsPerSecond(event, (movementDirection[0] * 20)); // fix these pls
        nonexistentPlayerVariable.y += unitsPerSecond(event, (movementDirection[1] * 20));

        // Animate boop indicators
        // TODO: Animate boop indicators

    }
}