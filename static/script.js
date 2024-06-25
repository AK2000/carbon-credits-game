/* script.js */

// Select elements
const advanceButton = document.getElementById('advance-button');
const endGameButton = document.getElementById('end-game-button')
const scoreValue = document.getElementById('score-value');
const progressBar = document.getElementById('progress-bar-inner');
const timerValue = document.getElementById('timer-value');
const energyValue = document.getElementById('energy-value');

function generateUniqueId() {
    let array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0].toString(36);
}

const game_state = {
    score: 0,
    timeLeft: 60,
    total_allocation: 100,
    allocation: 100,
    total_energy: 0,
    total_runtime: 0,
    scheduling_decisions: [],
    game_id: generateUniqueId(),
    job_idx: 0
};

const round_state = {
    score: 0,
    time: 0,
    allocation: 0,
    energy: 0
};

const dataList = [ // TODO: Generate this list from trace data
    { 
        id: 0, 
        text: 'Job 1', 
        score: 10, 
        resources: {
            machine1: {runtime: 30, energy: 30},
            machine2: {runtime: 20, energy: 30},
            machine3: {runtime: 40, energy: 20},
            machine4: {runtime: 20, energy: 20},
        }
    },
    { 
        id: 1, 
        text: 'Job 2', 
        score: 20, 
        resources: {
            machine1: {runtime: 30, energy: 30},
            machine2: {runtime: 20, energy: 30},
            machine3: {runtime: 40, energy: 20},
            machine4: {runtime: 20, energy: 20},
        }
    },
    { 
        id: 2, 
        text: 'Job 3', 
        score: 10, 
        resources: {
            machine1: {runtime: 30, energy: 30},
            machine2: {runtime: 20, energy: 30},
            machine3: {runtime: 40, energy: 20},
            machine4: {runtime: 20, energy: 20},
        }
    },
    { 
        id: 3, 
        text: 'Job 4', 
        score: 10, 
        resources: {
            machine1: {runtime: 30, energy: 30},
            machine2: {runtime: 20, energy: 30},
            machine3: {runtime: 40, energy: 20},
            machine4: {runtime: 20, energy: 20},
        }
    },
    { 
        id: 4, 
        text: 'Job 5', 
        score: 10, 
        resources: {
            machine1: {runtime: 30, energy: 30},
            machine2: {runtime: 20, energy: 30},
            machine3: {runtime: 40, energy: 20},
            machine4: {runtime: 20, energy: 20},
        }
    },
];

// Sample list of data for droppable areas
const droppableList = {
    machine1: { id: 'machine1', text: 'Machine 1', max_power: 200, current_jobs: new Set()},
    machine2: { id: 'machine2', text: 'Machine 2', max_power: 400, current_jobs: new Set()},
    machine3: { id: 'machine3', text: 'Machine 3', max_power: 400, current_jobs: new Set()},
    machine4: { id: 'machine4', text: 'Machine 4', max_power: 300, current_jobs: new Set()}
};

const Resources = {
    energy: {text: "Energy", iconClass: "energy-icon"},
    runtime: {text: "Time", iconClass: "time-icon"},
    cost: {text: "Cost", iconClass: "cost-icon"}
}

function updateTimer() {
    timerValue.textContent = game_state.timeLeft;
}

// Score and progress bar functions
function updateScore() {
    scoreValue.textContent = game_state.score;
}

// Score and progress bar functions
function updateEnergy() {
    energyValue.textContent = game_state.total_energy;
}

function updateProgressBar() {
    const percent = (game_state.allocation / game_state.total_allocation) * 100; // Example: Update progress bar based on score
    progressBar.style.width = percent + '%';
}

function gameOver() {
    gameEnded = true;
    advanceButton.disabled = true; // Disable the advance button
    endGameButton.disabled = true;
    clearInterval(taskInterval);
    sendDataToServer(game_state);
    // Additional game over logic here if needed
    alert('Game Over! Your final score is ' + game_state.score);
}

function updateGameState() {
    //TODO: Check if we can run these jobs!!!
    if(game_state.allocation < round_state.allocation || game_state.timeLeft < round_state.time){
        return false;
    }

    game_state.score += round_state.score;
    game_state.allocation -= round_state.allocation;
    game_state.total_energy += round_state.energy;
    game_state.timeLeft -= round_state.time;

    Object.values(droppableList).forEach(machine => {
        machine.current_jobs.forEach(job_id => {
            const job = dataList[job_id];
            game_state.scheduling_decisions.push(job);
            const job_element = document.getElementById('item-' + job_id);
            job_element.remove();
        });
        machine.current_jobs.clear();

        Object.entries(Resources).forEach(([key, val]) => {
            const resourceVal = document.getElementById(machine.id + "-" + key);
            resourceVal.innerText = "" + 0;
        });
    });
    updateScore();
    updateProgressBar();
    updateTimer();
    updateEnergy();

    round_state.score = 0;
    document.getElementById('round-score-value').innerText = 0;
    round_state.allocation = 0;
    document.getElementById('round-cost-value').innerText = 0;
    round_state.time = 0;
    document.getElementById('round-time-value').innerText = 0;
    round_state.energy = 0;
    document.getElementById('round-energy-value').innerText = 0;

    if(game_state.allocation <= 0 || game_state.timeLeft <= 0){
        gameOver();
    }

    return true;
}

