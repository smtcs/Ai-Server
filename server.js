/*

git status  // tells current status of files
git add // Adds changed files to record.  -A will add all files
git commit -m "message" // commits changes to be pushed
git push // pushes all changes to github

*/

//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var fs = require("fs")
var http = require('http');
var path = require('path');
var PF = require('pathfinding');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');
var app = express();

const PLAYER_NUMBER = 2;


var gameSockets = [];
var queueSockets = [];
var gameRunning = false;

//TODO: store key and associating name in an object


//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//


var data = JSON.parse(fs.readFileSync("database.json"));


var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);
// io.origins('*:*')

router.use(express.static(path.resolve(__dirname, 'client')));
var sockets = [];
var displays = [];
var cnt = 0;
const posses = [
  [1, 1],
  [1, 17],
  [17, 17],
  [17, 1]
];
var colors = ["red", "blue", "green", "yellow"];
var tempName = "";

class Player {
  constructor(name) {
    // console.log(sockets.length)
    this.id = sockets.length;
    this.color = colors[this.id - 1]
    this.name = name;
    this.energy = 0;
    this.pos = [];
    this.pos.push(posses[this.id - 1][0]);
    this.pos.push(posses[this.id - 1][1]);
    // c
    // console.log("NEW PLAYER!!!!!! " + posses[this.id - 1] + "    tf ? " + this.id)
    this.dir = "";
  }
}


// io.configure('development', function() {
//   io.set('heartbeats', false); //removes heartbeats
//   io.set('log level', 1); // reduces all socket.io logging, including heartbeats.
// });
var game = {
  map: "",
  players: [],
  idTurn: 0,
  turn: 0,
  bases: []
};



io.on('connection', function(socket) {
  if (game.players.length < 4) {

    socket.on("newPlayer", function(obj) {
      data[obj.key] = { username: obj.username, wins: 0, permName: false }
      fs.writeFileSync("database.json", JSON.stringify(data, null, 2))
    })



    /* @Desc: Takes new direction from player and determines new position
     * @Params: data{} - dir(srt): direction chosen by player - name(str): name of player sending data
     */

    socket.on("new direction", function(data) {
      // console.log(data.id + " went in the direction " + data.dir)

      // console.log(game)
      // console.log("data dir", data.dir)
      // console.log((data.name === game.players[game.idTurn].name))
      if (data.id == game.idTurn) {

        if (data.dir == "north" && game.players[game.idTurn].pos[0] > 0) {
          game.players[game.idTurn].pos[0]--;
        }
        else if (data.dir == "east" && game.players[game.idTurn].pos[1] <= 18) {
          game.players[game.idTurn].pos[1]++;
        }
        else if (data.dir == "south" && game.players[game.idTurn].pos[0] <= 18) {
          game.players[game.idTurn].pos[0]++;
        }
        else if (data.dir == "west" && game.players[game.idTurn].pos[1] > 0) {
          console.log("moving west");
          game.players[game.idTurn].pos[1]--;
        }
        else {
          console.log("No Direction Given?")
        }
        game.players[game.idTurn].dir = data.dir;
      }
      // console.log(game.players[0].pos)
      // console.log(game.players[1].pos)
    });

    socket.on("display", function() {
      displays.push(socket)
      dBroadcast("queue", game)
    })


    socket.on("name", function(key) {
      let tempname = checkKey(key);
      if (tempname) {

        socket.playerName = tempname;

        // socket.emit("getName", tempname);

        queueSockets.push(socket);

        // queueSockets
        if (queueSockets.length >= 2 && !gameRunning) {
          /* 1. Shifts queud players into sockets 
           * 2. Creates Players in game object
           * 3. Starts running game
           * 4. sets gameRunning to true
           */
          startGame(queueSockets);
        }
      }
      else {
        console.log("failleddddd")
      }




    })

    // socket.on("update", function(str){
    // if()
    // })

    // } else{
    // console.log(sockets.length)
    // }



    socket.on('disconnect', function() {
      // sockets.splice(sockets.indexOf(socket), 1);
    });


  }
  else {
    console.log("Added to the queue!");
  }
});


function broadcast(event, data) {
  sockets.forEach(function(socket) {
    socket.emit(event, data);
  });
}

function dBroadcast(event, data) {
  displays.forEach(function(socket) {
    socket.emit(event, data);
  });
}

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function() {
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});


function resetGame(game) {
  console.log("GAME LENGTH " + game.players.length)
  game.players.length = 0;
  sockets.length = 0;
  
  console.log("GAME LENGTH " + game.players.length)
  if (queueSockets.length >= PLAYER_NUMBER) {
    startGame(queueSockets)
    console.log("GAME LENGTH " + game.players.length)
  }
  else {
    gameRunning = false;
    console.log("GAME LENGTH " + game.players.length)
  }

  console.log("end of reset", game.players[0]);
  // broadcast("gameOver");
}

function startGame(queued) {
  console.log("beginning of startGame", game.players[0]);
  game.idTurn = 0;
  game.turn = 0;
  gameRunning = true;
  for (var i = 0; i < PLAYER_NUMBER; i++) {

    var oi = queued.shift();
    sockets.push(oi);
    console.log(oi.playerName)
    game.players.push(new Player(oi.playerName));
    console.log(game.players)
    // console.log(queued)
  }
  console.log("someone connected");
  broadcast("queue", "There are " + game.players.length + " people connencted.");
  dBroadcast("queue", game);

  broadcast("gameStart", game)
  // for (var i = 0; i < game.players.length; i++) {
    console.log("this is posses", posses[i]);
    // game.players[i].pos = posses[i]
  // }
  
    console.log("before loop starts", game.players[0]);
  var loop = setInterval(function() {
    // console.log("LOOPING" + game.players.length + " should be above zero, algong with " + sockets.length + ", but " + queueSockets.length + " should be zero.")
    if (game.turn > 50) {
      clearInterval(loop)
      resetGame(game)
    }
    else {

      game.turn++;
      game.idTurn = game.turn % game.players.length;
      game.myBot = game.players[game.idTurn];
      dBroadcast("draw", game)
      // console.log(game);
      sockets[game.idTurn].emit("update", game);
      //ewew
    }
  }, 300)
}

function checkKey(key) {
  let temp = JSON.parse(fs.readFileSync("database.json"));
  let arr = Object.keys(temp)
  // console.log(arr)
  for (let i = 0; i < arr.length; i++) {
    if (key == arr[i]) {
      // tempName = temp[key].username;
      return temp[key].username;
    }
    else {
      console.log(temp[arr[i]].username + "     is     ")
    }
  }
  return false;

}
