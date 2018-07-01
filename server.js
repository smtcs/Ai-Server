/*
To push to github:
git status  // tells current status of files
git add // Adds changed files to record.  -A will add all files
git commit -m "message" // commits changes to be pushed
git push // pushes all changes to github
*/

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
var gameData = [{},{},{},{},{}];

var data = JSON.parse(fs.readFileSync("database.json"));
var maps = JSON.parse(fs.readFileSync("maps.json"))

var replay = JSON.parse(fs.readFileSync("replay.json"))
// console.log(replay)

      // fs.writeFileSync("database.json", JSON.stringify(data, null, 2))
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

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


//Game function
function Game(gameId) {
  this.totalTurns = 300; //This should alawys be at least 15 & a multiple of the player number!
  this.running = false;
  this.gameId = gameId;
  this.map = "";
  this.players = [];
  this.idTurn = 0;
  this.turn = 0;
  this.socketIndex;
  let mapNum = Math.floor(Math.random() * maps.length);
  this.mapNumber = mapNum;
  // mapNum = 1;
  this.bases = (JSON.parse(JSON.stringify(maps[mapNum].bases)));
  this.barricades = (JSON.parse(JSON.stringify(maps[mapNum].barricades)));
  this.nodes = JSON.parse(JSON.stringify(maps[mapNum].nodes));
}
//create 5 instances of the game function
games.push(new Game(games.length));
games.push(new Game(games.length));
games.push(new Game(games.length));
games.push(new Game(games.length));
games.push(new Game(games.length));


io.on('connection', function(socket) {
// When a new player is registered, add them to the database
    socket.on("newPlayer", function(obj) {
      data[obj.key] = { username: obj.username, wins: 0, permName: false }
      fs.writeFileSync("database.json", JSON.stringify(data, null, 2))
    })

    /* @Desc: Takes new direction from player and determines new position
     * @Params: data{} - dir(srt): direction chosen by player - name(str): name of player sending data
     */
socket.on("rerunGame", function(num){
  replay.games[num].map = maps[replay.games[num].mapNum];
  broadcast("rerunGameData", replay.games[num], displays)
})
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
     
          games[data.gameId].players[data.id].pos[0]--;
        }

        games[data.gameId].players[games[data.gameId].idTurn].dir = data.dir;

      }
      
      checkBase(data.gameId)
      
    });

    socket.on("display", function() {
      displays.push(socket)
let stringArr = [];
let tempStr  ="";
    for(let thing in replay.games){
    
      tempStr = "";
      for(let i in replay.games[thing].players){
        tempStr += replay.games[thing].players[i].name + " ";
      }
        if(tempStr.length > 0){
stringArr.push(tempStr);
      }
      }

      broadcast("replayNames", stringArr, displays)
      broadcast("queue", games, displays);
    })
    socket.on("name", function(key) {
      let tempname = checkKey(key);
      if (tempname) {
        socket.playerName = tempname;
        queueSockets.push(socket);

        if (queueSockets.length >= PLAYER_NUMBER && !gameRunning) {
          /* 1. Shifts queud players into sockets 
           * 2. Creates Players in game object
           * 3. Starts running game
           * 4. sets gameRunning to true
           */
          startGame(queueSockets);
        }
      }

    })

});

//Pass teh array to go through as a parameter.
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
  // gameData[gameToReset.gameId].turns[0]
  console.log("the" + JSON.stringify(gameData[gameToReset.gameId]))
  
replay.games.push(JSON.parse(JSON.stringify(gameData[gameToReset.gameId])));
// console.log("oiii" + JSON.stringify(newGameData));
// console.log("newgamedadta" + newGameData)
  fs.writeFileSync("replay.json", JSON.stringify(replay))
  gameData[gameToReset.gameId] = {};
  var energyArr = [];
  var winner = gameToReset.bases[0];
  for(var i=0;i<gameToReset.bases.length;i++){
    if(winner.energy < gameToReset.bases[i].energy){
      winner = gameToReset.bases[i];
    }
energyArr.push(gameToReset.bases[i].energy)
   }
   energyArr = energyArr.sort();
   if(energyArr[energyArr.length-1] != energyArr[energyArr.length-2]){
     broadcast("endGame", {"winner":gameToReset.players[winner.id], "base": winner, "gameId": gameToReset.gameId}, sockets[gameToReset.gameId])
     broadcast("endGame", {"winner": gameToReset.players[winner.id], "base": winner, "gameId": gameToReset.gameId}, displays)
    addWin(gameToReset.players[winner.id].name)
   } else{
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
  console.log(gameData)
}

