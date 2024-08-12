/* script.js */

// Select elements
const advanceButton = document.getElementById('advance-button');
const endGameButton = document.getElementById('end-game-button');
const newGameButton = document.getElementById('new-game-button');
const completedValue = document.getElementById('completed-value');
const progressBar = document.getElementById('progress-bar-inner');
const progressBarLabel = document.getElementById('progress-bar-label');
const timerValue = document.getElementById('timer-value');
const energyValue = document.getElementById('energy-value');

advanceButton.addEventListener('click', advanceButtonClick);
endGameButton.addEventListener('click', gameOver);
newGameButton.addEventListener('click', newGame);


function generateUniqueId() {
    let array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0].toString(36);
}

const game_state = {
    jobs_completed: 0,
    timeLeft: 100,
    total_allocation: 100,
    allocation: 100,
    total_energy: 0,
    total_runtime: 0,
    scheduling_decisions: {},
    job_idx: 0,
    userID: "",
    plays: 0,
    visits: 0,
    group: 0,
    startTime: Date.now(),
    gameTime: 0,
};

const dataList = await fetch('./sample_jobs.json')
    .then((response) => response.json());

// Sample list of data for droppable areas
// Max Power is TDP for 100 nodes in kW
const droppableList = {
    machine1: { id: 'machine1', text: 'Machine 1', max_power: 20, current_job: null},
    machine2: { id: 'machine2', text: 'Machine 2', max_power: 40, current_job: null},
    machine3: { id: 'machine3', text: 'Machine 3', max_power: 40, current_job: null},
    machine4: { id: 'machine4', text: 'Machine 4', max_power: 30, current_job: null}
};

const Resources = {
    energy: {text: "Energy", iconClass: "energy-icon"},
    runtime: {text: "Time", iconClass: "time-icon"},
    cost: {text: "Cost", iconClass: "cost-icon"}
}

const treatmentGroups = [
    ['1', '1', '2'],
    ['2', '2', '1'],
    ['1', '1', '3'],
    ['3', '3', '1'],
    ['2', '2', '3'],
    ['3', '3', '2']
]