function updateRoundState() {
    let round_score = 0;
    let round_time = 0;
    let round_cost = 0;
    let round_energy = 0;

    Object.values(droppableList).forEach(machine => {
        machine.current_jobs.forEach(job_id => {
            const job = dataList[job_id];
            round_score += job.score;
            round_cost += job.resources[machine.id].cost;
            round_energy += job.resources[machine.id].energy
            round_time = Math.max(round_time, job.resources[machine.id].runtime);
        });
    });
    round_state.score = round_score;
    document.getElementById('round-score-value').innerText = round_score;
    round_state.allocation = round_cost;
    document.getElementById('round-cost-value').innerText = round_cost;
    round_state.time = round_time;
    document.getElementById('round-time-value').innerText = round_time;
    round_state.energy = round_energy;
    document.getElementById('round-energy-value').innerText = round_energy;
}

function dragStart(event) {
    event.dataTransfer.setData('text', event.target.id);
}

function dragEnd(event) {
    // Optional: You can add additional logic here after the drag operation ends
}

function dragOver(event) {
    event.preventDefault(); // Allow drop by preventing default behavior
}

function drop(event) {
    event.preventDefault();
    const data = event.dataTransfer.getData('text');
    const machine_element = event.currentTarget.parentElement;
    const machine = droppableList[machine_element.id];
    const draggableElement = document.getElementById(data);
    if (machine.current_jobs.size == 0) {
        // Append the draggable element to the droppable area
        event.target.appendChild(draggableElement);

        // Adjust the position of the draggable element relative to the droppable area
        // const rect = event.target.getBoundingClientRect();
        draggableElement.style.position = 'absolute';
        draggableElement.style.top = 0 + 'px';
        draggableElement.style.left = 0 + 'px';

        const job_id = data.split('-')[1];
        if ("current_machine" in dataList[job_id]){
            droppableList[dataList[job_id]["current_machine"]].current_jobs.delete(job_id);
        }
        machine.current_jobs.add(job_id);
        dataList[job_id]["current_machine"] = machine_element.id;

        Object.entries(Resources).forEach(([key, val]) => {
            const resourceVal = document.getElementById(machine.id + "-" + key);
            resourceVal.innerText = "" + dataList[job_id].resources[machine.id][key];
        });

        updateRoundState();
    }  else {
        // Provide feedback that dropping is not allowed
        console.log('Dropping not allowed in this area!');
        
        // Temporarily indicate not allowed by changing border color
        draggableElement.style.borderColor = 'red';
        setTimeout(function() {
            draggableElement.style.borderColor = ''; // Reset border color after a short delay
        }, 500); // Adjust the delay as needed (1000 milliseconds = 1 second)
    }
}

function sendDataToServer(data) {
    fetch('/submit_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (response.ok) {
            console.log('Data sent successfully.');
        } else {
            console.error('Error sending data:', response.statusText);
        }
    })
    .catch(error => {
        console.error('Error sending data:', error);
    });
}

function advanceButtonClick() {
    if(!updateGameState())
        console.log("Can not run the current set of jobs!");
}

function createDroppableAreas() {
    const droppableContainer = document.getElementById('system-area');

    // Clear existing content (if any)
    droppableContainer.innerHTML = '';

    // Iterate through droppableList and create droppable areas
    Object.values(droppableList).forEach(area => {
        const droppableArea = document.createElement('div');
        droppableArea.textContent = area.text;
        droppableArea.className = 'droppable';
        droppableArea.id = area.id;
        droppableContainer.appendChild(droppableArea);
        
        const task_slot = document.createElement('div');
        task_slot.className = 'slot';
        task_slot.textContent = "Task";
        droppableArea.appendChild(task_slot);
        task_slot.addEventListener('dragover', dragOver);
        task_slot.addEventListener('drop', drop);

        const resource_area = document.createElement('div');
        resource_area.className = 'resource-area';
        Object.entries(Resources).forEach(([key, val]) => {
            const resourceItem = document.createElement('div');
            resourceItem.classList.add('resource-item', key +"-info");
            const icon = document.createElement('span');
            icon.classList.add("resource-icon", val.iconClass);
            resourceItem.appendChild(icon);

            const resourceVal = document.createElement('span');
            resourceVal.id = area.id + "-" + key;
            resourceVal.innerText = "0";
            resourceItem.appendChild(resourceVal);
            resource_area.appendChild(resourceItem);
        });
        droppableArea.appendChild(resource_area);
        
    });
}

