const board_dim = document.getElementsByClassName("board")[0].getBoundingClientRect();
const delay = ms => new Promise(res => setTimeout(res, ms));

const width = board_dim.width;
const height = board_dim.height;
const x_dim = Math.floor(width / 50);
const y_dim = Math.floor(height / 50);
const weight_factor = 4;

let algorithm_timeout = 0;
const solution_timeout = 100;
const finish_timeout = 600;

let start_index = 0;
let end_index = 0;

var slider = document.getElementById("solvind_speed");
slider.oninput = function() {
  algorithm_timeout = (5000 - this.value) / 100;
}

function create_cells() {
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
  if(container.is_running) {
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
  if(!container.is_running){
    container.is_changing_start = true;
  }
}

function change_end() {
  if(!container.is_running){
    container.is_changing_end = true;
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
  container.is_running = true;

  for (let i = 0; i < cells.length; i++) {
    cells[i].is_visited = false;
    cells[i].is_in_solution = false;
  }
}

function stop_running() {
  for (let i = 0; i < cells.length; i++) {
    cells[i].is_visited = false;
  } 
  container.is_running = false;
}

async function bfs() {
  if(container.is_running) {
    return;
  }

  init_running();

  let queue = [{
    cell_id: start_index,
    pred: NaN
  }];
  cells[start_index].is_visited = true;

  let current;

  while(queue.length > 0) {
    current = queue.shift();
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
      let aux = potentials[i];
      await delay(algorithm_timeout);
      if(!aux.is_visited && !aux.is_wall) {
        queue.push({ cell_id: aux.id, pred: current });
        aux.is_visited = true;
      }
    }
  }

  current = current.pred;
  while(current.pred) {
    await delay(solution_timeout);
    cells[current.cell_id].is_in_solution = true;
    current = current.pred;
  }

  await delay(finish_timeout);

  stop_running();
}

async function dijkstra() {
  if(container.is_running) {
    return;
  }

  init_running();

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
  while(heap.getLength() > 0) {
    current = heap.remove();
    if(!cells[current.cell_id].is_visited) {
      cells[current.cell_id].is_visited = true;
      if(current.cell_id === end_index) {
        break;
      }
      const coord = convert_to_xy_coord(current.cell_id);
      let potentials = [];
      const up = cells[convert_to_linear_coord(coord.x, coord.y + 1)];
      potentials.push(up);
      const down = cells[convert_to_linear_coord(coord.x, coord.y - 1)];
      potentials.push(down);
      const left = cells[convert_to_linear_coord(coord.x - 1, coord.y)];
      potentials.push(left);
      const right = cells[convert_to_linear_coord(coord.x + 1, coord.y)];
      potentials.push(right);

      for(let i = 0; i < potentials.length; i++) {
        let aux = potentials[i];
        await delay(algorithm_timeout);
        if(!aux.is_visited && !aux.is_wall) {
          const add = (1 / weight_factor) * aux.is_light + weight_factor * aux.is_heavy + 1 * (!aux.is_light && !aux.is_heavy);
          heap.insert({cell_id: aux.id, pred: current, len: current.len + add});
        }
      }
    }
  }

  current = current.pred;
  while(current.pred) {
    await delay(solution_timeout);
    cells[current.cell_id].is_in_solution = true;
    current = current.pred;
  }

  await delay(finish_timeout);

  stop_running();
}

let cells = create_cells();

document.addEventListener('keydown', (e) => {
  if(e.code === "KeyH") {
    container.is_placing_heavy = true;
  }
  if(e.code === "KeyL") {
    container.is_placing_light = true;
  }
});

document.addEventListener('keyup', (e) => {
  container.is_placing_heavy = false;
  container.is_placing_light = false;
});

window.addEventListener("resize", () => {
  alert("If you resize the window, the cell grid will look wanky.");
});

var container = new Vue({
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
        for (let i = 0; i < cells.length; i++) {
          cells[i].is_start = false;
        }
        cell.is_start = true;
        start_index = cell.id;
        this.is_changing_start = false;
      } else if (this.is_changing_end && !cell.is_start && !cell.is_wall) {
        for (let i = 0; i < cells.length; i++) {
          cells[i].is_end = false;
        }
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

    if (this.heap.length > 1) {
      let current = this.heap.length - 1;
      while (current > 1 && this.heap[Math.floor(current/2)].len > this.heap[current].len) {
        [this.heap[Math.floor(current/2)], this.heap[current]] = [this.heap[current], this.heap[Math.floor(current/2)]];
        current = Math.floor(current/2);
      }
    }
  }
  
  remove() {
    let smallest = this.heap[1];

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
        } else {
          [this.heap[current], this.heap[rightChildIndex]] = [this.heap[rightChildIndex], this.heap[current]];
          current = rightChildIndex;
        }

        leftChildIndex = current * 2;
        rightChildIndex = current * 2 + 1;
      }
    }

    else if (this.heap.length === 2) {
      this.heap.splice(1, 1);
    } else {
      return null;
    }

    return smallest;
  }
}