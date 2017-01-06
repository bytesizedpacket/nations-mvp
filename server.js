var serverVersion = "0.0.2"; // makes sure client and server are compatible versions

var serverPort = 6969;
var tickRate = 30; // ticks per second

// init dependencies
var app = require('express')();
var server = app.listen(serverPort);
var socket = require('socket.io');
var io = socket.listen(server);

// Start server
server.listen(serverPort);
console.log("Server running on port " + serverPort);

// init global variables
var chatqueue = []; // Unlikely to contain more than a few messages, rendering handled clientside
var players = []; // It is normal for this to have undefined values, please account for this!

// Useful prototypes/helper functions
// -- << -- << -- << -- << -- << -- << -- << -- << -- << -- << -- << -- <<

// Same as .replace(), except covers all occurrences
String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

// Removes all special characters from the given string.
String.prototype.removeSpecialChars = function () {
    var target = this;
    return target.replace(/[^\w\s]/gi, '');
};

// Add a string to the chat queue
function sendChatMessage(msg){
    chatqueue.push(msg);
}

// send a boop to the given ID from a given sender object
function sendBoop(id, playerObject){
    io.in(id).emit('boop', playerObject);
}

// -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >>

// HTTP file serving
// -- << -- << -- << -- << -- << -- << -- << -- << -- << -- << -- << -- <<
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/oldclient.html', function (req, res) {
    res.sendFile(__dirname + '/oldclient.html');
});

app.get('/client.js', function (req, res) {
    res.sendFile(__dirname + '/client.js');
});

app.get('/client-old.js', function (req, res) {
    res.sendFile(__dirname + '/client-old.js');
});

app.get('/dog.png', function (req, res) {
    res.sendFile(__dirname + '/assets/dog.png');
});

app.get('/boop.png', function (req, res) {
    res.sendFile(__dirname + '/assets/boop.png');
});
// -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >>

// Player has loaded the webpage
io.on('connection', function (socket) {
    // TODO: Prevent rapid-fire requests

    // player-specific local variables
    var thisPlayerObject;
    var loggedIn = false;
    socket.join(socket.id);
    //var recentActions = 0; // incrememnted every time an action is performed, reset every second

    // Functions for common tasks
    // -- << -- << -- << -- << -- << -- << -- << -- << -- << -- << -- << -- <<

    // Update all references to a player object with a given player object
    function updatePlayerObject(playerObject){
        for(var pl in players){
            if(players[pl].id == playerObject.id) players[id] = thisPlayerObject;
            var arrayUpdateSuccess = true; // keep track of whether the player array was successfully updated
        }
        // Alert the console of any potential issues with player updates
        if(!arrayUpdateSuccess){
            console.log("Player " + playerObject.name + "'s (" + playerObject.id + ") array object failed to update! Problems may arise shortly.");
        }
        thisPlayerObject = playerObject;
    }

    // Send a chat message to a specific player
    function sendChatMessageToPlayer(msg){
        io.in(socket.id.toString()).emit('updateChat', [msg]);
    }

    // Force a player to update their local player object
    function forceUpdatePlayer(playerObject){
        io.in(socket.id.toString()).emit('forceUpdatePlayer', playerObject);
    }

    // Send any request to this specific player
    function sendRequestToPlayer(requestString, obj){
        io.in(socket.id.toString()).emit(requestString, obj);
    }

    // Calculates the distance between two [x, y] coordinate arrays.
    // TODO: distance calc
    function calculateDistance(){

    }

    // -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >>

    // Player has disconnected
    socket.on('disconnect', function () {
        //recentActions++;
        if (loggedIn) {
            console.log(thisPlayerObject.name + " disconnected.");
            socket.emit('playerDisconnect', thisPlayerObject);
            delete players[thisPlayerObject]; // set array element to undefined
            console.log(players);
        }
    });

    // Received attempt to login from client
    // Arg: player object
    socket.on('loginAttempt', function (playerInfo) {
        //recentActions++;
        console.log("Login attempt with name '" + playerInfo.name + "'");
        var fixedName = playerInfo.name.removeSpecialChars(); // remove invalid characters from the name
        if (fixedName != "" && fixedName.length <= 8) {

            // check if name is already taken
            var takenCheck = false;
            for (var pl in players) {
                if (players[pl].name == fixedName) {
                    takenCheck = true;
                }
            }

            if (takenCheck) {
                io.in(socket.id.toString()).emit('loginDenied', "Taken!"); // name was taken
            } else {

                if(playerInfo.version != serverVersion){
                    io.in(socket.id.toString()).emit('loginDenied', "Client outdated!"); // name was taken
                }else {
                    // prepare local variables
                    loggedIn = true;
                    playerInfo.name = fixedName;
                    console.log(socket.id.toString() + ", " + fixedName + " has connected.");
                    playerInfo.id = socket.id;
                    players.push(playerInfo);
                    thisPlayerObject = playerInfo;

                    // accept login
                    sendRequestToPlayer('loginAccepted', playerInfo);
                    console.log(players);
                    //io.in(socket.id.toString()).emit('updatePlayer', playerInfo);
                }
            }
        } else {
            if(fixedName == ""){
                sendRequestToPlayer('loginDenied', "Enter a name!");
            }else {
                sendRequestToPlayer('loginDenied', "Too long!");
            }
        }
    });

    // Received updated player from client
    // Arg: player object
    socket.on('updatePlayer', function (playerObject) {
        //recentActions++;
        var movementInvalid = false;
        if (loggedIn) {
            // check for invalid movement since last update
            if(Math.abs(playerObject.x - thisPlayerObject.x) > 1){
                playerObject.x = thisPlayerObject.x;
                movementInvalid = true;
            }
            if(Math.abs(playerObject.y - thisPlayerObject.y) > 1){
                playerObject.y = thisPlayerObject.y;
                movementInvalid = true;
            }
            if(movementInvalid) sendChatMessageToPlayer("Invalid movement!");
            forceUpdatePlayer(playerObject);
            updatePlayerObject(playerObject);
        }
    });

    // Player submitted a chat message
    // Arg: string
    socket.on('chatMessage', function (msg) {
        //recentActions++;
        if (loggedIn) {
            if (msg.replaceAll(" ", "") == "") msg = "I am an immature child begging for attention.";
            var formattedMsg = "<b>" + thisPlayerObject.name + "</b>: " + msg.substr(0, 100).replaceAll("<", "&lt;").replaceAll(">", "&gt;") + "<br/>";
            sendChatMessage(formattedMsg);
        }
    });

    // Player is sending a boop
    // Arg: string
    socket.on('boop', function (id) {
        //recentActions++;
        if (loggedIn) {
            var target = undefined;

            // check if target ID exists
            // TODO: distance comparison
            for (var x in players) {
                if (players[x].id == id) target = players[x];
            }

            if (target) {
                sendBoop(id, thisPlayerObject);
            } else {
                console.log(thisPlayerObject.name + " tried to boop an invalid target.");
            }

        }
    })
});

// server loop
// currently ~30 ticks/sec
setInterval(function () {
    io.emit('updateAllPlayers', players); // TODO: Update players on a per-client basis, filter out irrelevant players
    if(chatQueue != []) {
        io.emit('updateChat', chatqueue);
        chatqueue = [];
    }
}, Math.round(1000 / tickRate));