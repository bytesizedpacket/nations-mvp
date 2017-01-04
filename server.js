var app = require('express')();
var server = require('http').Server(app);
var socket = require('socket.io');
var io = socket.listen(server);
var chatqueue = [];

var players = [];

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

server.listen(6969, function(){
    console.log("Listening on *:6969");
});

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

app.get('/script.js', function(req, res){
    res.sendFile(__dirname + '/script.js');
});

app.get('/dog.png', function(req, res){
    res.sendFile(__dirname + '/dog.png');
});

app.get('/boop.png', function(req, res){
    res.sendFile(__dirname + '/boop.png');
});

io.on('connection', function(socket){
    //var sid = socket.id;
    var playerIndex;
    var thisPlayer;
    var loggedIn = false;
    //console.log(sid);
    // client has connected
    socket.join(socket.id);

    socket.on('disconnect', function(){
        if(loggedIn) {
            console.log(thisPlayer.name + " disconnected.");
            socket.emit('playerDisconnect', thisPlayer);
            for(var pl in players){
                if(thisPlayer.id == players[pl].id){
                    players.splice(players.indexOf(players[pl]), 1);
                }
            }
            console.log(players);
        }
    });

    socket.on('loginAttempt', function(playerInfo){
        var fixedName = playerInfo.name.replaceAll(" ","");
        if(fixedName != "" && fixedName.length <= 8 && fixedName != "Invalid!" && fixedName != "Taken!") {
            var takenCheck = false;
            for(var names in players){
                if(players[names].name == fixedName){
                    takenCheck = true;
                }
            }

            if(takenCheck){
                io.in(socket.id.toString()).emit('loginDenied', "Taken!");
            }else {
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
        }else{
            io.in(socket.id.toString()).emit('loginDenied', "Invalid!");
        }
    });

    socket.on('updatePlayer', function(playerInfo){
        if(loggedIn) {
            if (playerInfo.name != "") {
                if (playerInfo.name != thisPlayer.name) playerInfo.name = thisPlayer.name;
                players[playerIndex] = playerInfo;
                thisPlayer = playerInfo;
                //console.log(players[playerIndex].x);
            } else {
                console.log("No name received???");
            }
        }else{
            thisPlayer = undefined;
        }
        //console.log(players);
        //console.log("received update from " + players[socket.playerIndex].Name);
    });

    socket.on('chatMessage', function(msg){
        if(loggedIn) {
            if (msg.replaceAll(" ", "") == "") msg = "I am an immature child begging for attention.";
            chatqueue.push("<b>" + thisPlayer.name + "</b>: " + msg.substr(0, 100).replaceAll("<", "&lt;").replaceAll(">", "&gt;") + "<br/>"); // TODO: move chat array management to serverside
        }
    });

    socket.on('boop', function(id){
        if(loggedIn) {
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
setInterval(function(){
    //console.log("tick");
    io.emit('updateAllPlayers', players); // TODO: Move player array management to serverside
    io.emit('updateChat', chatqueue);
    chatqueue = [];
}, 33);