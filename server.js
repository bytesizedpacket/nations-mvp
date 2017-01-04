var serverPort = 6969;

// init dependencies
var app = require('express')();
var server = require('http').Server(app);
var socket = require('socket.io');
var io = socket.listen(server);

// init global variables
var chatqueue = [];
var players = [];

// Useful prototypes/helper functions
// -- << -- << -- << -- << -- << -- << -- << -- << -- << -- << -- << -- <<

// Same as .replace(), except covers all occurrences
String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

// TODO: regexp to return a string with only 0-9 A-Z a-z

// -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >> -- >>

// Start server
server.listen(serverPort, function () {
    console.log("Listening on *:6969");
});

// HTTP file serving
// -- << -- << -- << -- << -- << -- << -- << -- << -- << -- << -- << -- <<
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/client.js', function (req, res) {
    res.sendFile(__dirname + '/client.js');
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
    var playerIndex;
    var thisPlayer;
    var loggedIn = false;
    socket.join(socket.id);

    // TODO: fix the array element removal here
    // Player has disconnected
    socket.on('disconnect', function () {
        if (loggedIn) {
            console.log(thisPlayer.name + " disconnected.");
            socket.emit('playerDisconnect', thisPlayer);
            for (var pl in players) {
                if (thisPlayer.id == players[pl].id) {
                    players.splice(players.indexOf(players[pl]), 1);
                }
            }
            console.log(players);
        }
    });

    // TODO: rewrite this entire function
    // Received attempt to login from client
    // Arg: player object
    socket.on('loginAttempt', function (playerInfo) {
        console.log("Login attempt with name '" + playerInfo.name + "'");
        var fixedName = playerName.replaceAll(" ", "");
        if (fixedName != "" && fixedName.length <= 8 && fixedName != "Invalid!" && fixedName != "Taken!") { // TODO: remove reasons
            var takenCheck = false;
            for (var names in players) {
                if (players[names].name == fixedName) {
                    takenCheck = true;
                }
            }

            if (takenCheck) {
                io.in(socket.id.toString()).emit('loginDenied', "Taken!");
            } else {
                loggedIn = true;
                playerInfo.name = fixedName;
                console.log(socket.id.toString());
                playerInfo.id = socket.id;
                playerIndex = players.length;
                players.push(playerInfo);
                thisPlayer = playerInfo;
                io.in(socket.id.toString()).emit('loginAccepted', playerInfo);
                console.log(players);
                //io.in(socket.id.toString()).emit('updatePlayer', playerInfo);
            }
        } else {
            io.in(socket.id.toString()).emit('loginDenied', "Invalid!");
        }
    });

    // TODO: rewrite this, add anti-movement-hack code
    // Received updated player from client
    // Arg: player object
    socket.on('updatePlayer', function (playerInfo) {
        if (loggedIn) {
            if (playerInfo.name != "") {
                if (playerInfo.name != thisPlayer.name) playerInfo.name = thisPlayer.name;
                players[playerIndex] = playerInfo;
                thisPlayer = playerInfo;
            } else {
                console.log("No name received???");
            }
        } else {
            thisPlayer = undefined;
        }
    });

    // Player submitted a chat message
    // Arg: string
    // TODO: move chat queue control to client
    socket.on('chatMessage', function (msg) {
        if (loggedIn) {
            if (msg.replaceAll(" ", "") == "") msg = "I am an immature child begging for attention.";
            chatqueue.push("<b>" + thisPlayer.name + "</b>: " + msg.substr(0, 100).replaceAll("<", "&lt;").replaceAll(">", "&gt;") + "<br/>"); // TODO: move chat array management to serverside
        }
    });

    // Player is sending a boop
    // Arg: string
    socket.on('boop', function (id) {
        if (loggedIn) {
            var target = undefined;

            for (var x in players) {
                if (players[x].id == id) target = players[x];
            }
            if (target) {
                io.in(id.toString()).emit('boop', thisPlayer);
            } else {
                console.log("Target ID not found, aborting");
            }
        }
    })
});

// server loop
// currently ~30 ticks/sec
setInterval(function () {
    //console.log("tick");
    io.emit('updateAllPlayers', players); // TODO: Move player array management to serverside
    io.emit('updateChat', chatqueue); // TODO: check if chat is actually different before refreshing
    chatqueue = [];
}, 33);