function startGame(queued) {

  let ind;

  for (let i = 0; i < games.length; i++) {
    if (!games[i].running) {
      ind = i;
      break;
    }
  }
  games[ind].gameId = ind;
  for (var i = 0; i < PLAYER_NUMBER; i++) {
    var oi = queued.shift();
    sockets[ind].push(oi);
    console.log(oi.playerName)
    games[ind].players.push(new Player(oi.playerName, games[ind].players.length));
  }


  games[ind].idTurn = 0;
  games[ind].turn = 0;
  games[ind].running = true;

  console.log("someone connected");
  broadcast("queue", "There are " + games[ind].players.length + " people connencted.", sockets[ind]);
  broadcast("queue", games, displays);
  broadcast("gameStart", games[ind], sockets[ind])
  console.log("this is posses", posses[i]);
  console.log("before loop starts", games[ind].players[0]);
  gameData[ind].mapNum = games[ind].mapNumber;
  gameData[ind].turns = [];
  gameData[ind].players = games[ind].players;
  
  
  var loop = setInterval(function() {
    // console.log("LOOPING" + games[ind].players.length + " should be above zero, algong with " + sockets.length + ", but " + queueSockets.length + " should be zero.")
    if (games[ind].turn == games[ind].totalTurns + PLAYER_NUMBER) {
      broadcast("draw", games, displays);
      
      
      clearInterval(loop)
      resetGame(games[ind])

    }
    else {

      games[ind].idTurn = games[ind].turn % games[ind].players.length



let posGameData=  games[ind].players[games[ind].idTurn].pos;
      gameData[ind].turns.push(JSON.parse(JSON.stringify(posGameData)));

// console.log(gameData[ind].turns[games[ind].idTurn])

  


      for (var i = 0; i < games[ind].players.length; i++) {

        for (let j = 0; j < games[ind].players.length; j++) {
          if (j != i) {
            if (games[ind].players[i].pos[1] == games[ind].players[j].pos[1] && games[ind].players[i].pos[0] == games[ind].players[j].pos[0]) {
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
        
checkBase(ind);

      }
      games[ind].myBot = games[ind].players[games[ind].idTurn];
      games[ind].myBase = games[ind].bases[games[ind].idTurn];

      if (games[ind].turn % 3 == 0) {
        for (var i = 0; i < games[ind].nodes.length; i++) {
          games[ind].nodes[i].energy++;
        }
      }
      for (var i = 0; i < games[ind].nodes.length; i++) {
        if (games[ind].players[games[ind].idTurn].pos[1] == games[ind].nodes[i].pos[1] && games[ind].players[games[ind].idTurn].pos[0] == games[ind].nodes[i].pos[0]) {
          games[ind].players[games[ind].idTurn].energy += games[ind].nodes[i].energy;
          games[ind].nodes[i].energy = 0;
        }
      }
      broadcast("draw", games, displays);
      sockets[ind][games[ind].idTurn].emit("update", games[ind]);
      // console.log("EMMITING TO " + games[ind].idTurn + " ")

          games[ind].turn++;
    }
    
  }, 50)
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

function checkBase(gameId){
        for(var i=0;i<games[gameId].players.length;i++){
        if (games[gameId].players[i].pos[1] == games[gameId].bases[i].pos[1] && games[gameId].players[i].pos[0] == games[gameId].bases[i].pos[0]) {
          games[gameId].bases[i].energy += games[gameId].players[i].energy
          games[gameId].players[i].energy = 0;
        }

          for(var j=0;j<games[gameId].players.length;j++){
            if(j != i){
                        if (games[gameId].players[j].pos[1] == games[gameId].bases[i].pos[1] && games[gameId].players[j].pos[0] == games[gameId].bases[i].pos[0]) {
   
          games[gameId].players[j].energy += games[gameId].bases[i].energy
         games[gameId].bases[i].energy= 0;
         
        }
          }
          }
        }
}