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

const PLAYER_NUMBER = 3;

var games = [];
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
var sockets = [
  [],
  [],
  [],
  [],
  []
];
var displays = [];
var cnt = 0;
const posses = [
  [1, 1],
  [18, 1],
  [18, 18],
  [1, 18]
];
var colors = ["red", "blue", "yellow", "grey"];
var tempName = "";

class Player {
  constructor(name, count) {
    this.id = count;
    this.color = colors[count]
    this.name = name;
    this.energy = 0;
    this.pos = [];
    this.pos.push(posses[count][0]);
    this.pos.push(posses[count][1]);
    this.dir = "";
  }
}


// io.configure('development', function() {
//   io.set('heartbeats', false); //removes heartbeats
//   io.set('log level', 1); // reduces all socket.io logging, including heartbeats.
// });

let maps = [{
  nodes: [{ pos: [4, 4], energy: 0 }, { pos: [15, 4], energy: 0 }, { pos: [15, 15], energy: 0 }, { pos: [4, 15], energy: 0 }, { pos: [8, 8], energy: 0 }, { pos: [11, 8], energy: 0 }, { pos: [8, 11], energy: 0 }, { pos: [11, 11], energy: 0 }],
  bases: [{ pos: [1, 1], energy: 0, id:0 }, { pos: [18, 1], energy: 0,id:1 }, { pos: [18, 18], energy: 0,id:2 }, { pos: [1, 18], energy: 0,id:3 }],
  barricades: [
    [5, 2],
    [5, 15],
    [9, 3],
    [10, 3],
    [5, 1],
    [5, 3],
    [5, 4],
    [5, 5],
    [4, 5],
    [3, 5],
    [2, 5],
    [1, 5],
    [9, 4],
    [9, 5],
    [9, 6],
    [10, 4],
    [10, 5],
    [10, 6],
    [14, 1],
    [14, 2],
    [14, 3],
    [14, 4],
    [14, 5],
    [15, 5],
    [16, 5],
    [17, 5],
    [18, 5],
    [16, 9],
    [15, 9],
    [14, 9],
    [13, 9],
    [16, 10],
    [15, 10],
    [14, 10],
    [13, 10],
    [18, 14],
    [17, 14],
    [16, 14],
    [15, 14],
    [14, 14],
    [14, 15],
    [14, 16],
    [14, 17],
    [14, 18],
    [9, 16],
    [9, 15],
    [9, 14],
    [9, 13],
    [10, 16],
    [10, 15],
    [10, 14],
    [10, 13],
    [5, 18],
    [5, 17],
    [5, 16],
    [5, 14],
    [4, 14],
    [3, 14],
    [2, 14],
    [1, 14],
    [3, 10],
    [4, 10],
    [5, 10],
    [6, 10],
    [3, 9],
    [4, 9],
    [5, 9],
    [6, 9]
  ]
}, {barricades: [[8,13],[9,13],[10,13],[11,13],[6,11],[6,10],[6,9],[6,8],[8,6],[9,6],[10,6],[11,6],[13,8],[13,9],[13,10],[13,11],[10,12],[9,12],[7,10],[7,9],[9,7],[10,7],[12,9],[12,10],[14,7],[14,8],[14,9],[14,10],[14,11],[14,12],[12,14],[11,14],[10,14],[9,14],[8,14],[7,14],[5,12],[5,11],[5,10],[5,9],[5,8],[5,7],[7,5],[8,5],[9,5],[10,5],[11,5],[12,5],[7,19],[7,18],[7,17],[8,17],[11,17],[12,17],[12,18],[12,19],[7,0],[7,1],[7,2],[8,2],[11,2],[12,2],[12,1],[12,0],[17,8],[17,7],[18,7],[19,7],[17,11],[17,12],[18,12],[19,12],[2,12],[1,12],[0,12],[2,11],[2,8],[2,7],[1,7],[0,7]],   bases: [{ pos: [1, 1], energy: 0, id:0 }, { pos: [18, 1], energy: 0,id:1 }, { pos: [18, 18], energy: 0,id:2 }, { pos: [1, 18], energy: 0,id:3 }], nodes: [{ pos: [9,0], energy: 0 },{ pos: [10, 0], energy: 0}, { pos: [9, 19], energy: 0 },{ pos: [10, 19], energy: 0 }, { pos: [0, 9], energy: 0 },{ pos: [0, 10], energy: 0 }, { pos: [19, 9], energy: 0 }, { pos: [19, 10], energy: 0 }, { pos: [9, 9], energy: 0 }, { pos: [9, 10], energy: 0 }, { pos: [10, 10], energy: 0 }, { pos: [10, 9], energy: 0 }    ]}];

function Game(gameId) {
  this.running = false;
  this.gameId = gameId;
  this.map = "";
  this.players = [];
  this.idTurn = 0;
  this.turn = 0;
  this.socketIndex;
  let mapNum = Math.floor(Math.random() * maps.length);
  this.bases = (JSON.parse(JSON.stringify(maps[mapNum].bases)));
  this.barricades = (JSON.parse(JSON.stringify(maps[mapNum].barricades)));
  this.nodes = JSON.parse(JSON.stringify(maps[mapNum].nodes));
}

