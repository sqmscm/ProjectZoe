"""
turn: 0: white, 1: black
piece: -1: black, 0: space, 1: white, 2: obstacle
"""
import math
import config
import numpy as np
from collections import defaultdict


def comb(n, k):
    a = 1
    for i in range(n - k + 1, n + 1):
        a *= i
    return a // math.factorial(k)


allowed_rows_cols = {x: defaultdict(dict) for x in config.supported_model}

side_combinations = {}
position_combinations = {}
obstacles_combinations = {}

piece_position_table = {}
inv_piece_position_table = {}
side_position_table = {}
inv_side_position_table = {}


def make_position_table(t, comb_num, limit):
    k = list(range(t))
    position_table = []
    inv_position_table = {}
    for i in range(comb_num):
        position_table.append(k.copy())
        inv_position_table.update({frozenset(k.copy()): i})
        for j in range(t - 1, -1, -1):
            if k[j] < limit - (t - j):
                k[j] += 1
                for h in range(j + 1, t):
                    k[h] = k[h - 1] + 1
                break
            else:
                if j > 0 and k[j - 1] + 1 < k[j] - (t - j):
                    k[j - 1] = k[j - 1] + 1
                    for h in range(j, t):
                        k[h] = k[h - 1] + 1
                    break
    # print(position_table, len(position_table))
    return position_table, inv_position_table


# return 1d state with respect to state number
def num_to_state(n, rows, cols):
    state = [0] * rows * cols

    turn = n % 2
    n //= 2
    position_num = n % position_combinations[(rows, cols)]
    n //= position_combinations[(rows, cols)]
    side_num = n % side_combinations[(rows, cols)]
    n //= side_combinations[(rows, cols)]
    obstacles_num = n

    positions = piece_position_table[(rows, cols)][position_num]
    whites = side_position_table[(rows, cols)][side_num]
    blacks = [i for i in range(4) if i not in whites]

    state[positions[whites[0]]] = state[positions[whites[1]]] = 1
    state[positions[blacks[0]]] = state[positions[blacks[1]]] = -1

    for i in range(rows * cols):
        if state[i] in [-1, 1]:
            continue
        is_obstacle = obstacles_num % 2
        if is_obstacle == 1:
            state[i] = 2
        obstacles_num //= 2

    return state, turn


def state_to_num(state, turn, rows, cols, state_dim=2):
    if state_dim == 2:
        state = [i for j in state for i in j]  # flatten

    num = turn

    position = []
    for i in range(rows * cols):
        if state[i] in [-1, 1]:
            position.append(i)
    position_num = inv_piece_position_table[(rows, cols)][frozenset(position)]
    num += position_num * 2

    side = []
    tmp = 0
    for i in range(rows * cols):
        if state[i] == 1:  # from the perspective of white
            side.append(tmp)
        if state[i] in [-1, 1]:
            tmp += 1
    side_num = inv_side_position_table[(rows, cols)][frozenset(side)]
    num += side_num * 2 * position_combinations[(rows, cols)]

    obstacle_num = 0
    tmp = 1
    for i in range(rows * cols):
        if state[i] == 2:
            obstacle_num += tmp
        if state[i] not in [-1, 1]:
            tmp *= 2
    num += obstacle_num * 2 * position_combinations[(rows, cols)] * side_combinations[(rows, cols)]

    return num


def load_from_disk(rows, cols, file_name='NxNoptimal_bothsides_'):
    distance_to_win = np.load(f"model/{file_name}dtw_r{rows}_c{cols}.npy").tolist()
    parent = np.load(f"model/{file_name}par_r{rows}_c{cols}.npy").tolist()
    return distance_to_win, parent


for r, c in allowed_rows_cols:
    dtw, par = load_from_disk(r, c)
    print(f'loaded model: {r}x{c} {par[:5]} {dtw[:5]}')
    allowed_rows_cols[(r, c)]['dtw'] = dtw
    allowed_rows_cols[(r, c)]['par'] = par

    side_combinations[(r, c)] = comb(4, 2)
    position_combinations[(r, c)] = comb(r * c, 4)
    obstacles_combinations[(r, c)] = 2 ** (r * c - 4)

    piece_position_table[(r, c)], inv_piece_position_table[(r, c)] = \
        make_position_table(4, position_combinations[(r, c)], r * c)
    side_position_table[(r, c)], inv_side_position_table[(r, c)] = \
        make_position_table(2, side_combinations[(r, c)], 4)
