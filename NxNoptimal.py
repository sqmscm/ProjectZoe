"""
turn: 0: white, 1: black
piece: -1: black, 0: space, 1: white, 2: obstacle
"""
import copy
import math


def comb(n, k):
    a = 1
    for i in range(n - k + 1, n + 1):
        a *= i
    return a // math.factorial(k)


r, c = 3, 3

side_combinations = comb(4, 2)
position_combinations = comb(r * c, 4)
obstacles_combinations = 2 ** (r * c - 4)

total_state_num = side_combinations * position_combinations * obstacles_combinations * 2
piece_position_table = []
side_position_table = []
inv_piece_position_table = {}
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
def num_to_state(n):
    state = [0] * r * c

    turn = n % 2
    n //= 2
    position_num = n % position_combinations
    n //= position_combinations
    side_num = n % side_combinations
    n //= side_combinations
    obstacles_num = n

    positions = piece_position_table[position_num]
    whites = side_position_table[side_num]
    blacks = [i for i in range(4) if i not in whites]

    state[positions[whites[0]]] = state[positions[whites[1]]] = 1
    state[positions[blacks[0]]] = state[positions[blacks[1]]] = -1

    for i in range(r * c):
        if state[i] in [-1, 1]:
            continue
        is_obstacle = obstacles_num % 2
        if is_obstacle == 1:
            state[i] = 2
        obstacles_num //= 2

    return state, turn


def state_to_num(state, turn, state_dim=2):
    if state_dim == 2:
        state = [i for j in state for i in j]  # flatten

    num = turn

    position = []
    for i in range(r * c):
        if state[i] in [-1, 1]:
            position.append(i)
    position_num = inv_piece_position_table[frozenset(position)]
    num += position_num * 2

    side = []
    tmp = 0
    for i in range(r * c):
        if state[i] == 1:  # from the perspective of white
            side.append(tmp)
        if state[i] in [-1, 1]:
            tmp += 1
    side_num = inv_side_position_table[frozenset(side)]
    num += side_num * 2 * position_combinations

    obstacle_num = 0
    tmp = 1
    for i in range(r * c):
        if state[i] == 2:
            obstacle_num += tmp
        if state[i] not in [-1, 1]:
            tmp *= 2
    num += obstacle_num * 2 * position_combinations * side_combinations

    return num


# get allowed move for a given state, return a list of states
def get_moved_states(state, turn, dbg_switch=0):
    state2d = [state[j * c:j * c + c] for j in range(r)]

    def gen_moves(state2duc, x, y, dbg_switch=0):
        state2d = copy.deepcopy(state2duc)
        destination = []  # coordinates of destination where we can put the piece back
        dx = [-1, -1, 0, 1, 1, 1, 0, -1]  # north, northeast, east, ... , northwest
        dy = [0, 1, 1, 1, 0, -1, -1, -1]
        # iterate through row, column, and diagonals
        piece_color = state2d[x][y]
        state2d[x][y] = 0
        # x,y start coordinates; p, q dst coordinates; r, s block coordinates
        xlim, ylim = len(state2d), len(state2d[0])

        def judge_oor_or_ne(x, y):  # (out of range or non-empty) judge
            if x > (xlim - 1) or x < 0 or y > (ylim - 1) or y < 0 or state2d[x][y] != 0:
                return 1
            return 0

        def look_around(x, y):  # look around to see which squares can we put blocks
            ret = []
            for i in range(len(dx)):
                if judge_oor_or_ne(x + dx[i], y + dy[i]) == 0:
                    ret.append([x + dx[i], y + dy[i]])
            return ret

        for i in range(len(dx)):
            cx, cy = x, y
            while judge_oor_or_ne(cx + dx[i], cy + dy[i]) == 0:
                cx, cy = cx + dx[i], cy + dy[i]
                if state2d[cx][cy] == 0:
                    if dbg_switch != 0:
                        print(f"{dbg_switch},{i},({cx},{cy})@if state2d[cx][cy] == 0: state_2d:{state2d}")
                    block_able_list = look_around(cx, cy)
                    if block_able_list:
                        for bal in block_able_list:
                            if dbg_switch != 0:
                                print(f"{dbg_switch},{i},({cx},{cy})@if dbg_switch != 0: == 0: state_2d:{state2d}")
                            st = copy.deepcopy(state2d)
                            st[cx][cy] = piece_color
                            st[bal[0]][bal[1]] = 2
                            destination.append(st)
                else:
                    break
            i += 1
        return destination

    state_list = []
    m, n = len(state2d), len(state2d[0])
    for i in range(m):
        for j in range(n):
            piece = 1 if turn == 0 else -1
            if state2d[i][j] == piece:
                state_list += gen_moves(state2d.copy(), i, j, dbg_switch)
    return state_list


