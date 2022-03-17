from flask import Flask, render_template, request, jsonify
import NxNoptimal

app = Flask(__name__)
r = c = 4


def load_models(file_name='NxNoptimal_bothsides_'):
    f = open(f"model/{file_name}dtw_r{r}_c{c}.txt", 'r')
    dtw = list(map(int, f.read().split(',')))
    f.close()
    f = open(f"model/{file_name}par_r{r}_c{c}.txt", 'r')
    par = list(map(int, f.read().split(',')))
    f.close()
    return dtw, par


dtw, par = load_models()
print(dtw[:10], par[:10])


@app.route("/api", methods=['POST'])
def zoe_backend():
    data = request.get_json()
    for i, k in enumerate(data['state']):
        if k == 0:
            data['state'][i] = 1
        elif k == 1:
            data['state'][i] = -1
        elif k == -2:
            data['state'][i] = 0
    state_num = NxNoptimal.state_to_num(data['state'], data['turn'], state_dim=1)
    best_move = NxNoptimal.num_to_state(par[state_num])[0]
    return jsonify({"cpu_move": best_move})


@app.route("/")
def zoe_frontend():
    return render_template("index.html")


app.run()
