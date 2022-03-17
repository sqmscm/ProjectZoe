/*
Project Zoe
https://github.com/sqmscm/ProjectZoe
*/
const WHITE_SIDE = 0
const BLACK_SIDE = 1
const BARRIER = 2
const EMPTY_CELL = -2
const BLUR_BARRIER = -1
window.cols = 4
window.rows = 4
//main
var main = function() {
  var canvas = document.getElementById('viewer');
  var context = canvas.getContext('2d');
  var images = {
    barrier: "imgs/barrier.png",
    barrier2: "imgs/barrier_alpha.png",
    piece1: "imgs/piece1.png",
    piece2: "imgs/piece2.png",
  }
  var game = Game(images, function() {

    var rows = window.rows
    var cols = window.cols
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
    var activities = [
      []
    ]
    var states = Array(rows * cols).fill(EMPTY_CELL)

    game.cursor_x = 0
    game.cursor_y = 0
    game.curr_side = 0
    game.active_traceback = null
    game.is_placing_piece = true
    game.last_moved_piece = null
    game.last_placed_barrier = null
    game.latest_states = {}

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
      piece.prev_x = piece.board_x
      piece.prev_y = piece.board_y
      piece.board_x = x
      piece.board_y = y
      // log(states)
    }

    //place without other judges on properties
    game.place = function(piece, location) {
      x = location[0]
      y = location[1]
      piece.x = x * cell_width
      piece.y = y * cell_height
      piece.board_x = x
      piece.board_y = y
    }

    game.getState = function(x, y) {
      return states[y * rows + x]
    }

    game.is_available_barrier_pos = function(x, y) {
      dx = game.last_moved_piece.board_x - x
      dy = game.last_moved_piece.board_y - y
      thresh = dx * dx + dy * dy
      if (game.getState(x, y) == EMPTY_CELL && thresh > 0 && thresh < 3) {
        return true
      }
      return false
    }

    game.get_legal_moves = function(piece) {
      var moves = new Set()
      dx = [-1, -1, 0, 1, 1, 1, 0, -1]
      dy = [0, 1, 1, 1, 0, -1, -1, -1]
      for (var i = 0; i < dx.length; i++) {
        nx = piece.board_x + dx[i]
        ny = piece.board_y + dy[i]
        while (nx < cols && ny < rows && nx >= 0 && ny >= 0 &&
          game.getState(nx, ny) == EMPTY_CELL) {
          moves.add(`${nx}#${ny}`)
          nx += dx[i]
          ny += dy[i]
        }
      }
      return moves
    }

    game.validate_move = function(piece, target_x, target_y) {
      // log(target_x + " " + target_y + " " + piece.board_x + " " + piece.board_y)
      curr_x = piece.board_x
      curr_y = piece.board_y
      legal_moves = game.get_legal_moves(piece)
      // log(legal_moves)
      if (legal_moves.has(`${target_x}#${target_y}`)) {
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
        game.last_moved_piece = piece
        game.is_placing_piece = false
      } else {
        game.move(piece, [piece.board_x, piece.board_y])
      }
    }

    game.get_is_piece_movable = function(piece) {
      if (piece.side == game.curr_side && game.is_placing_piece && game.get_legal_moves(piece).size > 0) {
        return true
      }
      return false
    }

    // use to put the barriers
    game.cell_click = function() {
      // log("current state = " + states[game.cursor_y * rows + game.cursor_x])
      // log(states)
      if (game.is_placing_piece || !game.is_available_barrier_pos(game.cursor_x, game.cursor_y)) {
        return
      }
      // log(`creating b at ${game.cursor_x} ${game.cursor_y}, last ${game.last_moved_piece.board_x} ${game.last_moved_piece.board_y}`)
      new_barrier = Piece(game.images["barrier"], cell_width, cell_height, BARRIER)
      game.move(new_barrier, [game.cursor_x, game.cursor_y])
      barriers.push(new_barrier)
      game.is_placing_piece = true
      game.last_placed_barrier = new_barrier
      //update info panel
      game.updateInfo()
    }

    // restore a state
    game.restore = function(trace_state) {
      w1_drawed = false
      b1_drawed = false
      barrier_idx = 0
      for (var i = 0; i < rows; i++) {
        for (var j = 0; j < cols; j++) {
          cell_state = trace_state[i * cols + j]
          switch (cell_state) {
            case WHITE_SIDE:
              // log(`white ${cell_state} ${j} ${i}`)
              temp = Piece(game.images["piece1"], cell_width, cell_height, WHITE_SIDE)
              game.place(temp, [j, i])
              game.draw(temp)
              break;
            case BLACK_SIDE:
              // log(`white ${cell_state} ${j} ${i}`)
              temp = Piece(game.images["piece2"], cell_width, cell_height, BLACK_SIDE)
              game.place(temp, [j, i])
              game.draw(temp)
              break;
            case BARRIER:
              temp = Piece(game.images["barrier"], cell_width, cell_height, BARRIER)
              game.place(temp, [j, i])
              game.draw(temp)
              break;
          }
        }
      }
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

      //draw the calibration
      for (var i = 0; i < cols; i++) {
        context.font = "15px sans-serif";
        context.fillStyle = "#000000";
        context.fillText(String.fromCharCode(65 + i), cell_width * (i + 1) - 15, 15);
      }
      for (var i = 0; i < rows; i++) {
        context.font = "15px sans-serif";
        context.fillStyle = "#000000";
        context.fillText(i + 1, 3, cell_height * (i + 1) - 5);
      }

      //when tracing back, we draw the corresponding step
      if (game.active_traceback) {
        trace_state = activities[game.active_traceback.data("state")]
        game.restore(trace_state)
        return
      } else {
        //draw the barriers
        barriers.forEach((item, i) => {
          game.draw(item)
        });

        //draw the pieces
        game.draw(white1)
        game.draw(white2)
        game.draw(black1)
        game.draw(black2)
      }

      game.curr_side = barriers.length % 2

      if (!game.is_placing_piece && game.is_available_barrier_pos(game.cursor_x, game.cursor_y)) {
        game.move(blur_barrier, [game.cursor_x, game.cursor_y])
        game.draw(blur_barrier)
      }
    }

    // get mouse location on board
    canvas.addEventListener('mousemove', function(event) {
      var ret = game.getMousePos(event)
      game.cursor_x = parseInt(ret['x'] / (canvas.clientWidth / cols))
      game.cursor_y = parseInt(ret['y'] / (canvas.clientHeight / rows))
      // log(game.cursor_x + " " + game.cursor_y + " ")
      // log(ret['x'] + " " + ret['y'])
    });

    game.updateInfo = function() {
      // dont update when tracing back
      // if (game.active_traceback) {
      //   return
      // }
      // backup latest states
      activities.push([...states])
      // log(activities)
      game.curr_side = barriers.length % 2
      // log(barriers)
      info = $("#info")
      acts = $("#acts")

      white = '<img src="imgs/piece1.png" height="60">'
      black = '<img src="imgs/piece2.png" height="60">'

      // update the info tab
      curr = ''
      if (game.curr_side == WHITE_SIDE) {
        if (game.get_legal_moves(white1).size == 0 && game.get_legal_moves(white2).size == 0) {
          //white lose
          curr += `${black} Wins!`
        } else {
          curr += `${white}'s turn.`
        }
      } else {
        if (game.get_legal_moves(black1).size == 0 && game.get_legal_moves(black2).size == 0) {
          //black lose
          curr += `${white} Wins!`
        } else {
          curr += `${black}'s turn. `
        }
      }
      info.html(curr)

      //update activity history
      start_lst = '<a href="#" class="list-group-item list-group-item-action" data-state="1">'
      normal_lst = '<a href="#" class="list-group-item list-group-item-action"'

      // log(activities)
      if (activities.length == 2) {
        acts.html("")
        acts.append(`${start_lst}Initial state: ${rows}x${cols}</li>`)
      } else {
        activity = `${activities.length - 2}.
        (${String.fromCharCode(65 + game.last_moved_piece.prev_x)},${game.last_moved_piece.prev_y+1}) =>
        (${String.fromCharCode(65 + game.last_moved_piece.board_x)},${game.last_moved_piece.board_y+1})
        <img src="imgs/barrier.png" height="30">
        (${String.fromCharCode(65+game.last_placed_barrier.board_x)},${game.last_placed_barrier.board_y+1})`
        if (game.curr_side == WHITE_SIDE) {
          acts.append(`${normal_lst} data-state="${activities.length - 1}">
          <img src="imgs/piece2.png" height="30">${activity}</a>`)
        } else {
          acts.append(`${normal_lst} data-state="${activities.length - 1}">
          <img src="imgs/piece1.png" height="30">${activity}</a>`)
        }
      }

      //traceback function
      $(".list-group a").off('click');
      $(".list-group a").click(function() {
        state_idx = $(this).data("state")
        if (game.active_traceback) {
          game.active_traceback.removeClass("active")
          if (game.active_traceback.data("state") == state_idx) {
            game.active_traceback = null
            $("#trace").hide()
            $("#info").show()
            return
          }
        }
        $("#trace").show()
        $("#info").hide()
        $(this).addClass("active")
        game.active_traceback = $(this)
        // log(state_idx)
      })
    }

    game.enableDrag(white1, "plane", game.get_is_piece_movable, game.release_piece)
    game.enableDrag(white2, "plane", game.get_is_piece_movable, game.release_piece)
    game.enableDrag(black1, "plane", game.get_is_piece_movable, game.release_piece)
    game.enableDrag(black2, "plane", game.get_is_piece_movable, game.release_piece)
    //Start running
    game.updateInfo();
    game.updateFPS();
    game.running();
  });

  main.restLevel = function() {
    game.end();
    $('#viewer').replaceWith($('#viewer').clone());
    $("#info").show()
    $("#trace").hide()
    main();
  }
  main.addSize = function() {
    if (window.cols < 10 && window.rows < 10) {
      window.cols += 1
      window.rows += 1
      main.restLevel()
    }
  }
  main.mSize = function() {
    if (window.cols > 3 && window.rows > 3) {
      window.cols -= 1
      window.rows -= 1
      main.restLevel()
    }
  }
}
$("#trace").hide()
main();
