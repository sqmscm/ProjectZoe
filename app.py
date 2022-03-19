from flask import Flask, render_template, request, jsonify
from optimal_solver import allowed_rows_cols, state_to_num, num_to_state

app = Flask(__name__)


@app.route("/api", methods=['POST'])
def zoe_backend():
    data = request.get_json()
    r, c = data['rows'], data['cols']

    if (r, c) not in allowed_rows_cols:
        return jsonify({"message": "error"})

    for i, k in enumerate(data['state']):
        if k == 0:
            data['state'][i] = 1
        elif k == 1:
            data['state'][i] = -1
        elif k == -2:
            data['state'][i] = 0

    state_num = state_to_num(data['state'], data['turn'], r, c, state_dim=1)

    if allowed_rows_cols[(r, c)]['par'][state_num] == -1:
        return jsonify({"message": "game end"})

    best_move = num_to_state(allowed_rows_cols[(r, c)]['par'][state_num], r, c)[0]

    for i, k in enumerate(best_move):
        if k == 1:
            best_move[i] = 0
        elif k == -1:
            best_move[i] = 1
        elif k == 0:
            best_move[i] = -2

    return jsonify(
        {"message": "success", "state_num": allowed_rows_cols[(r, c)]['par'][state_num], "cpu_move": best_move})


if __name__ == '__main__':
    app.run()
