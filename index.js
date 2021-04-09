const delay = ms => new Promise(res => setTimeout(res, ms));

let width = document.getElementsByClassName("board")[0].getBoundingClientRect().width;
let height = document.getElementsByClassName("board")[0].getBoundingClientRect().height;
let x_dim = Math.floor(width / 50);
let y_dim = Math.floor(height / 50);
const weight_factor = 4;

let algorithm_timeout = 0;
let max_algorithm_timeout = 5000;
const solution_timeout = 70;
const finish_timeout = 600;

let start_index = 0;
let end_index = 0;

// set solving speed for slider
document.getElementById("solving_speed").setAttribute("max", max_algorithm_timeout);
document.getElementById("solving_speed").setAttribute("value", Math.floor(max_algorithm_timeout));

function create_cells() {
  width = document.getElementsByClassName("board")[0].getBoundingClientRect().width;
  height = document.getElementsByClassName("board")[0].getBoundingClientRect().height;
  x_dim = Math.floor(width / 50);
  y_dim = Math.floor(height / 50);
  const cell_cnt = x_dim * y_dim;
  // console.log(`H: ${height} W: ${width} CellCnt: ${cell_cnt}`);

  let cells = [];
  for(let i = 0; i < cell_cnt; i++) {
    cells.push(
      { id: i,
        is_start: false,
        is_end: false,
        is_wall: false,
        is_in_solution: false,
        is_visited: false,
        is_light: false,
        is_heavy: false,
        group: {
          is_full: false,
          is_empty: false,
          is_top_right: false,
          is_top_left: false,
          is_bottom_right: false,
          is_bottom_left: false,
          is_top: false,
          is_bottom: false,
          is_right: false,
          is_left: false,
        }
      });
  }

  start_index = convert_to_linear_coord(Math.floor(x_dim / 4), Math.floor(y_dim / 2));
  end_index = convert_to_linear_coord(Math.floor(3 * x_dim / 4), Math.floor(y_dim / 2));

  cells[start_index].is_start = true;
  cells[end_index].is_end = true;

  return cells;
}

function update_board_walls() {
  for(let i = 0; i < cells.length; i++) {
    let cell = cells[i];
    if(cell.is_wall){
      delete_wall(cell);
      cell.is_wall = true;
      const neighbours = get_wall_neighbours(cell);
      if(neighbours.cnt == 0) {
        cell.group.is_empty = true;
      } else if(neighbours.cnt >= 3) {
        cell.group.is_full = true;
      } else if(neighbours.cnt == 1) {
        if(neighbours.bottom) {
          cell.group.is_top = true;
        } else if(neighbours.top) {
          cell.group.is_bottom = true;
        } else if(neighbours.left) {
          cell.group.is_right = true;
        } else if(neighbours.right) {
          cell.group.is_left = true;
        }
      } else {
        if((neighbours.top && neighbours.bottom) || 
        (neighbours.left && neighbours.right)) {
          cell.group.is_full = true;
        } else {
          if(neighbours.left && neighbours.bottom) {
            cell.group.is_top_right = true;
          } else if(neighbours.right && neighbours.bottom) {
            cell.group.is_top_left = true;
          } else if(neighbours.left && neighbours.top) {
            cell.group.is_bottom_right = true;
          } else if(neighbours.right && neighbours.top) {
            cell.group.is_bottom_left = true;
          }
        }
      }
    }
  }
}

function clear_board() {
  if(board.is_running) {
    return;
  }
  for (let i = 0; i < cells.length; i++) {
    delete_wall(cells[i]);
    cells[i].is_visited = false;
    cells[i].is_in_solution = false;
    cells[i].is_heavy = false;
    cells[i].is_light = false;
  }
}

function delete_wall(cell) {
  cell.is_wall = false;
  cell.group.is_full = false;
  cell.group.is_empty = false;
  cell.group.is_top = false;
  cell.group.is_bottom = false;
  cell.group.is_left = false;
  cell.group.is_right = false;
  cell.group.is_top_left = false;
  cell.group.is_top_right = false;
  cell.group.is_bottom_left = false;
  cell.group.is_bottom_right = false;
}

