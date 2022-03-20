/*
Project Zoe
https://github.com/sqmscm/ProjectZoe
*/
const WHITE_SIDE = 0
const BLACK_SIDE = 1
const BARRIER = 2
const EMPTY_CELL = -2
const BLUR_BARRIER = -1
window.cols = 3
window.rows = 3
//main
var main = function() {
  var canvas = document.getElementById('viewer');
  var context = canvas.getContext('2d');
  var images = {
    barrier: "static/imgs/barrier.png",
    barrier2: "static/imgs/barrier_alpha.png",
    piece1: "static/imgs/piece1.png",
    piece2: "static/imgs/piece2.png",
  }
  var game = Game(images, function() {

    var winner = null
    var rows = window.rows
    var cols = window.cols
    var cell_width = parseInt(canvas.width / cols)
    var cell_height = parseInt(canvas.height / rows)
    var board_color_1 = "#779557"
    var board_color_2 = "#ececd0"
    var board_color_3 = "#baca2b"
    var board_color_4 = "#f5f768"
    var board_color_5 = "#db9281"

    var white1 = Piece(game.images["piece1"], cell_width, cell_height, WHITE_SIDE)
    var white2 = Piece(game.images["piece1"], cell_width, cell_height, WHITE_SIDE)
    var black1 = Piece(game.images["piece2"], cell_width, cell_height, BLACK_SIDE)
    var black2 = Piece(game.images["piece2"], cell_width, cell_height, BLACK_SIDE)
    var blur_barrier = Piece(game.images["barrier2"], cell_width, cell_height, BLUR_BARRIER)

    var cells = []
    var cell_colors = {} // cells with specific color
    var barriers = []
    var activities = [
      []
    ]
    var move_logs = [
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
    game.AIsupport = true
    game.AIside = WHITE_SIDE
    game.AIaction = null

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

    game.highlight_move = function(move_log) {
      function change(x, y) {
        switch ((x + y) % 2) {
          case 0:
            return board_color_3
          case 1:
            return board_color_4
        }
      }
      game.change_cell_color(move_log[0], move_log[1], change(move_log[0], move_log[1]))
      game.change_cell_color(move_log[2], move_log[3], change(move_log[2], move_log[3]))
      game.change_cell_color(move_log[4], move_log[5], board_color_5)
    }

    // change the color of a cell
    game.change_cell_color = function(x, y, color) {
      idx = y * rows + x
      if (idx >= 0 && idx < cells.length) {
        cell_colors[idx] = color
      }
    }

    // move pieces to initial places
    game.move(white1, [cols - 1, Math.round(2 * rows / 3 - 1)])
    game.move(white2, [Math.round(2 * cols / 3 - 1), rows - 1])
    game.move(black1, [Math.round(cols / 3), 0])
    game.move(black2, [0, Math.round(rows / 3)])

    game.render = function() {
      // draw the game board
      cells.forEach((item, i) => {
        if (cell_colors[i]) {
          temp = item.color
          item.color = cell_colors[i]
          game.draw(item)
          item.color = temp
        } else {
          game.draw(item)
        }
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
        state_idx = game.active_traceback.data("state")
        trace_state = activities[state_idx]
        move_log = move_logs[state_idx]
        game.highlight_move(move_log)
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

        // informative color
        // game.highlight_move(move_logs[move_logs.length - 1])
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

    game.get_action_from_states = function(new_state, old_state) {
      // log(new_state)
      moving_piece = null
      move_to = null
      barrier_pos = null

      new_state.forEach((item, i) => {
        if (item != old_state[i]) {
          x = parseInt(i % cols)
          y = parseInt(i / rows)
          if (item == WHITE_SIDE || item == BLACK_SIDE) {
            move_to = [x, y]
          }
          if (old_state[i] == WHITE_SIDE) {
            if (white1.board_x == x && white1.board_y == y) {
              moving_piece = white1
            } else {
              moving_piece = white2
            }
          }
          if (old_state[i] == BLACK_SIDE) {
            if (black1.board_x == x && black1.board_y == y) {
              moving_piece = black1
            } else {
              moving_piece = black2
            }
          }
          if (item == BARRIER) {
            barrier_pos = [x, y]
          }
        }
      });

      return [moving_piece, move_to, barrier_pos]
    }

    game.make_moves_on_action = function(moving_piece, move_to, barrier_pos) {
      //move the piece
      game.move(moving_piece, move_to)
      game.last_moved_piece = moving_piece
      // make the barrier
      new_barrier = Piece(game.images["barrier"], cell_width, cell_height, BARRIER)
      game.move(new_barrier, barrier_pos)
      barriers.push(new_barrier)
      game.is_placing_piece = true
      game.last_placed_barrier = new_barrier
      //update info panel
      game.updateInfo(true)
    }

    game.get_legal_bar_pos = function(x, y, px = -1, py = -1) {
      dx = [-1, 0, 1, 1, 1, 0, -1, -1]
      dy = [-1, -1, -1, 0, 1, 1, 1, 0]
      bar_pos = [
        []
      ]
      dx.forEach((item, i) => {
        nx = x + item
        ny = y + dy[i]
        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
          if (game.getState(nx, ny) == EMPTY_CELL ||
            (nx == px && ny == py)) {
            bar_pos.push([x + item, y + dy[i]])
          }
        }
      });
      bar_pos.shift()
      return bar_pos
    }

    game.ai_make_action = function() {
      if (game.is_placing_piece && winner == null) {
        moving_piece = null
        move_to = null
        barrier_pos = null
        if (game.AIaction) {
          // if there is a model, use its decision
          moving_piece = game.AIaction[0]
          move_to = game.AIaction[1]
          barrier_pos = game.AIaction[2]
          game.AIaction = null
          game.make_moves_on_action(moving_piece, move_to, barrier_pos)
        } else if (!game.AIsupport) {
          // when no model loaded, randomly pick one
          legal = null
          if (game.curr_side == WHITE_SIDE) {
            whites = [white1, white2]
            widx = Math.floor(Math.random() * whites.length)
            legal = game.get_legal_moves(whites[widx])
            if (legal.size > 0) {
              moving_piece = whites[widx]
            } else {
              legal = game.get_legal_moves(whites[(widx + 1) % 2])
              if (legal.size > 0) {
                moving_piece = whites[(widx + 1) % 2]
              } else {
                return // no available move
              }
            }
          } else {
            blacks = [black1, black2]
            widx = Math.floor(Math.random() * blacks.length)
            legal = game.get_legal_moves(blacks[widx])
            if (legal.size > 0) {
              moving_piece = blacks[widx]
            } else {
              legal = game.get_legal_moves(blacks[(widx + 1) % 2])
              if (legal.size > 0) {
                moving_piece = blacks[(widx + 1) % 2]
              } else {
                return // no available move
              }
            }
          }
          legal = [...legal]
          move_to = legal[Math.floor(Math.random() * legal.length)].split("#").map(Number)
          // log(move_to)
          legal_bars = game.get_legal_bar_pos(move_to[0], move_to[1], moving_piece.board_x, moving_piece.board_y)
          // log(legal_bars)
          barrier_pos = legal_bars[Math.floor(Math.random() * legal_bars.length)]
          game.make_moves_on_action(moving_piece, move_to, barrier_pos)
        }
      }
    }

    game.updateInfo = function(ai_opr = false) {
      // reset all board cells' color
      cell_colors = {}
      // backup latest states
      activities.push([...states])
      if (game.last_moved_piece && game.last_placed_barrier) {
        move_logs.push([game.last_moved_piece.prev_x, game.last_moved_piece.prev_y,
          game.last_moved_piece.board_x, game.last_moved_piece.board_y,
          game.last_placed_barrier.board_x, game.last_placed_barrier.board_y
        ])
      } else {
        move_logs.push([-1, -1, -1, -1, -1, -1])
      }
      // log(activities)
      game.curr_side = barriers.length % 2

      $.ajax({
        type: "POST",
        url: "https://zoe-chess.herokuapp.com/api",
        data: JSON.stringify({
          rows: rows,
          cols: cols,
          state: states,
          turn: game.curr_side
        }),
        contentType: "application/json",
        dataType: 'json'
      }).fail(function(data) {
        game.AIsupport = false
      }).done(function(result) {
        // log(result['cpu_move'])
        if (result['message'] == 'error') {
          game.AIsupport = false
          $("#model_stat").attr("class", "btn btn-outline-danger btn-sm")
          $("#model_stat").text("Model not found.")
        } else if (result['message'] == 'success') {
          $("#model_stat").attr("class", "btn btn-outline-success btn-sm")
          $("#model_stat").text("Model loaded.")
          game.AIaction = game.get_action_from_states(result['cpu_move'], states)
          // log(result)
        }
        if (game.curr_side == $('#ai-control input:radio:checked').val()) {
          game.ai_make_action()
        }
        // console.log(result)
      });


      // log(barriers)
      info = $("#info")
      acts = $("#acts")

      white = '<img src="static/imgs/piece1.png" height="60">'
      black = '<img src="static/imgs/piece2.png" height="60">'

      // update the info tab
      curr = ''
      if (game.curr_side == WHITE_SIDE) {
        if (game.get_legal_moves(white1).size == 0 && game.get_legal_moves(white2).size == 0) {
          //white lose
          curr += `${black} Wins!`
          winner = BLACK_SIDE
        } else {
          curr += `${white}'s turn.`
        }
      } else {
        if (game.get_legal_moves(black1).size == 0 && game.get_legal_moves(black2).size == 0) {
          //black lose
          curr += `${white} Wins!`
          winner = WHITE_SIDE
        } else {
          curr += `${black}'s turn. `
        }
      }
      info.html(curr)

      //update activity history
      start_lst = '<a href="#" class="list-group-item list-group-item-secondary list-group-item-action" data-state="1">'
      normal_lst = '<a href="#" class="list-group-item list-group-item-secondary list-group-item-action"'

      // log(activities)
      if (activities.length == 2) {
        acts.html("")
        acts.prepend(`${start_lst}Initial state: ${rows}x${cols}</li>`)
      } else {
        activity = `${activities.length - 2}.
        (${String.fromCharCode(65 + game.last_moved_piece.prev_x)},${game.last_moved_piece.prev_y+1})
        <img src="static/imgs/arrow.png" height="30">
        (${String.fromCharCode(65 + game.last_moved_piece.board_x)},${game.last_moved_piece.board_y+1})
        <img src="static/imgs/barrier.png" height="30">
        (${String.fromCharCode(65+game.last_placed_barrier.board_x)},${game.last_placed_barrier.board_y+1})`
        if (ai_opr) {
          activity += ` <img src="static/imgs/ai.png" height="30">`
        }
        if (game.curr_side == WHITE_SIDE) {
          acts.prepend(`${normal_lst} data-state="${activities.length - 1}">
          <img src="static/imgs/piece2.png" height="30">${activity}</a>`)
        } else {
          acts.prepend(`${normal_lst} data-state="${activities.length - 1}">
          <img src="static/imgs/piece1.png" height="30">${activity}</a>`)
        }
      }

      //traceback function
      $(".list-group a").off('click');
      $(".list-group a").click(function() {
        cell_colors = {}
        state_idx = $(this).data("state")
        if (game.active_traceback) {
          game.active_traceback.removeClass("active")
        }
        //terminate traceback
        if ((game.active_traceback && game.active_traceback.data("state") == state_idx) ||
          state_idx == activities.length - 1) {
          game.active_traceback = null
          $("#trace").hide()
          $("#info").show()
          return
        }
        $("#trace").show()
        $("#info").hide()
        $(this).addClass("active")
        game.active_traceback = $(this)
        // log(state_idx)
      })
    }

    game.enableDrag(white1, "plane", game.get_is_piece_movable, game.release_piece);
    game.enableDrag(white2, "plane", game.get_is_piece_movable, game.release_piece);
    game.enableDrag(black1, "plane", game.get_is_piece_movable, game.release_piece);
    game.enableDrag(black2, "plane", game.get_is_piece_movable, game.release_piece);
    //Start running
    game.updateInfo();
    game.updateFPS();
    game.running();
  });

  main.aiMove = function() {
    game.ai_make_action()
  }
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
