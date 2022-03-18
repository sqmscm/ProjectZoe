from flask import Flask, render_template, request, jsonify
from optimal_solver import r, c, dtw, par, state_to_num, num_to_state

app = Flask(__name__)


@app.route("/api", methods=['POST'])
def zoe_backend():
    data = request.get_json()

    if data['rows'] != r or data['cols'] != c:
        return jsonify({"message": "error"})

    for i, k in enumerate(data['state']):
        if k == 0:
            data['state'][i] = 1
        elif k == 1:
            data['state'][i] = -1
        elif k == -2:
            data['state'][i] = 0

    state_num = state_to_num(data['state'], data['turn'], state_dim=1)

    if par[state_num] == -1:
        return jsonify({"message": "game end"})

    best_move = num_to_state(par[state_num])[0]

    for i, k in enumerate(best_move):
        if k == 1:
            best_move[i] = 0
        elif k == -1:
            best_move[i] = 1
        elif k == 0:
            best_move[i] = -2

    return jsonify({"message": "success", "state_num": state_num, "cpu_move": best_move})


@app.route("/")
def zoe_frontend():
    return render_template("index.html")


app.run()