function get_wall_neighbours(cell) {
  const coord = convert_to_xy_coord(cell.id);
  let result = {
    top: null,
    bottom: null,
    left: null,
    right: null,
    cnt: 0,
  };
  const top = cells[convert_to_linear_coord(coord.x, coord.y - 1)];
  const bottom = cells[convert_to_linear_coord(coord.x, coord.y + 1)];
  const left = cells[convert_to_linear_coord(coord.x - 1, coord.y)];
  const right = cells[convert_to_linear_coord(coord.x + 1, coord.y)];
  if(top !== cell && top.is_wall) {
    result.top = top; 
    result.cnt += 1;
  }
  if(bottom !== cell && bottom.is_wall) {
    result.bottom = bottom; 
    result.cnt += 1;
  }
  if(left !== cell && left.is_wall) {
    result.left = left; 
    result.cnt += 1;
  }
  if(right !== cell && right.is_wall) {
    result.right = right; 
    result.cnt += 1;
  }
  
  return result;
}

function change_start() {
  if(!board.is_running){
    board.is_changing_start = true;
  }
}

function change_end() {
  if(!board.is_running){
    board.is_changing_end = true;
  }
}

function convert_to_linear_coord(x, y) {
  let mod_x = x;
  let mod_y = y;
  if(mod_x >= x_dim) {
    mod_x = x_dim - 1;
  }
  else if(mod_x < 0) {
    mod_x = 0;
  }
  if(mod_y >= y_dim) {
    mod_y = y_dim - 1;
  }
  else if(mod_y < 0) {
    mod_y = 0;
  }
  return x_dim * mod_y + mod_x;
}

function convert_to_xy_coord(id) {
  if(id < 0) {
    return { x: 0, y: 0 };
  } else if (id > cells.length) {
    return { x: x_dim - 1, y: y_dim - 1 };
  } else {
    return { x: id % x_dim, y: Math.floor(id / x_dim) }
  }
}

function init_running() {
  board.is_running = true;

  options.path_cost = 0;
  options.visited_percentage = 0;
  options.operations_cnt = 0;

  for (let i = 0; i < cells.length; i++) {
    cells[i].is_visited = false;
    cells[i].is_in_solution = false;
  }
}

function stop_running() {
  for (let i = 0; i < cells.length; i++) {
    cells[i].is_visited = false;
  } 
  board.is_running = false;
}

function reachable() {
  init_running();

  let visited = [];
  for(let i = 0; i < cells.length; i++) {
    visited[i] = false;
  }

  let queue = [start_index];
  visited[start_index].is_visited = true;

  let current;
  let reachable_cnt = 0;
  while(queue.length > 0) {
    reachable_cnt++;
    current = queue.shift();
    const coord = convert_to_xy_coord(current);
    let potentials = [];
    potentials.push(cells[convert_to_linear_coord(coord.x, coord.y + 1)]); // up
    potentials.push(cells[convert_to_linear_coord(coord.x, coord.y - 1)]); // down
    potentials.push(cells[convert_to_linear_coord(coord.x - 1, coord.y)]); // left
    potentials.push(cells[convert_to_linear_coord(coord.x + 1, coord.y)]); // right

    for(let i = 0; i < potentials.length; i++) {
      let aux = potentials[i];
      if(!visited[aux.id] && !aux.is_wall) {
        queue.push(aux.id);
        visited[aux.id] = true;
      }
    }
  }

  stop_running();

  return reachable_cnt;
}

async function bfs() {
  if(board.is_running) {
    return;
  }

  let reachable_cnt = reachable();

  init_running();

  options.algorithm = "BFS";

  let queue = [{
    cell_id: start_index,
    pred: NaN
  }];

  let current;
  let visited_cnt = 0;

  while(queue.length > 0) {
    current = queue.shift();
    if(!cells[current.cell_id].is_visited) {
      cells[current.cell_id].is_visited = true;

      visited_cnt++;
      options.visited_percentage = Math.floor(visited_cnt / reachable_cnt * 100);
      options.operations_cnt++;

      if(current.cell_id === end_index) {
        break;
      }

      const coord = convert_to_xy_coord(current.cell_id);
      let potentials = [];
      potentials.push(cells[convert_to_linear_coord(coord.x, coord.y + 1)]); // up
      potentials.push(cells[convert_to_linear_coord(coord.x, coord.y - 1)]); // down
      potentials.push(cells[convert_to_linear_coord(coord.x - 1, coord.y)]); // left
      potentials.push(cells[convert_to_linear_coord(coord.x + 1, coord.y)]); // right

      options.operations_cnt += potentials.length;

      for(let i = 0; i < potentials.length; i++) {
        await delay(algorithm_timeout);
        let aux = potentials[i];
        if(!aux.is_visited && !aux.is_wall) {
          queue.push({ cell_id: aux.id, pred: current });
        }
      }
    }
  }

  current = current.pred;
  while(current.pred) {
    await delay(solution_timeout);
    const cell = cells[current.cell_id];
    const add = (1 / weight_factor) * cell.is_light + weight_factor * cell.is_heavy + 1 * (!cell.is_light && !cell.is_heavy);
    options.path_cost += add
    cells[current.cell_id].is_in_solution = true;
    current = current.pred;
  }

  await delay(finish_timeout);

  stop_running();
}

