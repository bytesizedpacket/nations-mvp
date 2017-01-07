// Work in progress replacement client script

// identifier variables
var clientVersion = "0.0.2"; // makes sure client and server are compatible versions
var serverPollRate = "2"; // frames per movement update

// init socket.io
var socket = io.connect(window.location.host);

// start game loop, shut up webstorm's bitching
//noinspection JSUnresolvedVariable,JSUnresolvedFunction
createjs.Ticker.on("tick", tick);
//noinspection JSUnresolvedVariable,JSUnresolvedFunction
createjs.Ticker.setFPS(60);

// Init global variables
// Undefined at game start
var stage, localPlayerBitmap, localPlayerNameplate;
// game state booleans
var loggedIn = false; // Is the player successfully logged in?
var gameActive = false; // Is the game running?
var movementLocked = false; // Is the player allowed to move?
var movementSpeed = 100; // player movement speed
var currentPollValue = 0; // keep track of poll rate
var sendMovementPolls = false; // will the game submit movement updates?
// HTML elements
var loginField = document.getElementById("loginField"); // div tag containing all login elements
var usernameInput = document.getElementById("usernameInput"); // input box for username
usernameInput.focus(); // focus the username box
var deniedReason = document.getElementById("deniedReason"); // div tag that displays reason for denied username
var gameCanvas = document.getElementById("game"); // game canvas element
var chatbox = document.getElementById("chatbox"); // Textbox for chat messages
var chatlog = document.getElementById('chatlog'); // Div which contains chatlog
var debugInfo = document.getElementById('debugInfo'); // debug info shown to the player
// UI
var chatQueue = []; // queue of messages to display in chat, capped at 10 length
var boops = [];
// Local player
var localPlayerObj = {name: "", id: "", x: 10, y: 50, version: clientVersion}; // blank player object
// Other Players
var otherPlayers = [];
var otherPlayersNameplates = [];
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
    chatlog.innerHTML = "";
    for(var msg in chatQueue){
        chatlog.innerHTML += chatQueue[msg] + "<br/>";
    }
}

// Send updated player object to the server
function sendPlayerObjToServer(playerObject){
    socket.emit('updatePlayer', playerObject);
}

function addToChatQueue(msg){
    chatQueue.unshift(msg);
    if(chatQueue.length > 10) chatQueue.length = 10;
    updateChatDisplay();
}

