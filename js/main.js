/*
JavaScript HitPlane
Code: https://github.com/sqmscm/hitplane
Demo: https://sqmscm.github.io/hitplane
*/
const WHITE_SIDE = 0
const BLACK_SIDE = 1
const BARRIER = 2
const EMPTY_CELL = -2
const BLUR_BARRIER = -1
//main
var main = function() {
  var canvas = document.getElementById('viewer');
  var images = {
    barrier: "imgs/barrier.png",
    barrier2: "imgs/barrier_alpha.png",
    piece1: "imgs/piece1.png",
    piece2: "imgs/piece2.png",
  }
  var game = Game(images, function() {

    var rows = 4
    var cols = 4
    var cell_width = parseInt(canvas.width / cols)
    var cell_height = parseInt(canvas.height / rows)
    var board_color_1 = "#779557"
    var board_color_2 = "#ececd0"

    var white1 = Piece(game.images["piece1"], cell_width, cell_height, WHITE_SIDE)
    var white2 = Piece(game.images["piece1"], cell_width, cell_height, WHITE_SIDE)
    var black1 = Piece(game.images["piece2"], cell_width, cell_height, BLACK_SIDE)
    var black2 = Piece(game.images["piece2"], cell_width, cell_height, BLACK_SIDE)
    var blur_barrier = Piece(game.images["barrier2"], cell_width, cell_height, BLUR_BARRIER)

    var cells = []
    var barriers = []
    var states = Array(rows * cols).fill(EMPTY_CELL)

    game.cursor_x = 0
    game.cursor_y = 0
    game.curr_side = 0
    game.is_placing_piece = true

    game.move = function(piece, location) {
      x = location[0]
      y = location[1]
      if (piece.side != BLUR_BARRIER) {
        if (piece.board_y >= 0 && piece.board_x >= 0) {
          states[piece.board_y * rows + piece.board_x] = EMPTY_CELL
        }
        states[y * rows + x] = piece.side
      }
      piece.x = x * cell_width
      piece.y = y * cell_height
      piece.board_x = x
      piece.board_y = y
      // log(states)
    }

    game.getState = function(x, y) {
      return states[y * rows + x]
    }

    game.is_available_barrier_pos = function(x, y) {
      if (game.getState(x, y) == EMPTY_CELL) {
        return true
      }
      return false
    }

    game.validate_move = function(piece, target_x, target_y) {
      // log(target_x + " " + target_y + " " + piece.board_x + " " + piece.board_y)
      if (piece.board_x != target_x || piece.board_y != target_y) {
        return true
      }
      return false
    }

    // callback when a piece is released
    game.release_piece = function(piece) {
      board_x = parseInt((piece.x + piece.width / 2) / cell_width)
      board_y = parseInt((piece.y + piece.height / 2) / cell_height)
      if (game.validate_move(piece, board_x, board_y)) {
        game.move(piece, [board_x, board_y])
        game.is_placing_piece = false
      }
    }

    game.get_is_piece_movable = function(piece) {
      if (piece.side == game.curr_side && game.is_placing_piece) {
        return true
      }
      return false
    }

    // use to put the barriers
    game.cell_click = function() {
      log("current state = " + states[game.cursor_y * rows + game.cursor_x])
      log(states)
      if (game.is_placing_piece || states[game.cursor_y * rows + game.cursor_x] != EMPTY_CELL) {
        return
      }
      new_barrier = Piece(game.images["barrier"], cell_width, cell_height, 2)
      game.move(new_barrier, [game.cursor_x, game.cursor_y])
      barriers.push(new_barrier)
      game.is_placing_piece = true
    }

    // init the cells
    var curr_cell_x = 0
    var curr_cell_y = 0
    for (var i = 0; i < rows; i++) {
      for (var j = 0; j < cols; j++) {
        var color;
        if ((i + j) % 2 == 0) {
          color = board_color_1
        } else {
          color = board_color_2
        }
        curr_cell = Cell(curr_cell_x, curr_cell_y, cell_width, cell_height, color)
        game.enableClick(curr_cell, game.cell_click)
        cells.push(curr_cell)
        curr_cell_x += cell_width
      }
      curr_cell_y += cell_height
      curr_cell_x = 0
    }

    // move pieces to initial places
    game.move(white1, [cols - 1, Math.round(2 * rows / 3 - 1)])
    game.move(white2, [Math.round(2 * cols / 3 - 1), rows - 1])
    game.move(black1, [Math.round(cols / 3), 0])
    game.move(black2, [0, Math.round(rows / 3)])

    game.render = function() {

      // draw the game board
      cells.forEach((item, i) => {
        game.draw(item)
      });

      //draw the barriers
      barriers.forEach((item, i) => {
        game.draw(item)
      });

      //draw the pieces
      game.draw(white1)
      game.draw(white2)
      game.draw(black1)
      game.draw(black2)

      game.curr_side = barriers.length % 2

      if (!game.is_placing_piece && game.is_available_barrier_pos(game.cursor_x, game.cursor_y)) {
        game.move(blur_barrier, [game.cursor_x, game.cursor_y])
        game.draw(blur_barrier)
      }
    }

    // get mouse location on board
    canvas.addEventListener('mousemove', function(event) {
      var ret = game.getMousePos(event)
      game.cursor_x = parseInt(ret['x'] / cell_width)
      game.cursor_y = parseInt(ret['y'] / cell_height)
      // log(game.cursor_x + " " + game.cursor_y)
    });

    game.enableDrag(white1, "plane", game.get_is_piece_movable, game.release_piece)
    game.enableDrag(white2, "plane", game.get_is_piece_movable, game.release_piece)
    game.enableDrag(black1, "plane", game.get_is_piece_movable, game.release_piece)
    game.enableDrag(black2, "plane", game.get_is_piece_movable, game.release_piece)
    //Start running
    game.updateFPS();
    game.running();
  });
  main.restLevel = function() {
    if (game.fps < 1)
      game.updateFPS(120);
    game.end();
    main();
  }
}
main();
