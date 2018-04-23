var user = {};
var users = {};

var game = {};

var socket;

$(function () {

    $(".cont").hide();
    $("#loginContainer").show();

    socket = io();

    socket.on('moveToLobby', function (response) {
        user.id = response.id;

        $("#loginContainer").hide();
        $("#gameContainer").show();

        $("#welcomeUser").text(user.username);
    });

    socket.on('onlineUsersUpdate', function (response) {
        updateOnlineAmout(response.amountOfUsers, response.users);
        users = response.users;
    });

    socket.on('popGame', (response) => {
        $("#invList").append($("<li>").html(`
            <div>
                <button class="btn btn-success accept-btn" id="btn_${response.gameid}" onclick=acceptGame("${response.gameid}")> Play with ${response.host} </button>
            </div>
        `));
    })

    socket.on('startAGame', (response) => {
        $("#gameContainer").hide();
        $("#game").show();
        $(".square").text('');

        game = response;
        $("#gameTitle").text(`You VS ${game.enemy_username}`);

        var turnText = game.turn ? user.username + ` (${game.symbol})` : game.enemy_username + ` (${game.enemy_symbol})`;
        $("#turnText").text(turnText);

    });

    socket.on('otherMoveUpdate', (response) => {
        var squareId = response.square;

        $("#" + squareId).text(game.enemy_symbol);

        game.turn = true;
        var turnText = game.turn ? user.username + ` (${game.symbol})` : game.enemy_username + ` (${game.enemy_symbol})`;
        $("#turnText").text(turnText);

    });

    socket.on('gameDraw', (response) => {
        alert("DRAW!");
        game = {};

        $("#game").hide();
        $("#gameContainer").show();

        setDisabled($(".accept-btn"), false);
        setDisabled($(".start-btn"), false);
        

    });

    socket.on('gameOver', (response) => {

        var winner = response.winner;

        if(winner){
            alert("Great! you won.");
        }
        else{
            alert("Boohoo! looser :(");
        }

        game = {};

        $("#game").hide();
        $("#gameContainer").show();

        setDisabled($(".accept-btn"), false);
        setDisabled($(".start-btn"), false);
        

    });

    $("#loginBtn").click(() => {
        var username = $("#logUser").val();

        if (username.length == 0)
            return;

        user.username = username;
        socket.emit("login", username);
    })
});

function updateOnlineAmout(amount, users) {

    if (socket == null)
        return;

    $("#onlineAmount").text(amount);

    $("#userList").html('');

    for (var i = 0; i < users.usernames.length; i++) {
        if (users.ids[i] == user.id || users.usernames[i] == null)
            continue;

        $("#userList").append($("<li>").html(`
            <div>
                <button class="btn btn-danger start-btn" onclick=startGame("${user.id}","${users.ids[i]}")> Play </button>
                <span class="userList-user"> ${users.usernames[i]} </span>
            </div>
        `));
    }
}

function acceptGame(gameid) {
    setDisabled($(".accept-btn"), true);
    $("#btn_" + gameid).remove();

    socket.emit("acceptGame", { gameid: gameid });
}

function startGame(host, enemy) {
    setDisabled($(".start-btn"), true);

    socket.emit("askGame", { host: host, enemy: enemy });
}

function setDisabled(elem, bool) {
    if (bool)
        elem.attr('disabled', 'disabled');

    else
        elem.removeAttr('disabled');

}


$(".square").click(e => {
    var square = $(e.target);
    if (game.turn && square.text() == '') {
        square.text(game.symbol);

        game.turn = false;
        var turnText = game.turn ? user.username + ` (${game.symbol})` : game.enemy_username + ` (${game.enemy_symbol})`;
        $("#turnText").text(turnText);

        socket.emit('playMove', { gameid: game.gameid, moveMaker: user.id, square: square.attr('id') });
    }
});