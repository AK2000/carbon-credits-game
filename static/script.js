/* script.js */

// Select elements
const droppableArea = document.getElementById('droppable-area');
const advanceButton = document.getElementById('advance-button');
const scoreValue = document.getElementById('score-value');
const progressBar = document.getElementById('progress-bar-inner');
const timerValue = document.getElementById('timer-value');

function generateUniqueId() {
    let array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0].toString(36);
}

// Add event listeners
advanceButton.addEventListener('click', advanceButtonClick);

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
}

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
    machine1: { id: 'machine1', text: 'Machine 1', current_jobs: new Set()},
    machine2: { id: 'machine2', text: 'Machine 2', current_jobs: new Set()},
    machine3: { id: 'machine3', text: 'Machine 3', current_jobs: new Set()},
    machine4: { id: 'machine4', text: 'Machine 4', current_jobs: new Set()}
};

const Resources = {
    energy: {text: "Energy", iconClass: "energy-icon"},
    runtime: {text: "Time", iconClass: "time-icon"},
    cost: {text: "Cost", iconClass: "cost-icon"}
}

function updateTimer(expired) {
    game_state.timeLeft -= expired;
    timerValue.textContent = game_state.timeLeft;

    if (game_state.timeLeft <= 0) {
        gameOver();
    }
}

// Score and progress bar functions
function updateScore(points) {
    game_state.score += points;
    scoreValue.textContent = game_state.score;
}

function updateProgressBar(credits) {
    game_state.allocation -= credits;
    const percent = (game_state.allocation / game_state.total_allocation) * 100; // Example: Update progress bar based on score
    progressBar.style.width = percent + '%';

    if(game_state.allocation <= 0) {
        gameOver();
    }
}

function gameOver() {
    gameEnded = true;
    advanceButton.disabled = true; // Disable the advance button
    clearInterval(taskInterval);
    // Additional game over logic here if needed
    alert('Game Over! Your final score is ' + game_state.score);
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
    if (draggableElement) {
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
    let round_score = 0;
    let round_time = 0;
    let round_cost = 0;

    Object.values(droppableList).forEach(machine => {
        machine.current_jobs.forEach(job_id => {
            const job = dataList[job_id];
            round_score += job.score;
            round_cost += job.resources[machine.id].energy;
            round_time = Math.max(round_time, job.resources[machine.id].runtime);
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

    updateScore(round_score);
    updateProgressBar(round_cost);
    updateTimer(round_time);

    sendDataToServer(game_state);
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
            resourceItem.className = 'resource-item';
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
            infoItem.className = "info-item";
            info.appendChild(infoItem);
        });
        infoContainer.appendChild(info);
    });
    
    // Add event listeners for hover
    textSpan.addEventListener('mouseover', function() {
        infoContainer.style.display = 'block';
    });

    textSpan.addEventListener('mouseout', function() {
        infoContainer.style.display = 'none';
    });

    // Add drag start event listener
    draggableElement.addEventListener('dragstart', dragStart);
    draggableElement.addEventListener('dragend', dragEnd);
}

function costFormula(machine, runtime, energy) {
    return energy;
}

function calculateCosts() {
    dataList.forEach(item => {
        Object.entries(item.resources).forEach(([machine, resources]) => {
            const cost = costFormula(machine, resources.runtime, resources.energy);
            resources.cost = cost;
        });
    });
}

calculateCosts();
createDroppableAreas();
createDraggableElement();
createDraggableElement();
let taskInterval = setInterval(createDraggableElement, 10000);