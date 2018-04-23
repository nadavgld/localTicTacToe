var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var request = require('request');

var users = [];
var waitingGames = [];
var games = [];

var _gameid = 1;

app.use(express.static('public'))

app.get('/', function (req, res) {
  res.sendFile(__dirname + 'public/index.html');
});

io.on('connection', function (socket) {
  users.push(socket);
  console.log('a user connected');

  socket.on('disconnect', function () {
    var userIdx = findUserIndexById(socket.id);

    if (userIdx > 0)
      users.splice(userIdx, 1);

    broadcastUsers();
    console.log('user disconnected');
  });

  socket.on('login', function (username) {
    var userIdx = findUserIndexById(socket.id);
    var user = users[userIdx];
    user.username = username;

    socket.emit('moveToLobby', { id: user.id });
    broadcastUsers();

  });

  socket.on('askGame', function (data) {
    waitingGames.push({
      id: _gameid,
      p1: data.host,
      p2: data.enemy,
      turns: 0,
      map: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      checkBoard: function (lastPlayer) {

        //Winning check
        if (hasWinner(this.map)) 
          updateGameOver(this.p1, this.p2, lastPlayer);
        
        else {


          //Board if full check
          var isFull = true;
          for (var i = 1; i < this.map.length; i++) {
            if (this.map[i] == 0)
              isFull = false;
          }

          if (isFull)
            updateDraw(this.p1, this.p2);

        }
      }
    });

    users[findUserIndexById(data.enemy)].emit('popGame', { host: users[findUserIndexById(data.host)].username, gameid: _gameid });

    _gameid++;

  });

  socket.on('acceptGame', (data) => {
    console.log(data);
    var id = data.gameid;
    moveFromWaiting(id);
  });

  socket.on('playMove', (data) => {
    var currentGame = games[findGameIndexById(data.gameid)];
    currentGame.turns++;

    var squareNum = parseInt(data.square.split("s")[1]);
    updateOtherPlayer(currentGame, data.moveMaker, data.square);

    setTimeout(() => {
      updateGameMap(currentGame, data.moveMaker, squareNum);
    }, 20);

  })

});

http.listen(3000, '0.0.0.0', function () {
  console.log('listening on *:3000');
});

function hasWinner(map) {

  console.log(map);
  if (trioCheck(map, 1, 2, 3) || trioCheck(map, 4, 5, 6) || trioCheck(map, 7, 8, 9) //ROWS
    || trioCheck(map, 1, 4, 7) || trioCheck(map, 2, 5, 8) || trioCheck(map, 3, 6, 9) //COLS
    || trioCheck(map, 1, 5, 9) || trioCheck(map, 3, 5, 7) //CROSS
  )

    return true;

  return false;
}

function trioCheck(map, a, b, c) {
  return map[a] == map[b] && map[a] == map[c] && map[b] == map[c] && map[a] != 0;
}

function findUserIndexById(id) {
  for (let i = 0; i < users.length; i++) {
    if (users[i].id == id)
      return i;
  }

  return -1;
}

function findGameIndexById(id) {
  for (let i = 0; i < games.length; i++) {
    if (games[i].id == id)
      return i;
  }

  return -1;
}


function broadcastUsers() {
  io.emit('onlineUsersUpdate', {
    amountOfUsers: users.length,
    users:
      {
        usernames: users.map(u => u.username),
        ids: users.map(u => u.id)
      }
  });
}

function moveFromWaiting(id) {
  for (var i = 0; i < waitingGames.length; i++) {
    var wg = waitingGames[i];
    console.log(wg.id);
    if (wg.id == id) {
      console.log(`moving ${id}`)
      waitingGames.splice(i, 1);
      games.push(wg);

      var p1 = users[findUserIndexById(wg.p1)];
      var p2 = users[findUserIndexById(wg.p2)];


      console.log(p1.username);
      console.log(p2.username);

      var turn = Math.random() > 0.5;

      p1.emit('startAGame', {
        gameid: id,
        enemy_username: p2.username,
        enemy_id: p2.id,
        turn: turn,
        symbol: turn ? 'X' : 'O',
        enemy_symbol: !turn ? 'X' : 'O',
      });

      p2.emit('startAGame', {
        gameid: id,
        enemy_username: p1.username,
        enemy_id: p1.id,
        turn: !turn,
        symbol: !turn ? 'X' : 'O',
        enemy_symbol: turn ? 'X' : 'O',
      });

      return;
    }
  }
}

function updateOtherPlayer(game, mover, square) {
  var other = (game.p1 == mover) ? users[findUserIndexById(game.p2)] : other = users[findUserIndexById(game.p1)];

  other.emit('otherMoveUpdate', { square: square });

}

function updateGameMap(game, maker, idx) {
  var player = game.p1 == maker ? 1 : 2;

  game.map[idx] = player;
  game.checkBoard(player);
}

function updateDraw(p1, p2) {
  var p1 = users[findUserIndexById(p1)];
  var p2 = users[findUserIndexById(p2)];

  p1.emit('gameDraw');
  p2.emit('gameDraw');
}

function updateGameOver(p1, p2, winner) {
  var p1 = users[findUserIndexById(p1)];
  var p2 = users[findUserIndexById(p2)];

  var result = winner == 1;
  p1.emit('gameOver', { winner: result });
  p2.emit('gameOver', { winner: !result });
}