function setCookie(cookieName, cookieValue, expirationDays) {
    var d = new Date();
    d.setTime(d.getTime() + (expirationDays * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toUTCString();
    document.cookie = cookieName + "=" + cookieValue + ";" + expires + ";path=/";
}

// Function to get the value of a cookie
function getCookie(cookieName) {
    var name = cookieName + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var cookieArray = decodedCookie.split(';');
    for (var i = 0; i < cookieArray.length; i++) {
        var cookie = cookieArray[i];
        while (cookie.charAt(0) === ' ') {
            cookie = cookie.substring(1);
        }
        if (cookie.indexOf(name) === 0) {
            return cookie.substring(name.length, cookie.length);
        }
    }
    return "";
}

function trackUser() {
    var group  = 0;
    var userID = getCookie("userID");
    if (userID  === "") {
        userID = generateUniqueId();
        group = Math.floor(Math.random() * treatmentGroups.length);

        setCookie("userID", userID, 30);
        setCookie("treatmentGroup", group, 30);
    } else {
        group = parseInt(getCookie("treatmentGroup"));
    }
    console.log("User: ", userID, "Treatment Group: ", group);
    return {"id": userID, "group": group};
}

function trackVisits() {
    var visitCount = getCookie("visitCount");
    if (visitCount === "") {
        visitCount = 1;
    } else {
        visitCount = parseInt(visitCount) + 1;
    }
    setCookie("visitCount", visitCount, 30);

    return visitCount;
}

function getPlays() {
    var playCount = getCookie("playCount");
    if (playCount === "") {
        playCount = 0;
    } else {
	playCount = parseInt(playCount);
    }
    return playCount;
}


function updateTimer() {
    timerValue.textContent = game_state.timeLeft;
}

function updateCompleted() {
    completedValue.textContent = Math.round(game_state.jobs_completed);
}

function updateEnergy() {
    energyValue.textContent = Math.round(game_state.total_energy);
}

function updateProgressBar() {
    const percent = (game_state.allocation / game_state.total_allocation) * 100;
    progressBar.style.width = percent + '%';
    progressBarLabel.innerText = Math.round(game_state.allocation);
}


function newGame() {
    location.reload();
}

function gameOver() {
    advanceButton.disabled = true; // Disable the advance button
    endGameButton.disabled = true;
    newGameButton.disabled = false;
    game_state.plays += 1;
    setCookie("playCount", game_state.plays, 30); 
    sendDataToServer(game_state);
    alert('Game Over! You completed ' + Math.round(game_state.jobs_completed) + ' jobs!');
}

function updateGameState() {
    // Find time to advance
    let advance_time = 0;
    Object.values(droppableList).forEach(machine => {
        if(machine.current_job != null) {
            const job = dataList[machine.current_job];
            if(advance_time == 0) {
                advance_time = job.resources[machine.id].runtime;
            }
            advance_time = Math.min(advance_time, job.resources[machine.id].runtime);
        }
    });
    console.log(advance_time);

    // Find allocation and jobs completed
    let allocation_used = 0;
    let energy_used = 0
    let jobs_completed = 0;
    Object.values(droppableList).forEach(machine => {
        if(machine.current_job != null) {
            const job = dataList[machine.current_job];
            if(advance_time >= job.resources[machine.id].runtime){
                jobs_completed += 1
            }
            
            const job_proportion = advance_time/job.resources[machine.id].runtime;
            allocation_used += job_proportion * job.resources[machine.id].cost;
            energy_used += job_proportion * job.resources[machine.id].energy;
        }
    });

    //TODO: Check if we can run these jobs!!!
    if(game_state.allocation < allocation_used || game_state.timeLeft < advance_time){
        return false;
    }

    let scheduling_decisions = {}
    Object.values(droppableList).forEach(machine => {
        if(machine.current_job != null) {
            const job = dataList[machine.current_job];
            const job_proportion = advance_time/job.resources[machine.id].runtime;
	    scheduling_decisions[machine.id] = [machine.current_job, job_proportion];

            job.resources[machine.id].runtime -= advance_time;
	    game_state.total_runtime += advance_time;
            job.resources[machine.id].cost = (1-job_proportion) * job.resources[machine.id].cost;
            job.resources[machine.id].energy = (1-job_proportion) * job.resources[machine.id].energy;

            const job_element = document.getElementById('item-' + machine.current_job);
            if(job.resources[machine.id].runtime == 0){
                job_element.remove();
                createDraggableElement();
                machine.current_job = null;
                Object.entries(Resources).forEach(([key, val]) => {
                    const resourceVal = document.getElementById(machine.id + "-" + key);
                    resourceVal.innerText = 0;
                });
            } else {
                job_element.draggable = false;
                job_element.classList.add("pinned");
                job.running = true;
                Object.entries(Resources).forEach(([key, val]) => {
                    const resourceVal = document.getElementById(machine.id + "-" + key);
                    resourceVal.innerText = Math.round(job.resources[machine.id][key]);
                });
            }
        }
    });

    game_state.jobs_completed += jobs_completed;
    game_state.allocation -= allocation_used;
    game_state.total_energy += energy_used;
    game_state.scheduling_decisions[game_state.timeLeft] = scheduling_decisions;
    game_state.timeLeft -= advance_time;
    game_state.gameTime = Date.now() - game_state.startTime;

    updateCompleted();
    updateProgressBar();
    updateTimer();
    updateEnergy();
    // updateRoundState();

    if(game_state.allocation <= 0 || game_state.timeLeft <= 0){
        gameOver();
    }

    return true;
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
    if (machine.current_job == null) {
        // Append the draggable element to the droppable area
        event.target.appendChild(draggableElement);

        // Adjust the position of the draggable element relative to the droppable area
        // const rect = event.target.getBoundingClientRect();
        draggableElement.style.position = 'absolute';
        draggableElement.style.top = 0 + 'px';
        draggableElement.style.left = 0 + 'px';

        const job_id = data.split('-')[1];
        if ("current_machine" in dataList[job_id]){
            let machine_id = dataList[job_id]["current_machine"];
            droppableList[machine_id].current_job = null;
            Object.entries(Resources).forEach(([key, val]) => {
                const resourceVal = document.getElementById(machine_id + "-" + key);
                resourceVal.innerText = 0;
            });
        }
        machine.current_job = job_id;
        dataList[job_id]["current_machine"] = machine_element.id;

        Object.entries(Resources).forEach(([key, val]) => {
            const resourceVal = document.getElementById(machine.id + "-" + key);
            resourceVal.innerText = Math.round(dataList[job_id].resources[machine.id][key]);
        });

        // updateRoundState();
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

function dropTaskArea(event) {
    console.log("Dropped task back in task area");
    event.preventDefault();
    const data = event.dataTransfer.getData('text');
    const draggableElement = document.getElementById(data);
    event.currentTarget.appendChild(draggableElement);
    draggableElement.style.position = 'relative';

    const job_id = data.split('-')[1];
    if ("current_machine" in dataList[job_id]){
        let machine_id = dataList[job_id]["current_machine"];
        droppableList[machine_id].current_job = null;
        Object.entries(Resources).forEach(([key, val]) => {
            const resourceVal = document.getElementById(machine_id + "-" + key);
            resourceVal.innerText = 0;
        });
    }
    // updateRoundState();
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
        alert("Can not run the current set of jobs!");
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
    textSpan.innerHTML = "<span>" +  item.text + "</span> <span class=\"" + item.importance.replace(" ", "-") + "\"> (Priority: " + item.importance + ")</span>"
    textSpan.classList.add("job-title");
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
    infoContainer.innerHTML = "<span>" + item.text + "</span> <span class=\"" + item.importance.replace(" ", "-") + "\"> Priority: " + item.importance + "</span>";
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

            infoItem.innerHTML += ": " + parseFloat(val.toFixed(1));
            infoItem.classList.add("info-item", key + "-info");
            info.appendChild(infoItem);
        });
        infoContainer.appendChild(info);
    });
    
    // Add event listeners for hover
    textSpan.addEventListener('mouseover', function(event) {
        if(!dataList[item.id].running){
            infoContainer.style.display = 'block';
        }
    });
    draggableElement.addEventListener('click', function(event) {
        infoContainer.style.display = 'none';
    });

    draggableElement.addEventListener('mouseout', function(event) {
        infoContainer.style.display = 'none';
    });

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

function initializeJobs(cost_function) {
    dataList.forEach(item => {
        Object.entries(item.resources).forEach(([machine, resources]) => {
            const cost = cost_function(machine, resources.runtime, resources.energy);
            resources.cost = cost;
        });
        item.running = false;
    });
}


function initialize() {
    // Call the trackVisits function when the page loads
    const user = trackUser();
    game_state.userID = user["id"];
    game_state.group = user["group"];
    game_state.visits = trackVisits();
    game_state.plays = getPlays();

    console.log("Number of visits: ", game_state.visits);

    // Define a variable to hold the function pointer
    let cost_function;

    // Get the URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    let version = urlParams.get('version');

    // Array of available game versions
    const availableVersions = ['1', '2', '3']; // Add more versions as needed

    // If version is not specified or is invalid, choose a random version
    if (!version || !availableVersions.includes(version)) {
        version = treatmentGroups[game_state.group][game_state.plays % treatmentGroups[game_state.group].length];
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
            game_state.total_allocation = 1400;
            game_state.allocation = game_state.total_allocation;
            break;
        default:
            console.log("An Error ocurred initializing the game!");
            break;
    }
    updateProgressBar();
    game_state.version = version;

    initializeJobs(cost_function);
    const taskArea = document.getElementById('task-area');
    taskArea.addEventListener('dragover', dragOver);
    taskArea.addEventListener('drop', dropTaskArea);
    createDroppableAreas();

    for(let i = 0; i < 5; i++){
        createDraggableElement();
    }
}

initialize();
