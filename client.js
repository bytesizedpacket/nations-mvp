// identifier variables
var clientVersion = "0.0.3"; // makes sure client and server are compatible versions
var serverPollRate = "2"; // frames per movement update
var clientResolution = [1280, 720]; // Resolution in pixels of the game's screen

// init socket.io
var socket = io.connect(window.location.host);

// start game loop, shut up webstorm's bitching
//noinspection JSUnresolvedVariable,JSUnresolvedFunction
createjs.Ticker.on("tick", tick);
//noinspection JSUnresolvedVariable,JSUnresolvedFunction
createjs.Ticker.setFPS(60);

// Init global variables
// Undefined at game start
var stage, localPlayerBitmap, localPlayerNameplate, borderRect, visibleChunks, visibleTiles;
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
gameCanvas.width = clientResolution[0]; // set resolution
gameCanvas.height = clientResolution[1];
var chatbox = document.getElementById("chatbox"); // Textbox for chat messages
var chatlog = document.getElementById('chatlog'); // Div which contains chatlog
var debugInfo = document.getElementById('debugInfo'); // debug info shown to the player
// UI
var chatQueue = []; // queue of messages to display in chat, capped at 10 length
var boops = [];
var dog = new Image();
dog.src = 'dog.png';
var boopImg = new Image();
boopImg.src = 'boop.png';
var grassImg = new Image();
grassImg.src = 'grass.png';
var stoneImg = new Image();
stoneImg.src = 'stone.png';
// Local player
var localPlayerObj = {name: "", id: "", x: 96, y: 96, version: clientVersion}; // blank player object
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
    for (var msg in chatQueue) {
        chatlog.innerHTML += chatQueue[msg] + "<br/>";
    }
}

// Send updated player object to the server
function sendPlayerObjToServer(playerObject) {
    socket.emit('updatePlayer', playerObject);
}

function addToChatQueue(msg) {
    chatQueue.unshift(msg); // add to beginning
    if (chatQueue.length > 10) chatQueue.length = 10; // lock length at 10
    updateChatDisplay();
}

// Sends boop to other player
function sendBoop(event) {
    socket.emit('boop', event.target.name);
    var newBoop = new createjs.Bitmap(boopImg);
    newBoop.scaleX = 0.3;
    newBoop.scaleY = 0.3;
    stage.addChild(newBoop);
    newBoop.x = event.target.x - ((newBoop.getBounds().width * 0.3) - event.target.getBounds().width) / 2; // TODO: figure out how to get bounds from this
    newBoop.y = event.target.y - 5;
    boops.push(newBoop);
}

