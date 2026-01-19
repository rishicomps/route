const STORAGE_KEY = "schedula-data";

const defaultData = {
  tasks: [
    {
      id: crypto.randomUUID(),
      title: "Morning prep",
      time: "07:30",
      duration: 45,
      items: ["Notebook", "Pen", "Tea leaves"],
      steps: [
        { text: "Review daily agenda", link: "https://www.youtube.com/watch?v=G1IbRujko-A" },
        { text: "Steep tea and hydrate", link: "https://www.youtube.com/watch?v=G1IbRujko-A" },
      ],
    },
    {
      id: crypto.randomUUID(),
      title: "Deep work sprint",
      time: "09:00",
      duration: 90,
      items: ["Headphones", "Timer"],
      steps: [
        { text: "Set focus timer", link: "https://www.youtube.com/watch?v=9QiE-M1LrZk" },
        { text: "Single-task for 45 minutes", link: "https://www.youtube.com/watch?v=9QiE-M1LrZk" },
      ],
    },
  ],
  inventory: [
    { id: crypto.randomUUID(), name: "Notebook", qty: 2 },
    { id: crypto.randomUUID(), name: "Pen", qty: 6 },
    { id: crypto.randomUUID(), name: "Tea leaves", qty: 1 },
    { id: crypto.randomUUID(), name: "Headphones", qty: 1 },
    { id: crypto.randomUUID(), name: "Timer", qty: 1 },
  ],
};

const timetableEl = document.getElementById("timetable");
const inventoryEl = document.getElementById("inventory");
const inspectorEl = document.getElementById("inspector");
const inspectorTagEl = document.getElementById("inspector-tag");
const addTaskBtn = document.getElementById("add-task-btn");
const taskDialog = document.getElementById("task-dialog");
const taskForm = document.getElementById("task-form");
const cancelTaskBtn = document.getElementById("cancel-task");
const resetBtn = document.getElementById("reset-btn");
const inventoryForm = document.getElementById("inventory-form");

let state = loadState();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (error) {
      console.warn("Failed to parse stored data", error);
    }
  }
  return structuredClone(defaultData);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  renderTimetable();
  renderInventory();
}

function renderTimetable() {
  timetableEl.innerHTML = "";
  const sorted = [...state.tasks].sort((a, b) => a.time.localeCompare(b.time));

  sorted.forEach((task) => {
    const card = document.createElement("article");
    card.className = "task-card";
    card.dataset.taskId = task.id;

    const title = document.createElement("h3");
    title.textContent = task.title;

    const meta = document.createElement("div");
    meta.className = "task-meta";
    meta.innerHTML = `<span>${task.time}</span><span>${task.duration} min</span>`;

    const items = document.createElement("div");
    items.className = "task-items";
    task.items.forEach((item) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = item;
      items.appendChild(chip);
    });

    const stepsWrapper = document.createElement("div");
    stepsWrapper.className = "steps";
    stepsWrapper.hidden = true;

    task.steps.forEach((step, index) => {
      const stepEl = document.createElement("div");
      stepEl.className = "step";
      stepEl.innerHTML = `<strong>Step ${index + 1}:</strong><span>${step.text}</span>`;
      if (step.link) {
        const link = document.createElement("a");
        link.href = step.link;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = "Open YouTube";
        stepEl.appendChild(link);
      }
      stepsWrapper.appendChild(stepEl);
    });

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "ghost";
    toggleBtn.type = "button";
    toggleBtn.textContent = "Show steps";
    toggleBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      stepsWrapper.hidden = !stepsWrapper.hidden;
      toggleBtn.textContent = stepsWrapper.hidden ? "Show steps" : "Hide steps";
    });

    card.append(title, meta, items, toggleBtn, stepsWrapper);
    card.addEventListener("click", () => showTaskInspector(task));
    timetableEl.appendChild(card);
  });
}

function renderInventory() {
  inventoryEl.innerHTML = "";
  state.inventory
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((item) => {
      const row = document.createElement("div");
      row.className = "inventory-item";
      row.dataset.inventoryId = item.id;
      row.innerHTML = `<strong>${item.name}</strong><span>${item.qty} available</span>`;
      row.addEventListener("click", () => showInventoryInspector(item));
      inventoryEl.appendChild(row);
    });
}