games.push(new Game(games.length));
games.push(new Game(games.length));
games.push(new Game(games.length));
games.push(new Game(games.length));
games.push(new Game(games.length));
// TODO : Remove once set to use Arrays
var game = games[0];


// var game = {
//   map: "",
//   players: [],
//   idTurn: 0,
//   turn: 0,
//   bases:function(){
//     return maps[0].bases;
//   },
//   bases: maps[0].bases,
//   barricades: maps[0].barricades,
//   nodes:maps[0].nodes
// };



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
      
      
      



      if (data.id == games[data.gameId].idTurn) {

        if (data.dir == "north" && games[data.gameId].players[data.id].pos[1] > 0 && checkCollide(games[data.gameId].players[data.id].pos[0], games[data.gameId].players[data.id].pos[1] - 1, games[data.gameId])) {
          games[data.gameId].players[data.id].pos[1]--;
        }
        else if (data.dir == "east" && games[data.gameId].players[data.id].pos[0] <= 18 && checkCollide(games[data.gameId].players[data.id].pos[0] + 1, games[data.gameId].players[data.id].pos[1], games[data.gameId])) {
          games[data.gameId].players[data.id].pos[0]++;
        }
        else if (data.dir == "south" && games[data.gameId].players[data.id].pos[1] <= 18 && checkCollide(games[data.gameId].players[data.id].pos[0], games[data.gameId].players[data.id].pos[1] + 1, games[data.gameId])) {
          games[data.gameId].players[data.id].pos[1]++;
        }
        else if (data.dir == "west" && games[data.gameId].players[data.id].pos[0] > 0 && checkCollide(games[data.gameId].players[data.id].pos[0] - 1, games[data.gameId].players[data.id].pos[1], games[data.gameId])) {
          // console.log("moving west");
          games[data.gameId].players[data.id].pos[0]--;
        }
        else {
          console.log("No Direction Given? " + data.dir)
        }
        games[data.gameId].players[game.idTurn].dir = data.dir;


      }
      
     
      // console.log(game.players[0].pos)
      // console.log(game.players[1].pos)
    });

    socket.on("display", function() {
      displays.push(socket)
      broadcast("queue", games, displays);
    })


    socket.on("name", function(key) {
      let tempname = checkKey(key);
      if (tempname) {
        socket.playerName = tempname;
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
        // console.log("failleddddd")
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


function broadcast(event, data, arr) {
  arr.forEach(function(socket) {
    socket.emit(event, data);
  });
}


server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function() {
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});

function resetGame(gameToReset) {
  var energyArr = [];
  var winner = gameToReset.bases[0];
  for(var i=0;i<gameToReset.bases.length;i++){
    if(winner.energy < gameToReset.bases[i].energy){
      winner = gameToReset.bases[i];
    }
energyArr.push(gameToReset.bases[i].energy)
   }
   energyArr = energyArr.sort();
   console.log("ENERGYARR", energyArr)
   if(energyArr[energyArr.length-1] != energyArr[energyArr.length-2]){
     broadcast("endGame", {"winner":gameToReset.players[winner.id], "base": winner, "gameId": gameToReset.gameId}, sockets[gameToReset.gameId])
     broadcast("endGame", {"winner": gameToReset.players[winner.id], "base": winner, "gameId": gameToReset.gameId}, displays)
    addWin(gameToReset.players[winner.id].name)
   } else{
     console.log("WINR",gameToReset.players[winner.id])
        broadcast("endGame", {"winner": "tie", "gameId": gameToReset.gameId}, sockets[gameToReset.gameId])
     broadcast("endGame", {"winner": "tie", "gameId": gameToReset.gameId}, displays)
   }
  
  gameToReset.players.length = 0;
  sockets[gameToReset.gameId].length = 0;

  games[gameToReset.gameId] = new Game(games.length);
  if (queueSockets.length >= PLAYER_NUMBER) {
    startGame(queueSockets)
  }
  else {
    gameToReset.running = false;
    console.log("GAME LENGTH " + gameToReset.players.length)
  }
  console.log("end of reset", gameToReset.players[0]);
}

function startGame(queued) {

  let ind;

  for (let i = 0; i < games.length; i++) {
    if (!games[i].running) {
      ind = i;
      break;
    }
  }

  console.log(games[ind])
  games[ind].gameId = ind;

  for (var i = 0; i < PLAYER_NUMBER; i++) {
    var oi = queued.shift();
    sockets[ind].push(oi);
    console.log(oi.playerName)
    games[ind].players.push(new Player(oi.playerName, games[ind].players.length));
    console.log(games[ind].players)
    // console.log(queued)
  }

  console.log("This is ind", ind);
  console.log("beginning of startGame", games[ind]);

  games[ind].idTurn = 0;
  games[ind].turn = 0;
  games[ind].running = true;


  // TODO: 
  for (let i = 0; i < games[ind].nodes.length; i++) {
    games[ind].nodes[i].x = games[ind].nodes[i].pos[0]
    games[ind].nodes[i].y = games[ind].nodes[i].pos[1]
  }


  // for (var i = 0; i < PLAYER_NUMBER; i++) {
  //   var oi = queued.shift();
  //   games[ind].sockets.push(oi);
  //   console.log(oi.playerName)
  //   games[ind].players.push(new Player(oi.playerName, games[ind].players.length));
  //   console.log(games[ind].players)
  //   // console.log(queued)
  // } // Im gonna add wins and all of that good stuff
  console.log("someone connected");
  broadcast("queue", "There are " + games[ind].players.length + " people connencted.", sockets[ind]);
  broadcast("queue", games, displays);

  broadcast("gameStart", games[ind], sockets[ind])
  // for (var i = 0; i < game.players.length; i++) {
  console.log("this is posses", posses[i]);
  // game.players[i].pos = posses[i]
  // }


  console.log("before loop starts", games[ind].players[0]);
  var loop = setInterval(function() {
    // console.log("LOOPING" + games[ind].players.length + " should be above zero, algong with " + sockets.length + ", but " + queueSockets.length + " should be zero.")
    if (games[ind].turn >= 200) {
      clearInterval(loop)
      resetGame(games[ind])
    }
    else {

      games[ind].turn++;
      game.idTurn = games[ind].turn % games[ind].players.length;
      console.log("GAMEID " + game.idTurn)
      for (var i = 0; i < game.players.length; i++) {

        games[ind].players[i].x = games[ind].players[i].pos[0];
        games[ind].players[i].y = games[ind].players[i].pos[1];
        // if(game.players.pos)
        for (let j = 0; j < game.players.length; j++) {
          if (j != i) {
                    if (games[ind].players[j].pos[1] == games[ind].bases[i].pos[1] && games[ind].players[j].pos[0] == games[ind].bases[i].pos[0]) {
          games[ind].players[j].energy += games[ind].bases[i].energy
         games[ind].bases[i].energy= 0;
        }
            


            if (games[ind].players[i].pos[1] == games[ind].players[j].pos[1] && game.players[i].pos[0] == game.players[j].pos[0]) {
              if (games[ind].players[i].energy > games[ind].players[j].energy) {
                games[ind].players[i].energy = Math.ceil((games[ind].players[i].energy + games[ind].players[j].energy) / 2)
                games[ind].players[j].energy = Math.floor((games[ind].players[i].energy + games[ind].players[j].energy) / 2)
              }
              else if (games[ind].players[i].energy < games[ind].players[j].energy) {
                games[ind].players[j].energy = Math.ceil((games[ind].players[i].energy + games[ind].players[j].energy) / 2)
                games[ind].players[i].energy = Math.floor((games[ind].players[i].energy + games[ind].players[j].energy) / 2)
              }
            }
          }


        }
        
        
        if (games[ind].players[i].pos[1] == games[ind].bases[i].pos[1] && games[ind].players[i].pos[0] == games[ind].bases[i].pos[0]) {
          games[ind].bases[i].energy += games[ind].players[i].energy
          games[ind].players[i].energy = 0;
        } else {
          console.log(games[ind].players[i].pos + " BASE POS " + games[ind].bases[i].pos)
        }

      }

      games[ind].myBot = games[ind].players[games[ind].idTurn];


      if (games[ind].turn % 3 == 0) {
        for (var i = 0; i < games[ind].nodes.length; i++) {
          games[ind].nodes[i].energy++;
          // console.log(game.nodes[i])
        }
      }

      for (var i = 0; i < games[ind].nodes.length; i++) {
        if (games[ind].players[games[ind].idTurn].pos[1] == games[ind].nodes[i].pos[1] && games[ind].players[games[ind].idTurn].pos[0] == games[ind].nodes[i].pos[0]) {
          games[ind].players[games[ind].idTurn].energy += games[ind].nodes[i].energy;
          games[ind].nodes[i].energy = 0;
        }
      }
console.log(sockets[ind].length)
games[ind].idTurn = games[ind].turn % games[ind].players.length
      broadcast("draw", games, displays);
      console.log("SCOKETs" + sockets)
      sockets[ind][games[ind].idTurn].emit("update", games[ind]);
      console.log("EMMITING TO " + games[ind].idTurn + " ")

    }
    
  }, 120)
}

function addWin(userName){
for(let thing in data){
  if(data[thing].username == userName){
    data[thing].wins++;
    break;
  }
}

    fs.writeFileSync("database.json", JSON.stringify(data, null, 2))
}



function checkKey(key) {
  let arr = Object.keys(data)
  for (let i = 0; i < arr.length; i++) {
    if (key == arr[i]) {
      // tempName = temp[key].username;
      return data[key].username;
    }
  }
  return false;

}


function checkCollide(x, y, game) {
  for (var i = 0; i < game.barricades.length; i++) {
    if (game.barricades[i][0] == x && game.barricades[i][1] == y) {
      return false;   
    }
  }
  return true;
}