async function dijkstra() {
  if(board.is_running) {
    return;
  }

  let reachable_cnt = reachable();

  init_running();

  options.algorithm = "Dijkstra";

  let heap = new MinHeap();
  heap.insert({
    cell_id: start_index,
    pred: null,
    len: 0,
  });
  for(let i = 0; i < cells.length; i++) {
    if(i != start_index && !cells[i].is_wall) {
      heap.insert({
        cell_id: i,
        pred: null,
        len: Infinity,
      });
    }
  }

  let current;
  let visited_cnt = 0;
  while(heap.getLength() > 0) {
    let aux = heap.remove();
    options.operations_cnt += aux.operations;
    current = aux.val;
    if(!cells[current.cell_id].is_visited) {
      cells[current.cell_id].is_visited = true;

      visited_cnt++;
      options.visited_percentage = Math.floor(visited_cnt / reachable_cnt * 100);
      options.operations_cnt++;

      if(current.cell_id === end_index) {
        break;
      }
      const coord = convert_to_xy_coord(current.cell_id);
      let potentials = [];
      potentials.push(cells[convert_to_linear_coord(coord.x, coord.y + 1)]); // up
      potentials.push(cells[convert_to_linear_coord(coord.x, coord.y - 1)]); // down
      potentials.push(cells[convert_to_linear_coord(coord.x - 1, coord.y)]); // left
      potentials.push(cells[convert_to_linear_coord(coord.x + 1, coord.y)]); // right

      for(let i = 0; i < potentials.length; i++) {
        await delay(algorithm_timeout);
        let aux = potentials[i];
        if(!aux.is_visited && !aux.is_wall) {
          options.operations_cnt += Math.floor(Math.log(heap.getLength()));

          const add = (1 / weight_factor) * aux.is_light + weight_factor * aux.is_heavy + 1 * (!aux.is_light && !aux.is_heavy);
          options.operations_cnt += heap.insert({cell_id: aux.id, pred: current, len: current.len + add});
        }
      }
    }
  }

  current = current.pred;
  while(current.pred) {
    await delay(solution_timeout);
    const cell = cells[current.cell_id];
    const add = (1 / weight_factor) * cell.is_light + weight_factor * cell.is_heavy + 1 * (!cell.is_light && !cell.is_heavy);
    options.path_cost += add;
    cells[current.cell_id].is_in_solution = true;
    current = current.pred;
  }

  await delay(finish_timeout);

  stop_running();
}

let cells = create_cells();

document.addEventListener('keydown', (e) => {
  if(e.code === "KeyH") {
    board.is_placing_heavy = true;
  }
  if(e.code === "KeyL") {
    board.is_placing_light = true;
  }
});

document.addEventListener('keyup', (e) => {
  board.is_placing_heavy = false;
  board.is_placing_light = false;
});

window.addEventListener("resize", () => {
  cells = create_cells();
  board.cells = cells;
});

