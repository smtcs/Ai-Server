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
  [1, 18],
  [18, 18],
  [18, 1]
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

let maps = [{nodes:[{pos:[4,4], energy:0}, {pos:[4,15], energy:0},{pos:[15,15], energy:0},{pos:[15,4], energy:0},{pos:[9,9], energy:0},{pos:[9,10], energy:0}, {pos:[10,9], energy:0},{pos:[10,10], energy:0}], bases: [  {pos:[1, 1], energy: 0},{pos:[1, 18], energy: 0},{pos:[18, 18], energy: 0},{pos:[18, 1], energy: 0}], barricades:[ [2,5],[15,5],[3,9], [3,10], [1,5], [3,5], [4,5], [5,5], [5,4], [5,3], [5,2], [5,1], [4,9], [5,9], [6,9], [4,10], [5,10], [6,10],[1,14], [2,14], [3,14], [4,14], [5,14], [5, 15], [5,16], [5,17], [5,18], [9,16], [9,15], [9,14], [9,13], [10,16], [10,15], [10,14], [10,13], [14,18], [14,17], [14,16], [14,15], [14,14], [15,14], [16,14], [17,14], [18,14], [16,9], [15,9], [14,9], [13,9], [16,10], [15,10], [14,10], [13,10], [18,5], [17,5], [16,5], [14,5], [14,4], [14,3], [14,2], [14,1], [10,3], [10,4], [10,5], [10,6], [9,3], [9,4], [9,5], [9,6  ]   ]  }]
var game = {
  map: "",
  players: [],
  idTurn: 0,
  turn: 0,
  bases: maps[0].bases,
  barricades: maps[0].barricades,
  nodes:maps[0].nodes
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

        if (data.dir == "north" && game.players[data.id].pos[0] > 0 && checkCollide(game.players[data.id].pos[1],game.players[data.id].pos[0]-1, game ) ) {
          game.players[data.id].pos[0]--;
        }
        else if (data.dir == "east" && game.players[data.id].pos[1] <= 18 && checkCollide(game.players[data.id].pos[1]+1,game.players[data.id].pos[0], game ) ) {
          game.players[data.id].pos[1]++;
        }
        else if (data.dir == "south" && game.players[data.id].pos[0] <= 18 && checkCollide(game.players[data.id].pos[1],game.players[data.id].pos[0]+1, game ) ) {
          game.players[data.id].pos[0]++;
        }
        else if (data.dir == "west" && game.players[data.id].pos[1] > 0 && checkCollide(game.players[data.id].pos[1]-1,game.players[data.id].pos[0], game )) {
          console.log("moving west");
          game.players[data.id].pos[1]--;
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
        if (queueSockets.length >= PLAYER_NUMBER && !gameRunning) {
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
  for(var i=0;i<game.nodes.length;i++){
    game.nodes[i].energy = 0;
  }
  
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
  for(let i=0;i<game.nodes.length;i++){
    game.nodes[i].x = game.nodes[i].pos[1]
    game.nodes[i].y = game.nodes[i].pos[0]
  }
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
    if (game.turn > 200) {
      clearInterval(loop)
      resetGame(game)
    }
    else {

      game.turn++;
      game.idTurn = game.turn % game.players.length;
      for(var i=0;i<game.players.length;i++){

      game.players[i].x = game.players[i].pos[1];
      game.players[i].y = game.players[i].pos[0];
      // if(game.players.pos)
      for(let j=0;j<game.players.length;j++){
        if(j!=i){
          if(game.players[i].pos == game.players[j].pos){
            if(game.players[i].energy  > game.players[j].energy){
              game.players[i].energy  = Math.ceil((game.players[i].energy + game.players[j].energy)/2)
              game.players[j].energy  = Math.floor((game.players[i].energy + game.players[j].energy)/2)              
            } else{
                game.players[j].energy  = Math.ceil((game.players[i].energy + game.players[j].energy)/2)
              game.players[i].energy  = Math.floor((game.players[i].energy + game.players[j].energy)/2)
            }
          }
        }
      }
      if(game.players[i].pos[1] == game.bases[i].pos[1] && game.players[i].pos[0] == game.bases[i].pos[0]){
        game.bases[i].energy+= game.players[i].energy
        game.players[i].energy = 0;
      }
      }
      
      game.myBot = game.players[game.idTurn];
      
      
      if(game.turn % 3 == 0){
        for(var i=0;i<game.nodes.length;i++){
          game.nodes[i].energy++;
          // console.log(game.nodes[i])
        }
      }
      
          for(var i=0;i<game.nodes.length;i++){
        if(game.players[game.idTurn].pos[1] == game.nodes[i].pos[1] && game.players[game.idTurn].pos[0] == game.nodes[i].pos[0]){
          game.players[game.idTurn].energy += game.nodes[i].energy;
          game.nodes[i].energy = 0;
        }
        }
        
      
      dBroadcast("draw", game)
      sockets[game.idTurn].emit("update", game);
      //ewew
    }
  }, 200)
}

function checkKey(key) {
  let arr = Object.keys(data)
  // console.log(arr)
  for (let i = 0; i < arr.length; i++) {
    if (key == arr[i]) {
      // tempName = temp[key].username;
      return data[key].username;
    }
    else {
      console.log(data[arr[i]].username + "     is     ")
    }
  }
  return false;

}


function checkCollide(x,y,game){
  for(var i=0;i<game.barricades.length;i++){
   if(game.barricades[i][1] == x && game.barricades[i][0] == y){
     return false;
   }
  }
  return true;
}