// This is the OLD client. The new script can be found at client.js

// init vars
var stage, localPlayer, localPlayerNameObject, updateIndex;
var moveDirectionH = [0, 0];
var moveDirectionV = [0, 0];
var moveDirection;
var localPlayerInfo = {name: "", id: "", sprite: "placeholder", x: 0, y: 0}; // TODO: add sprite selection
var otherPlayers = [];
var otherPlayerObjects = [];
var otherPlayerNametagObjects = [];
var otherPlayersNames = [];
var namediv = document.getElementById("loginField");
var namefield = document.getElementById("usernameInput");
var reasonfield = document.getElementById("deniedReason");
var boopImg = [];
var chatbox = document.getElementById('chatbox');
var chatlog = document.getElementById('chatlog');
var chatqueue = [];
var gameStart = false;

// adjustable vars
var movementSpeed = 2;

// init socket
var socket = io.connect(window.location.host);

socket.on('loginAccepted', function () {
    init();
});
socket.on('loginDenied', function (res) {
    reasonfield.innerHTML = res;
});

String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

addEventListener("keydown", handleInputDown);
addEventListener("keyup", handleInputUp);

// Initialize
function attemptLogin() {
    localPlayerInfo.name = namefield.value;
    socket.emit('loginAttempt', localPlayerInfo);
}
function init() {
    gameStart = true;
    chatbox.style.visibility = 'visible';
    namediv.innerHTML = "";
    stage = new createjs.Stage("game");

    // init player
    localPlayer = new createjs.Bitmap("dog.png"); // TODO: make dpi-aware
    stage.addChild(localPlayer);
    localPlayer.y = 50;
    localPlayer.x = 10;
    localPlayerInfo.x = localPlayer.x;
    localPlayerInfo.y = localPlayer.y;

    // init netcode
    socket.on('updatePlayer', function (data) {
        console.log("Received player update\n" + data);
        localPlayerInfo = data;
        localPlayerNameObject.text = localPlayerInfo.name;
        console.log("Player forcibly updated by server.");
    });
    // called when user receives a boop
    socket.on('boop', function (sender) {
        console.log("Received a boop from " + sender.name);
        newBoopImg(localPlayer);
    });

    // receive player update
    socket.on('updateAllPlayers', function (data) {
        otherPlayers = data;
        for (var x in data) {
            if (data[x].id == localPlayerInfo.id) {
                otherPlayers.splice(data.indexOf(data[x]), 1);
            }
        }
    });

    // other player disconnects
    socket.on('playerDisconnect', function (otherPlayer) {
        // TODO: ingame notification
        console.log('Player ' + otherPlayer.name + " disconnected.");
    });

    socket.on('chatMessage', function (msg) {
        for (var x in msg) {
            chatqueue.unshift(msg[x]);
        }
        if (chatqueue.length > 10) {
            chatqueue.length = 10;
        }
        chatlog.innerHTML = "";
        for (var x in chatqueue) {
            chatlog.innerHTML += chatqueue[x];
        }
    });

    // player name
    localPlayerNameObject = new createjs.Text(localPlayerInfo.name, "12px Arial", "#000000");
    stage.addChild(localPlayerNameObject);

    // for server communication
    updateIndex = 0;

    // framerate
    createjs.Ticker.on("tick", tick);
    createjs.Ticker.setFPS(60);
}

