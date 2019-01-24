const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const axios = require("axios");
const port = process.env.PORT || 4001;
const index = require("./routes/index");
const app = express();
app.use(index);
const server = http.createServer(app);
const io = socketIo(server);


let log = [];
let status = ""
let playerCount = 0
let playerOne = {attack:10, defense: 10};
let playerOneMove = ""
let moveAvailOne = true
let damage1 = 0
let playerTwo = {attack:11, defense: 9};
let playerTwoMove = ""
let moveAvailTwo = true
let damage2 = 0
let players = []
let playerObjs = []
let sockets = []
let activeGame = false

function sendLog() {
  if(log.length > 12){
    log = log.slice(-12)
  }
  io.emit("battleLog", {log: log})  
  log = []
}

function newGame() {
  log = []
  if(players.length < 2){
    log.push("There is no one in the arena for you to fight, surely someone will come along soon.")
    activeGame = false
  }
  else{
    log.push("A new fight will begin as soon as " + players[0] + " and " + players[1] + " choose their moves!")
    activeGame = true
  }
  sendLog()
  io.emit("newGame", playerObjs)
}

function endGame(winner, loser){
  var index = playerObjs.findIndex(function(element){
    return element === loser
  })
  players.splice(index, 1)
  playerObjs.splice(index,1)
  players.push(loser.firstName)
  playerObjs.push(loser)

  log.push(winner + " defeated " + loser + " in the arena!")
  sendLog()
  setTimeout(newGame,5000)
}

function calcDamage(player, move) {
  console.log(player, move)
  var self
  var enemy
  var enemyDefenseRoll = ((playerTwo.defense * (Math.floor(Math.random() * 6) + 5)) * 0.01)
  var damage = 0
  
  
  var roll = Math.floor(Math.random() * 101)
  console.log("Success Roll: " + roll)
  console.log("EnemySuccessRoll: " + enemyDefenseRoll)
  if(player === "Player 1"){
    self = playerOne
    enemy = playerTwo
    enemyDefenseRoll = enemyDefenseRoll 
  }
  else if(player === "Player 2"){
    self = playerTwo
    enemy = playerOne
    enemyDefenseRoll = enemyDefenseRoll
  }

  if(move === "slash" && roll >= 25){
    damage = (self.attack - (enemy.defense * enemyDefenseRoll)).toFixed(2)
    console.log("Damage: " + damage)
    return damage
  }
  else if(move === "pierce" && roll >= 50){
    damage = ((1.5 * self.attack) - (enemy.defense * enemyDefenseRoll)).toFixed(2)
    console.log("Damage: " + damage)
    return damage
  }
  else if(move === "crush" && roll >= 75){
    damage = ((2 * self.attack) - (enemy.defense * enemyDefenseRoll)).toFixed(2)
    console.log("Damage: " + damage)
    return damage
  }
  else{
    console.log("No Damage: " + damage)
    return damage
  }
}

function handleChoice(player, move) {

  if(player === "Player 1" && moveAvailOne === true){
    playerOneMove = move
    damage1 = calcDamage(player,move)
    console.log(damage1)
    moveAvailOne = false
  }
  else if(player === "Player 2" && moveAvailTwo === true){
    playerTwoMove = move
    damage2 = calcDamage(player,move)
    console.log(damage2)
    moveAvailTwo = false
  }
  if(playerOneMove && playerTwoMove) {
    log.push("Player 1 " + " chose to " + playerOneMove + " the opponent.")
    if(damage1 === 0){
      log.push("Player 1 missed their attack that turn.")
    }
    else{
      log.push("Player 1 did " + damage1 + " damage!")
    }
    log.push("Player 2 " + " chose to " + playerTwoMove + " the opponent.")
    if(damage2 === 0){
      log.push("Player 2 missed their attack that turn.")
    }
    else{
      log.push("Player 2 did " + damage2 + " damage!")
    }
    sendLog()
    io.emit("results", {damage1: damage1, damage2: damage2})
    playerOneMove = ""
    playerTwoMove = ""
    moveAvailOne = true
    moveAvailTwo = true
    damage1 = 0
    damage2 = 0
  }
}

function joinLobby(socket, obj) {
  if(!players.length){
    log.push("There is no one in the arena for you to fight, surely someone will come along soon.")
  }
  sendLog() 
  var playerName = obj.firstName
  players.push(playerName)
  playerObjs.push(obj)
  sockets.push(socket)
  console.log(players.length)
  io.emit("response", {status: status, players: players, playerName: playerName})
  if(players.length >= 2 && activeGame === false){
    newGame()
  }
}

function disconnect(socket) {
  var index = sockets.findIndex(function(element){
    return element === socket
  })
  players.splice(index, 1)
  playerObjs.splice(index, 1)
  sockets.splice(index,1)
  if(index = 0 || 1){
    newGame()
  }
  console.log("bye")
  io.emit("response", {players: players})
}

io.on("connection", socket => {
  var thisSocket = socket
  console.log("New client connected")

  socket.on("newPlayer", data => {
    console.log("New Player!")
    var playerObj = data
    joinLobby(thisSocket, playerObj)
  })
  

  socket.on("choice", data => {
    if(players.length >= 2){
      handleChoice(data.player, data.choice)
    }
    else{
      log.push(data.player + " chose to " + data.choice + (players.length<2 ? " against nobody in particular, there is no longer anyone here...weird.":"."))
      sendLog()
    }
    
  })

  socket.on("winner", data => {
    console.log(data)
    var winner = data.winner
    var loser = data.loser
    endGame(winner, loser)
  })

  socket.on("disconnect", function() {
    console.log("Client disconnected")
    disconnect(thisSocket)
  });
});




server.listen(port, () => console.log(`Listening on port ${port}`));