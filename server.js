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

var http = require('http');
var path = require('path');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');
var app = express();




//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);
// io.origins('*:*')

router.use(express.static(path.resolve(__dirname, 'client')));
var sockets = [];
var displays = [];
var cnt = 0;
var posses = [
  [1, 1],
  [1, 8],
  [8, 8],
  [8, 1]
];
var colors = ["red", "blue", "green", "yellow"];


class Player {
  constructor(name) {
    // console.log(sockets.length)
    this.id = cnt;
    this.color = colors[this.id - 1]
    this.name = name;
    this.energy = 0;
    this.pos = posses[this.id - 1];
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
  turn: 0
};
io.on('connection', function(socket) {
  if (sockets.length < 4) {
    
    /* @Desc: Takes new direction from player and determines new position
     * @Params: data{} - dir(srt): direction chosen by player - name(str): name of player sending data
     */
    socket.on("new direction", function(data) {
// console.log(data.dir + "M OFDFMDOFD")
// console.log((data.name === game.players[game.idTurn].name))
      if (data.name === game.players[game.idTurn].name) {
console.log(game.players[game.idTurn].pos)

        if (data.dir == "north" && game.players[game.idTurn].pos[0] > 0) {
          game.players[game.idTurn].pos[0]--;
        }
        else if (data.dir == "east" && game.players[game.idTurn].pos[1] <= 8) {
          game.players[game.idTurn].pos[1]++;
        }
        else if (data.dir == "south" && game.players[game.idTurn].pos[0] <= 8) {
          game.players[game.idTurn].pos[0]++;
        }
        else if (data.dir == "west" && game.players[game.idTurn].pos[1] > 0) {
          game.players[game.idTurn].pos[1]--;
        }
        else {
          console.log("TF??!?!?!?! " + data.dir)
        }
        console.log(game.players[game.idTurn].pos)
      }
    });

    socket.on("display", function() {
      displays.push(socket)
    })

    socket.on("name", function(name) {
      cnt++;
      sockets.push(socket);

      console.log("someone connected");

      game.players.push(new Player(name));
      game.idTurn++;
      // console.log("SOCKET LENGTH "+ sockets.length)
      broadcast("queue", "There are " + game.players.length + " people connencted.");
      dBroadcast("queue", game);
      console.log(game.players[game.players.length - 1])
    })

    // socket.on("update", function(str){
    // if()
    // })
    if (game.players.length == 1) { // if its 3!! its  plus 1 since on connecttttttttt


      console.log("ITS GSTARING")

      var loop = setInterval(function() {
        if (game.turn >= 200) {
          clearInterval(loop)
        }
        // game.idTurn = game.turn % game.players.length;
        // game.turn++;

          game.turn++;
          game.idTurn = game.turn % game.players.length;
          console.log(game.idTurn)
          dBroadcast("draw", game)
          broadcast("update", game);
          //ewew


        
      }, 300)

    }
    // } else{
    // console.log(sockets.length)
    // }



    socket.on('disconnect', function() {
      sockets.splice(sockets.indexOf(socket), 1);
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