# return a list of state2d consisting reversed states of state
def reverse_move(state, turn):
    def remove_target_piece_and_obstacle(state2d, i, j):
        ret = []
        dx = dy = [-1, 0, 1]
        for p in dx:
            for q in dy:
                x, y = p + i, q + j
                if x < 0 or x >= r or y < 0 or y >= c:
                    continue
                if state2d[x][y] == 2:
                    cpst = copy.deepcopy(state2d)
                    cpst[x][y], cpst[i][j] = 0, 0
                    ret.append(cpst)
        return ret

    def move_piece_back(state2d_list, i, j, target_side):
        destination = []  # coordinates of destination where we can put the piece back
        dx = [-1, -1, 0, 1, 1, 1, 0, -1]  # north, northeast, east, ... , northwest
        dy = [0, 1, 1, 1, 0, -1, -1, -1]
        # iterate through row, column, and diagonals
        for state2d in state2d_list:
            for k in range(len(dx)):
                x, y = i, j
                while True:
                    x += dx[k]
                    y += dy[k]
                    if x < 0 or x >= r or y < 0 or y >= c:
                        break
                    if state2d[x][y] == 0:
                        cpst = copy.deepcopy(state2d)
                        cpst[x][y] = target_side
                        destination.append(cpst)
                    else:
                        break
        return destination

    # ---------------------- sub-functions end -----------------------
    target_side = -1 if turn == 0 else 1
    state2d = [state[j * c:j * c + c] for j in range(r)]
    out = []
    for i in range(r):
        for j in range(c):
            if state2d[i][j] == target_side:
                tmp_out = remove_target_piece_and_obstacle(state2d, i, j)
                out += move_piece_back(tmp_out, i, j, target_side)
    return out


def unit_test():
    # ------------------------------- test reverse_move ----------------------------------------
    state, turn = num_to_state(3000)
    print(f"state : {state}, turn: {turn}\n******************")
    ret = reverse_move(state, turn)
    for i in ret:
        for j in range(r):
            print(i[j])
        print("-------------------")

    # ------------------------------- test state_to_num ----------------------------------------
    test_state = [
        [2, -1, 0],
        [-1, 2, 2],
        [0, 1, 1]
    ]
    stn = state_to_num(test_state, 0)
    print(stn)
    print(num_to_state(stn))


def optimal_strategy(opstrategy_only=0, dtw=None, par=None):
    if opstrategy_only == 0:
        # distance to win, 0 is leaf node
        dtw = [-1] * total_state_num
        # store the number of parent node, leaf nodes have no parents since the tree grows to the bottom
        # -2 means un-initialized, -1 means leaf node
        par = [-2] * total_state_num

    bexp = []  # expanded when assuming black to win

    def side_search(winside, node_cnt, dtw, par):
        opside = (winside + 1) % 2  # assume opponent's side is decided to lose
        for i in range(0, total_state_num):  # find all black's lose state
            # ======================================= display =======================================
            if node_cnt % 10000 == 0:
                print(
                    f"********** winside {winside}, overall expanded node number: {node_cnt} (state number: {total_state_num}) **************")
            node_cnt += 1
            # ======================================= display =======================================
            if dtw[i] != -1 or (i % 2) != opside:
                continue
            s, t = num_to_state(i)
            if len(get_moved_states(s, t)) == 0:
                dtw[i] = 0
                par[i] = -1
                if winside == 1:
                    bexp.append(i)

        for current_distance in range(0, r * c - winside - 4):
            print(f"========================current distance {current_distance}===========================")
            for i in range(total_state_num):
                if i % 10000 == 0:
                    print(f"---- current distance {current_distance}, inspected: {i}/{total_state_num} ------")
                if i % 2 != opside:
                    continue
                if current_distance % 2 == 0:  # dis0, color winside turn
                    if dtw[i] != current_distance:
                        continue
                    state_list = reverse_move(*num_to_state(i))
                else:  # dis1, color opside turn
                    if dtw[i] != -1:
                        continue
                    tmp_st, _ = num_to_state(i)
                    state_list = get_moved_states(tmp_st, opside)

                if current_distance % 2 == 0:  # dis0, color winside turn
                    for j in state_list:
                        # ======================================= display =======================================
                        if node_cnt % 10000 == 0:
                            print(
                                f"**** winside {winside}, overall expanded node number: {node_cnt}, distance: {current_distance}, (state number: {total_state_num}) ****")
                        node_cnt += 1
                        # ======================================= display =======================================
                        idx = state_to_num(j, winside)
                        if dtw[idx] == -1:
                            dtw[idx] = current_distance + 1
                            par[idx] = i
                            if winside == 1:
                                bexp.append(idx)

                else:  # dis1, color opside turn
                    best_option_for_opside = -2
                    best_state_num = -1
                    for j in state_list:
                        # ======================================= display =======================================
                        if node_cnt % 10000 == 0:
                            print(
                                f"**** winside {winside}, overall expanded node number: {node_cnt}, distance: {current_distance}, (state number: {total_state_num}) ****")
                        node_cnt += 1
                        # ======================================= display =======================================
                        state_num_of_j = state_to_num(j, winside)  # evaluate the state of white's turn
                        # if there is any option for black that is un-initilized, then this node has dtw more than current depth
                        if dtw[state_num_of_j] == -1:
                            best_option_for_opside = -2
                            break
                        # otherwise
                        if dtw[state_num_of_j] > best_option_for_opside:
                            best_option_for_opside = dtw[state_num_of_j]
                            best_state_num = state_num_of_j
                    if best_option_for_opside != -2:
                        dtw[i] = best_option_for_opside + 1
                        par[i] = best_state_num
                        if winside == 1:
                            bexp.append(i)
        return node_cnt, dtw, par

    if opstrategy_only == 0:
        node_cnt, dtw, par = side_search(0, 1, dtw, par)
    else:
        node_cnt = 1
    _, dtw, par = side_search(1, node_cnt, dtw, par)
    for i in range(len(dtw)):
        if dtw[i] == -1:  # draw or illegal state
            dtw[i] = 999
    for i in bexp:
        dtw[i] = -dtw[i]
    return dtw, par