// Returns screen coordinates based on the given world coordinates
// Pass an [X, Y] array!
function convertWorldToScreen(coords) {
    var tempCoordX = coords[0] - localPlayerObj.x;
    var tempCoordY = coords[1] - localPlayerObj.y;
    var screenMiddleX = clientResolution[0] / 2;
    var screenMiddleY = clientResolution[1] / 2;
    return [screenMiddleX + tempCoordX, screenMiddleY + tempCoordY];
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
            } else {
                if (document.activeElement != chatbox) { // chatbox is not focused
                    chatbox.focus();
                } else { // chatbox is focused
                    if (chatbox.value.replaceAll(" ", "") != "") socket.emit('chatMessage', chatbox.value); // send chat message
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

    // Create startup UI
    stage = new createjs.Stage("game");
    gameCanvas.style = "outline: #000000 solid 1px;";
    chatbox.style.visibility = "visible";
    loginField.innerHTML = "";

    // Create local player
    localPlayerBitmap = new createjs.Bitmap(dog);
    stage.addChild(localPlayerBitmap);
    // Create player nameplate
    localPlayerNameplate = new createjs.Text(localPlayerObj.name, "11px Arial", "#000000");
    stage.addChild(localPlayerNameplate);

    // Socket listeners
    // -- << -- << -- << -- << -- << -- << -- << -- << -- << -- << -- << -- <<

    socket.on('disconnect', function () {
        gameActive = false;
        debugInfo.innerHTML = "SERVER DISCONNECTED";
        socket = null;
    });

    // Server forcibly updates the player's info
    // Player object
    socket.on('forceUpdatePlayer', function (playerObj) {
        localPlayerObj = playerObj;
    });

    // Server provides an array of players for the client to render
    // NOTE: THIS WILL INCLUDE THE CURRENT PLAYER
    // Array of player objects
    socket.on('updateWorld', function (worldUpdate) {
        // DESTROY ALL CURRENT OBJECTS AND START AGAIN FROM SCRATCH
        // FUCK EFFICIENCY
        // also jesus this is ugly
        var playerArray = worldUpdate[0]
        var chunkObjArray = worldUpdate[1];
        stage.removeAllChildren();
        stage.removeAllEventListeners; // because forlooping the array apparently doesn't work

        visibleTiles = [];
        visibleChunks = chunkObjArray;
        for(var chunkObj in visibleChunks){
            for(var x in visibleChunks[chunkObj].chunk) {
                for (var y in visibleChunks[chunkObj].chunk[x]) {
                    var tile = visibleChunks[chunkObj].chunk[x][y];
                    if(tile.type == "grass"){
                        visibleTiles.push(new createjs.Bitmap(grassImg));
                    }else if(tile.type == "stone"){
                        visibleTiles.push(new createjs.Bitmap(stoneImg));
                    }

                    var tileImg = visibleTiles[visibleTiles.length - 1];
                    stage.addChild(tileImg);
                    var tilePos = convertWorldToScreen([visibleChunks[chunkObj].x + (x * 48),visibleChunks[chunkObj].y + (y * 48)])
                    tileImg.x = tilePos[0];
                    tileImg.y = tilePos[1];
                }
            }
        }

        stage.addChild(localPlayerBitmap); //
        stage.addChild(localPlayerNameplate); // re-add the persistent shit, because this is definitely efficient to do every frame
        for (var boop in boops) stage.addChild(boops[boop]); // these too
        for (var shit in otherPlayers) otherPlayers.splice(shit, 1); // fuck these guys though
        for (var shit in otherPlayersNameplates) otherPlayersNameplates.splice(shit, 1); // and fuck their moms ( ͡° ͜ʖ ͡°)
        for (var opl in playerArray) {
            if (playerArray[opl] != undefined && playerArray[opl] != null && playerArray[opl].id != localPlayerObj.id) { // gotta be triple sure it's not the local player
                otherPlayers[opl] = new createjs.Bitmap(dog); // everybody gets a dog
                otherPlayers[opl].name = playerArray[opl].id; // because this is a good way to keep track of IDs I guess
                otherPlayersNameplates[opl] = new createjs.Text(playerArray[opl].name, "11px Arial", "#000000"); // names are important I think
                stage.addChild(otherPlayers[opl]); // this entire block of code is fucking garbage jfc
                stage.addChild(otherPlayersNameplates[opl]); // I feel dirty for writing it
                var screenPosition = convertWorldToScreen([playerArray[opl].x - (otherPlayers[opl].getBounds().width / 2), playerArray[opl].y - (otherPlayers[opl].getBounds().height / 2)]);
                otherPlayers[opl].x = screenPosition[0]; // make sure the subjective representation of a non-local entity at least vaguely corresponds to the objective truth (assuming one actually exists)
                otherPlayers[opl].y = screenPosition[1]; // make sure the subjective representation of a non-local entity at least vaguely corresponds to the objective truth (assuming one actually exists)
                otherPlayersNameplates[opl].x = otherPlayers[opl].x - (otherPlayersNameplates[opl].getBounds().width - otherPlayers[opl].getBounds().width) / 2; // I need to make a function for this
                otherPlayersNameplates[opl].y = otherPlayers[opl].y - 15; // put it above their heads
                otherPlayers[opl].addEventListener("mousedown", sendBoop); // so you can boop them
            }
        }
    });

    // Server reports new chat messages since last update
    // Array of strings
    socket.on('updateChat', function (msgArray) {
        for (var msg in msgArray) {
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
        var newBoop = new createjs.Bitmap(boopImg); // new boop
        stage.addChild(newBoop);
        newBoop.scaleX = 0.3; // make a decent size
        newBoop.scaleY = 0.3;
        newBoop.x = localPlayerBitmap.x - ((newBoop.getBounds().width * 0.3) - localPlayerBitmap.getBounds().width) / 2; // center that shit
        newBoop.y = localPlayerBitmap.y - 5;
        boops.push(newBoop); // more array witchcraft
        addToChatQueue(otherPlayerObj.name + " has booped you!"); // alert the player with a more persistent message
    });

    // -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >>

    gameActive = true;

}

// Game loop, repeats every frame
function tick(event) {
    if (!gameActive) { // pre-init behavior

    } else { // gameplay behavior

        // keep track of server polls
        currentPollValue++;
        if (currentPollValue > serverPollRate) {
            currentPollValue = 0;
            sendMovementPolls = true;
        } else {
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
        if (movementDirection[0] != 0 || movementDirection[1] != 0) {
            var movementValid = true;
            for(var chunkObj in visibleChunks){
                for(var x in visibleChunks[chunkObj].chunk) {
                    for (var y in visibleChunks[chunkObj].chunk[x]) {
                        var tile = visibleChunks[chunkObj].chunk[x][y];
                        if(tile.collides){
                            var futurePosX = localPlayerObj.x + unitsPerSecond(event, (movementDirection[0] * movementSpeed));
                            var futurePosY = localPlayerObj.y + unitsPerSecond(event, (movementDirection[1] * movementSpeed));
                            var negativeZoneX = [visibleChunks[chunkObj].x + (x * 48), (visibleChunks[chunkObj].x + (x * 48)) + 48];
                            var negativeZoneY = [visibleChunks[chunkObj].y + (y * 48), (visibleChunks[chunkObj].y + (y * 48)) + 48];
                            if(futurePosX > negativeZoneX[0] && futurePosX < negativeZoneX[1] && futurePosY > negativeZoneY[0] && futurePosY < negativeZoneY[1]){
                                movementValid = false;
                            }
                        }
                    }
                }
            }
            if(movementValid) {
                localPlayerObj.x += unitsPerSecond(event, (movementDirection[0] * movementSpeed));
                localPlayerObj.y += unitsPerSecond(event, (movementDirection[1] * movementSpeed));
                if (sendMovementPolls) sendPlayerObjToServer(localPlayerObj);
            }
        }

        // update local player sprite
        localPlayerBitmap.x = (clientResolution[0] / 2) - (localPlayerBitmap.getBounds().width / 2);
        localPlayerBitmap.y = (clientResolution[1] / 2) - (localPlayerBitmap.getBounds().height / 2);
        localPlayerNameplate.x = localPlayerBitmap.x - (localPlayerNameplate.getBounds().width - localPlayerBitmap.getBounds().width) / 2; // center above player
        localPlayerNameplate.y = localPlayerBitmap.y - 15;

        // show various debug info to the player
        debugInfo.innerHTML = localPlayerObj.name + "<br/>X: " + localPlayerObj.x.toString().substring(0, 8) + "<br/>Y: " + localPlayerObj.y.toString().substring(0, 8);

        // Animate boop indicators
        for (var boop in boops) {
            boops[boop].alpha -= 0.05;
            if (boops[boop].alpha < 0) {
                stage.removeChild(boops[boop]);
                boops.splice(boop, 1);
            }
        }

        stage.update(event); // render the frame

    }
}