var board = new Vue({
  el: '.board',
  data: {
    cells: cells,
    is_placing_walls: false,
    is_placing_heavy: false,
    is_placing_light: false,
    is_changing_start: false,
    is_changing_end: false,
    is_running: false,
  },
  methods: {
    mouse_over: function(cell) {
      if(this.is_placing_walls && !cell.is_start && !cell.is_end) {
        cell.is_wall = !cell.is_wall;
        if(!cell.is_wall) {
          delete_wall(cell);
        }
        update_board_walls();
      }
    },
    clicked_cell: function(cell) {
      if(this.is_running) {
        return;
      }
      
      if (this.is_changing_start && !cell.is_end && !cell.is_wall) {
        for(let i = 0; i < cells.length; i++) {
          cells[i].is_in_solution = false;
        }
        cells[start_index].is_start = false;
        cell.is_start = true;
        start_index = cell.id;
        this.is_changing_start = false;
      } else if (this.is_changing_end && !cell.is_start && !cell.is_wall) {
        for(let i = 0; i < cells.length; i++) {
          cells[i].is_in_solution = false;
        }
        cells[end_index].is_end = false;
        cell.is_end = true;
        end_index = cell.id;
        this.is_changing_end = false;
      } else if (!cell.is_start && !cell.is_end && !this.is_changing_start && !this.is_changing_end) {
        if(this.is_placing_heavy) {
          if(!cell.is_wall){
            cell.is_heavy = !cell.is_heavy;
            if(cell.is_heavy && cell.is_light) {
              cell.is_light = false;
            }
          }
        } else if(this.is_placing_light) {
          if(!cell.is_wall){
            cell.is_light = !cell.is_light;
            if(cell.is_heavy && cell.is_light) {
              cell.is_heavy = false;
            }
          }
        } else {
          cell.is_wall = !cell.is_wall;
          if (!cell.is_wall) {
            delete_wall(cell);
          } else {
            cell.is_light = false;
            cell.is_heavy = false;
          }
          update_board_walls();
        }
      }
    },
    mouse_down: function() {
      if (!this.is_running && !this.is_changing_start && !this.is_changing_end){
        this.is_placing_walls = true;
      }
    },
    mouse_up: function() {
      this.is_placing_walls = false;
    }
  }
});

var options = new Vue({
  el: '.options',
  data: {
    visited_percentage: 0,
    path_cost: 0,
    operations_cnt: 0,
    algorithm: "",
  },
  methods: {
    changed_solving_speed: function() {
      algorithm_timeout = (max_algorithm_timeout - document.getElementById("solving_speed").value) / 100;
    }
  }
});

class MinHeap {
  constructor () {
    this.heap = [null];
  }

  getLength () {
    return this.heap.length - 1;
  }

  getMin () {
    return this.heap[1];
  }
  
  insert (node) {
    this.heap.push(node);
    let operations_cnt = 0;

    if (this.heap.length > 1) {
      let current = this.heap.length - 1;
      while (current > 1 && this.heap[Math.floor(current/2)].len > this.heap[current].len) {
        [this.heap[Math.floor(current/2)], this.heap[current]] = [this.heap[current], this.heap[Math.floor(current/2)]];
        current = Math.floor(current/2);
        operations_cnt++;
      }
    }

    return operations_cnt;
  }
  
  remove() {
    let smallest = this.heap[1];
    let operations_cnt = 0;

    if (this.heap.length > 2) {
      this.heap[1] = this.heap[this.heap.length-1];
      this.heap.splice(this.heap.length - 1);

      if (this.heap.length === 3) {
        if (this.heap[1].len > this.heap[2].len) {
          [this.heap[1], this.heap[2]] = [this.heap[2], this.heap[1]];
        }
        return smallest;
      }

      let current = 1;
      let leftChildIndex = current * 2;
      let rightChildIndex = current * 2 + 1;

      while (this.heap[leftChildIndex] &&
            this.heap[rightChildIndex] &&
            (this.heap[current].len > this.heap[leftChildIndex].len ||
                this.heap[current].len > this.heap[rightChildIndex].len)) {
        if (this.heap[leftChildIndex].len < this.heap[rightChildIndex].len) {
          [this.heap[current], this.heap[leftChildIndex]] = [this.heap[leftChildIndex], this.heap[current]];
          current = leftChildIndex;
          operations_cnt++;
        } else {
          [this.heap[current], this.heap[rightChildIndex]] = [this.heap[rightChildIndex], this.heap[current]];
          current = rightChildIndex;
          operations_cnt++;
        }

        leftChildIndex = current * 2;
        rightChildIndex = current * 2 + 1;
      }
    }

    else if (this.heap.length === 2) {
      operations_cnt++;
      this.heap.splice(1, 1);
    } else {
      return null;
    }

    return {
      val: smallest,
      operations: operations_cnt,
    };
  }
}