def display(state2d, turn, dtw=None, par=None):
    if dtw is None or par is None:
        dtw, par = optimal_strategy()
    # ======================================= display =======================================
    f = open("NxNoptimal_dtw.txt", "w+")
    f.write(str(dtw))
    f.close()
    g = open("NxNoptimal_par.txt", "w+")
    g.write(str(par))
    g.close()
    # ======================================= display =======================================
    states = []
    root = copy.deepcopy(state2d)
    reverse_color_flag = par[state_to_num(root, turn)]
    if reverse_color_flag == -2:  # un-initialized parent, so black win in optimal play
        for i in range(r):
            for j in range(c):
                if root[i][j] in [-1, 1]:
                    root[i][j] = - root[i][j]

    while True:
        sid = state_to_num(root, turn)
        par_id = par[sid]
        if par_id < 0:
            break
        root, turn = num_to_state(par_id)
        root = [root[j * c:j * c + c] for j in range(r)]
        states.append(root)

    for i in states:
        for j in range(r):
            if reverse_color_flag == -2:  # we need to reverse color
                p = []
                for k in i[j]:
                    p.append(-k if k in [-1, 1] else k)
                print(p)
            else:
                print(i[j])
        print("-------------------")


def write_to_disk(dtw, par, file_name='NxNoptimal_bothsides_'):
    f = open(file_name + f"dtw_r{r}_c{c}.txt", 'w+')
    f.write(str(dtw)[1:-1])
    f.close()
    f = open(file_name + f"par_r{r}_c{c}.txt", 'w+')
    f.write(str(par)[1:-1])
    f.close()


def load_from_disk(file_name='NxNoptimal_bothsides_'):
    f = open(file_name + f"dtw_r{r}_c{c}.txt", 'r')
    dtw = list(map(int, f.read().split(',')))
    f.close()
    f = open(file_name + f"par_r{r}_c{c}.txt", 'r')
    par = list(map(int, f.read().split(',')))
    f.close()
    return dtw, par


def question(question_state2d):
    b, m, n = 0, len(question_state2d), len(question_state2d[0])
    for i in range(m):
        for j in range(n):
            if question_state2d[i][j] == 2:
                b += 1

    turn = b % 2
    states = []
    dbg = 0
    root = question_state2d.copy()
    while True:
        sid = state_to_num(root, turn)
        par_id = par[sid]
        if par_id < 0:
            break
        root, turn = num_to_state(par_id)
        root = [root[j * c:j * c + c] for j in range(r)]
        states.append(root)
        dbg += 1
        if dbg > r * c - 3:
            print("dbg incurred")
            break
    qn = state_to_num(question_state2d, b % 2)
    print(f"dtw{dtw[qn]}, par{par[qn]} @ qn{qn}")
    for i in states:
        for j in range(r):
            print(i[j])
        print("-------------------")


# if __name__ == '__main__':
# print(side_combinations, position_combinations, obstacles_combinations, total_state_num)

piece_position_table, inv_piece_position_table = make_position_table(4, position_combinations, r * c)
side_position_table, inv_side_position_table = make_position_table(2, side_combinations, 4)


# dtw, par = optimal_strategy()

def d2(num):
    state, _ = num_to_state(num)
    state2d = [state[j * c:j * c + c] for j in range(r)]
    for j in state2d:
        print(j)
    print(state2d)


# write_to_disk(*optimal_strategy())
# dtw, par = load_from_disk(file_name='NxNoptimal')
# write_to_disk(*optimal_strategy(1, dtw, par))
# dtw, par = load_from_disk()
# display(config.init_chess_state, 0, dtw, par)
# question(config.question_state)