// Function to create draggable elements
function createDraggableElement() {
    if(game_state.job_idx >= dataList.length){
        return;
    }

    const container = document.getElementById('task-area');
    const item = dataList[game_state.job_idx];
    game_state.job_idx += 1;

    const draggableElement = document.createElement('div');
    const textSpan = document.createElement('span');
    textSpan.innerText = item.text + ' ' + "Score: " + item.score;
    draggableElement.appendChild(textSpan);
    draggableElement.classList.add('draggable', 'job');
    draggableElement.draggable = true;
    draggableElement.id = 'item-' + item.id;
    // Append draggable element to container
    container.appendChild(draggableElement);

    // const infoIcon = document.createElement('span');
    // infoIcon.className = 'info-icon';
    // infoIcon.innerHTML = '&#128712;';
    
    const infoContainer = document.createElement('div');
    infoContainer.className = 'info-container';
    infoContainer.id = 'info-' + item.id;
    infoContainer.innerText = "Job Resources: ";
    // draggableElement.appendChild(infoIcon);
    draggableElement.appendChild(infoContainer);

    Object.entries(item.resources).forEach(([machine, resources]) => {
        const info = document.createElement('div');
        info.className = "info-object";

        const infoHeader = document.createElement('span');
        infoHeader.innerText = droppableList[machine].text;
        infoHeader.className = "info-header";
        info.appendChild(infoHeader);

        Object.entries(resources).forEach(([key, val]) => {
            const infoItem = document.createElement('span');
            const icon = document.createElement('span');
            icon.classList.add("resource-icon", Resources[key].iconClass);
            infoItem.appendChild(icon);

            infoItem.innerHTML += ": " + val;
            infoItem.classList.add("info-item", key + "-info");
            info.appendChild(infoItem);
        });
        infoContainer.appendChild(info);
    });
    
    // Add event listeners for hover
    textSpan.addEventListener('mouseover', function(event) {
        infoContainer.style.display = 'block';
    });

    // textSpan.addEventListener('touchstart', function(event) {
    //     infoContainer.style.display = 'block';
    // });

    draggableElement.addEventListener('mouseout', function(event) {
        infoContainer.style.display = 'none';
    });
    // draggableElement.addEventListener('touchend', function(event) {
    //     infoContainer.style.display = 'none';
    // });

    // Add drag start event listener
    draggableElement.addEventListener('dragstart', dragStart);
    draggableElement.addEventListener('dragend', dragEnd);
}

function traditionalCostFormula(machine, runtime, energy) {
    return runtime;
}

function energyCostFormula(machine, runtime, energy) {
    return ((droppableList[machine].max_power) * runtime + energy) / 2
}

function calculateCosts(cost_function) {
    dataList.forEach(item => {
        Object.entries(item.resources).forEach(([machine, resources]) => {
            const cost = cost_function(machine, resources.runtime, resources.energy);
            resources.cost = cost;
        });
    });
}

// Define a variable to hold the function pointer
let cost_function;

// Get the URL parameters
const urlParams = new URLSearchParams(window.location.search);
let version = urlParams.get('version');

// Array of available game versions
const availableVersions = ['1', '2', '3']; // Add more versions as needed

// If version is not specified or is invalid, choose a random version
if (!version || !availableVersions.includes(version)) {
    version = availableVersions[Math.floor(Math.random() * availableVersions.length)];
}

// Assign the function pointer based on the version
switch (version) {
    case '1':
        const style = document.createElement('style');
        document.head.appendChild(style);
        style.sheet.insertRule('.energy-info { display: none; }', 0);
        cost_function = traditionalCostFormula;
        break;
    case '2':
        cost_function = traditionalCostFormula;
        break;
    case '3':
        cost_function = energyCostFormula;
        break;
    default:
        console.log("An Error ocurred initializing the game!");
        break;
}

game_state.version = version;

calculateCosts(cost_function);
createDroppableAreas();
createDraggableElement();
createDraggableElement();
let taskInterval = setInterval(createDraggableElement, 10000);
// Add event listeners
advanceButton.addEventListener('click', advanceButtonClick);
endGameButton.addEventListener('click', gameOver);