// Sends boop to other player
function sendBoop(event) {
    socket.emit('boop', event.target.name);
    var newBoop = new createjs.Bitmap("boop.png");
    newBoop.scaleX = 0.3;
    newBoop.scaleY = 0.3;
    stage.addChild(newBoop);
    newBoop.x = event.target.x;
    newBoop.y = event.target.y;
    boops.push(newBoop);
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
            }else{
                if(document.activeElement != chatbox){ // chatbox is not focused
                    chatbox.focus();
                }else{ // chatbox is focused
                    if (chatbox.value.replaceAll(" ","") != "") socket.emit('chatMessage', chatbox.value); // send chat message
                    chatbox.value = "";
                    chatbox.blur(); // remove focus from chatbox
                }
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
    localPlayerBitmap = new createjs.Bitmap("dog.png");
    stage.addChild(localPlayerBitmap);
    // Create player nameplate
    localPlayerNameplate = new createjs.Text(localPlayerObj.name, "11px Arial", "#000000");
    stage.addChild(localPlayerNameplate);

    // Socket listeners
    // -- << -- << -- << -- << -- << -- << -- << -- << -- << -- << -- << -- <<

    socket.on('disconnect', function(){
        gameActive = false;
        debugInfo.innerHTML = "SERVER DISCONNECTED";
    });

    // Server forcibly updates the player's info
    // Player object
    socket.on('forceUpdatePlayer', function (playerObj) {
        localPlayerObj = playerObj;
    });

    // Server provides an array of players for the client to render
    // NOTE: THIS WILL  INCLUDE THE CURRENT PLAYER
    // Array of player objects
    socket.on('updateAllPlayers', function (playerArray) {
        // DESTROY ALL CURRENT OBJECTS AND START AGAIN FROM SCRATCH
        // FUCK EFFICIENCY
        if(gameActive) {
            stage.removeAllChildren();
            stage.removeAllEventListeners;
            stage.addChild(localPlayerBitmap);
            stage.addChild(localPlayerNameplate);
            for (var boop in boops) stage.addChild(boops[boop]);
            for (var shit in otherPlayers) otherPlayers.splice(shit, 1);
            for (var shit in otherPlayersNameplates) otherPlayersNameplates.splice(shit, 1);
            for (var opl in playerArray) {
                if (playerArray[opl] != undefined && playerArray[opl] != null && playerArray[opl].id != localPlayerObj.id) {
                    otherPlayers[opl] = new createjs.Bitmap("dog.png");
                    otherPlayers[opl].name = playerArray[opl].id;
                    otherPlayersNameplates[opl] = new createjs.Text(playerArray[opl].name, "11px Arial", "#000000");
                    stage.addChild(otherPlayers[opl]);
                    stage.addChild(otherPlayersNameplates[opl]);
                    otherPlayers[opl].x = playerArray[opl].x;
                    otherPlayersNameplates[opl].x = playerArray[opl].x - ((otherPlayersNameplates[opl].getBounds().width - otherPlayers[opl].getBounds().width) / 2);
                    otherPlayers[opl].y = playerArray[opl].y;
                    otherPlayersNameplates[opl].y = playerArray[opl].y - 15;
                    otherPlayers[opl].addEventListener("mousedown", sendBoop);
                }
            }
        }
    });

    // Server reports new chat messages since last update
    // Array of strings
    socket.on('updateChat', function (msgArray) {
        for(var msg in msgArray){
            addToChatQueue(msgArray[msg]);
        }
    });

    // Performs any necessary game/UI  updates as a result of a player disconnecting. Server will only report nearby players
    // Object rendering/removal is handled in the render function, not here.
    // Player object
    socket.on('playerDisconnect', function (otherPlayerObj) {
        addToChatQueue(otherPlayerObj.name + " has disconnected!");
    });

    // Player receives a boop from somebody else
    // Player object
    socket.on('boop', function (otherPlayerObj) {
        // TODO: receive boop indicators
        var newBoop = new createjs.Bitmap("boop.png");
        stage.addChild(newBoop);
        newBoop.scaleX = 0.3;
        newBoop.scaleY = 0.3;
        newBoop.x = localPlayerObj.x;
        newBoop.y = localPlayerObj.y;
        boops.push(newBoop);
    });

    // -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >>

    gameActive = true;

}

// Game loop, repeats every frame
function tick(event) {
    if (!gameActive) { // pre-init behavior

    } else { // gameplay behavior

        // TODO: finish main game loop

        // keep track of server polls
        currentPollValue ++;
        if(currentPollValue > serverPollRate){
            currentPollValue = 0;
            sendMovementPolls = true;
        }else{
            sendMovementPolls = false;
        }

        // per-frame local variables
        var movementDirection = [0, 0];

        // movement input handling
        if (!movementLocked && document.hasFocus() && document.activeElement != chatbox) { // make sure movement is possible & window is focused
            if (keys[65]) {
                movementDirection[0] -= 1;
            }
            if (keys[68]) {
                movementDirection[0] += 1;
            }
            if (keys[83]) {
                movementDirection[1] += 1;
            }
            if (keys[87]) {
                movementDirection[1] -= 1;
            }
        }

        // character movement
        if(movementDirection[0] != 0 || movementDirection[1] != 0) {
            localPlayerObj.x += unitsPerSecond(event, (movementDirection[0] * movementSpeed));
            localPlayerObj.y += unitsPerSecond(event, (movementDirection[1] * movementSpeed));
            if(sendMovementPolls) sendPlayerObjToServer(localPlayerObj);
        }

        // update local player sprite
        localPlayerBitmap.x = localPlayerObj.x;
        localPlayerBitmap.y = localPlayerObj.y;
        localPlayerNameplate.x = localPlayerBitmap.x - (localPlayerNameplate.getBounds().width - localPlayerBitmap.getBounds().width)/2;
        localPlayerNameplate.y = localPlayerBitmap.y - 15;

        // show various debug info to the player
        debugInfo.innerHTML = localPlayerObj.name + "<br/>X: " + localPlayerObj.x + "<br/>Y: " + localPlayerObj.y;

        // Animate boop indicators
        for(var boop in boops){
            boops[boop].alpha -= 0.05;
            if(boops[boop].alpha < 0){
                stage.removeChild(boops[boop]);
                boops.splice(boop, 1);
            }
        }

        stage.update(event);

    }
}