// game loop, performed once per frame
function tick(event) {

    // fade/remove boops
    for (var x in boopImg) {
        boopImg[x].alpha -= 0.05;
    }

    // remove disconnected players
    for (var obj in otherPlayerObjects) {
        for (var opl in otherPlayers) {
            if (!otherPlayers[opl].name == otherPlayerObjects.name || otherPlayers[opl].id == localPlayerInfo.id || otherPlayers[opl].name == localPlayerInfo.name) {
                stage.removeChild(otherPlayerObjects[obj]);
                stage.removeChild(otherPlayerNametagObjects[obj]);
                otherPlayerNametagObjects.splice(otherPlayerNametagObjects.indexOf(otherPlayerNametagObjects[obj]), 1);
                otherPlayerObjects.splice(otherPlayerObjects.indexOf(otherPlayerObjects[obj]), 1);
            }
        }
    }

    // add new players
    for (var name in otherPlayers) {
        var exists = false;
        for (var obj in otherPlayerObjects) {
            if (otherPlayerObjects[obj].name == otherPlayers[name].name) exists = true;
        }
        if (!exists) {
            var newPlayerObject = new createjs.Bitmap("dog.png"); // TODO: make dpi-aware
            newPlayerObject.name = otherPlayers[name].name;
            stage.addChild(newPlayerObject);
            newPlayerObject.addEventListener("mousedown", sendBoop);
            var newPlayerNametagObject = new createjs.Text(otherPlayers[name].name, "12px Arial", "#000000");
            stage.addChild(newPlayerNametagObject);
            otherPlayerNametagObjects.push(newPlayerNametagObject);
            otherPlayerObjects.push(newPlayerObject);
        }
    }

    // update players
    for (var obj in otherPlayerObjects) {
        for (var otherP in otherPlayers) {
            // update sprite
            if (otherPlayerObjects[obj].name == otherPlayers[otherP].name) {
                otherPlayerObjects[obj].x = otherPlayers[otherP].x;
                otherPlayerObjects[obj].y = otherPlayers[otherP].y;
                //update nametag
                otherPlayerNametagObjects[obj].x = otherPlayers[otherP].x;
                otherPlayerNametagObjects[obj].x -= (otherPlayerNametagObjects[obj].getBounds().width - otherPlayerObjects[obj].getBounds().width) / 2; // center align
                otherPlayerNametagObjects[obj].y = otherPlayers[otherP].y - 20;
            }
        }
    }

    updateIndex++;
    if (updateIndex > 3) {
        socket.emit('updatePlayer', localPlayerInfo);
        updateIndex = 0;
    }
    // mediate conflicting movement keys (A+D, W+S)
    moveDirection = [0, 0];
    moveDirection[0] = moveDirectionH[0] + moveDirectionH[1];
    moveDirection[1] = moveDirectionV[0] + moveDirectionV[1];

    // move player across screen
    // TODO: make DPI-aware
    if (document.activeElement == document.body) {
        localPlayer.x += (unitsPerSecond(event, moveDirection[0] * 100)) * movementSpeed;
        localPlayer.y += (unitsPerSecond(event, moveDirection[1] * 100)) * movementSpeed;
        localPlayerInfo.x = localPlayer.x;
        localPlayerInfo.y = localPlayer.y;
    }

    // keep nametag aligned with player
    localPlayerNameObject.x = localPlayer.x;
    localPlayerNameObject.x -= (localPlayerNameObject.getBounds().width - localPlayer.getBounds().width) / 2; // center align
    localPlayerNameObject.y = localPlayer.y - 20;

    // canvas wraparound
    // TODO: implement moving map
    if (localPlayer.x > stage.canvas.width) localPlayer.x = 0;
    if (localPlayer.y > stage.canvas.height) localPlayer.y = 0;
    if (localPlayer.x < 0) localPlayer.x = stage.canvas.width;
    if (localPlayer.y < 0) localPlayer.y = stage.canvas.height;

    stage.update(event);
}

function handleInputDown(event) {
    //console.log(event.keyCode);
    switch (event.keyCode) {
        case 68:
            moveDirectionH[1] = 1;
            break;
        case 83:
            moveDirectionV[1] = 1;
            break;
        case 65:
            moveDirectionH[0] = -1;
            break;
        case 87:
            moveDirectionV[0] = -1;
            break;
        case 13:
            if (gameStart) {
                if (document.activeElement == chatbox) {
                    if (chatbox.value != "") socket.emit('chatMessage', chatbox.value);
                    chatbox.value = "";
                    chatbox.blur();
                    break;
                } else {
                    chatbox.focus();
                    break;
                }
            } else {
                attemptLogin();
            }
    }
}

function handleInputUp(event) {
    switch (event.keyCode) {
        case 68:
            moveDirectionH[1] = 0;
            break;
        case 83:
            moveDirectionV[1] = 0;
            break;
        case 65:
            moveDirectionH[0] = 0;
            break;
        case 87:
            moveDirectionV[0] = 0;
            break;
    }
}

function newBoopImg(pos) {
    var newBoopImg = new createjs.Bitmap("boop.png");
    newBoopImg.scaleX = 0.3;
    newBoopImg.scaleY = 0.3;
    newBoopImg.x = pos.x - 20;
    newBoopImg.y = pos.y - 5;
    if (boopImg.length > 5) {
        stage.removeChild(boopImg[4]);
        boopImg.length = 5;
        boopImg = boopImg.slice(0, 5);
    }
    boopImg.unshift(newBoopImg);
    stage.addChild(newBoopImg);
}

// Returns a coordinate value needed to change something X units per second,
// independently of framerate.
function unitsPerSecond(event, px) {
    return event.delta / 1000 * px;
}

// Called when the player clicks another player
function sendBoop(event) {
    var id;
    for (y in otherPlayers) {
        if (otherPlayers[y].name == event.target.name) {
            id = otherPlayers[y].id;
            console.log(id);
            if (id == localPlayerInfo.id) {
                console.log(true);
                otherPlayers.splice(y, 1);
            } else {
                newBoopImg(otherPlayers[y]);
            }
        }
    }
    console.log("Sending boop to ID\n" + id);
    socket.emit('boop', id);
}