function showTaskInspector(task) {
  inspectorTagEl.textContent = "Task details";
  inspectorEl.innerHTML = "";

  const title = document.createElement("h3");
  title.textContent = task.title;

  const meta = document.createElement("p");
  meta.className = "subtitle";
  meta.textContent = `${task.time} · ${task.duration} minutes`;

  const items = document.createElement("div");
  items.className = "task-items";
  task.items.forEach((item) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = item;
    items.appendChild(chip);
  });

  const stepsHeader = document.createElement("h4");
  stepsHeader.textContent = "Steps";

  const steps = document.createElement("div");
  steps.className = "steps";
  task.steps.forEach((step, index) => {
    const stepEl = document.createElement("div");
    stepEl.className = "step";
    stepEl.innerHTML = `<strong>Step ${index + 1}</strong><span>${step.text}</span>`;
    if (step.link) {
      const link = document.createElement("a");
      link.href = step.link;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = "Open YouTube";
      stepEl.appendChild(link);
    }
    steps.appendChild(stepEl);
  });

  const removeBtn = document.createElement("button");
  removeBtn.className = "danger";
  removeBtn.textContent = "Remove task";
  removeBtn.addEventListener("click", () => {
    state.tasks = state.tasks.filter((entry) => entry.id !== task.id);
    saveState();
    render();
    resetInspector();
  });

  inspectorEl.append(title, meta, items, stepsHeader, steps, removeBtn);
}

function showInventoryInspector(item) {
  inspectorTagEl.textContent = "Inventory details";
  inspectorEl.innerHTML = "";

  const title = document.createElement("h3");
  title.textContent = item.name;

  const available = document.createElement("p");
  available.className = "subtitle";
  available.textContent = `${item.qty} available`;

  const usageList = document.createElement("div");
  usageList.className = "steps";
  const relevantTasks = state.tasks.filter((task) => task.items.includes(item.name));

  if (relevantTasks.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No tasks require this item.";
    usageList.appendChild(empty);
  } else {
    relevantTasks.forEach((task) => {
      const row = document.createElement("div");
      row.className = "step";
      row.innerHTML = `<strong>${task.title}</strong><span>${task.time} · ${task.duration} min</span>`;
      usageList.appendChild(row);
    });
  }

  const quantityControls = document.createElement("div");
  quantityControls.className = "task-items";

  const decrementBtn = document.createElement("button");
  decrementBtn.textContent = "-";
  decrementBtn.type = "button";
  decrementBtn.addEventListener("click", () => updateInventoryQty(item.id, -1));

  const incrementBtn = document.createElement("button");
  incrementBtn.textContent = "+";
  incrementBtn.type = "button";
  incrementBtn.addEventListener("click", () => updateInventoryQty(item.id, 1));

  const removeBtn = document.createElement("button");
  removeBtn.className = "danger";
  removeBtn.textContent = "Remove item";
  removeBtn.type = "button";
  removeBtn.addEventListener("click", () => {
    state.inventory = state.inventory.filter((entry) => entry.id !== item.id);
    saveState();
    render();
    resetInspector();
  });

  quantityControls.append(decrementBtn, incrementBtn, removeBtn);

  inspectorEl.append(title, available, usageList, quantityControls);
}

function updateInventoryQty(id, delta) {
  const entry = state.inventory.find((item) => item.id === id);
  if (!entry) return;
  entry.qty = Math.max(0, entry.qty + delta);
  saveState();
  render();
  showInventoryInspector(entry);
}

function resetInspector() {
  inspectorTagEl.textContent = "Select a task or item";
  inspectorEl.innerHTML = "<p class=\"empty\">Click a task or inventory item to see details.</p>";
}

function parseSteps(raw) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [textPart, linkPart] = line.split("|").map((part) => part.trim());
      return {
        text: textPart,
        link: linkPart || "",
      };
    });
}

function parseItems(raw) {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

addTaskBtn.addEventListener("click", () => taskDialog.showModal());

cancelTaskBtn.addEventListener("click", () => taskDialog.close());

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = document.getElementById("task-title").value.trim();
  const time = document.getElementById("task-time").value;
  const duration = Number.parseInt(document.getElementById("task-duration").value, 10);
  const items = parseItems(document.getElementById("task-items").value);
  const steps = parseSteps(document.getElementById("task-steps").value);

  const newTask = {
    id: crypto.randomUUID(),
    title,
    time,
    duration,
    items,
    steps,
  };

  state.tasks.push(newTask);
  saveState();
  render();
  taskForm.reset();
  taskDialog.close();
});

inventoryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const nameInput = document.getElementById("inventory-name");
  const qtyInput = document.getElementById("inventory-qty");

  const name = nameInput.value.trim();
  const qty = Number.parseInt(qtyInput.value, 10);

  if (!name) return;

  const existing = state.inventory.find((item) => item.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    existing.qty += qty;
  } else {
    state.inventory.push({
      id: crypto.randomUUID(),
      name,
      qty,
    });
  }

  saveState();
  render();
  nameInput.value = "";
  qtyInput.value = "1";
});

resetBtn.addEventListener("click", () => {
  state = structuredClone(defaultData);
  saveState();
  render();
  resetInspector();
});

render();
