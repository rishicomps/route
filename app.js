// Routé — micro-managing timetable (LocalStorage)
// Requirements implemented:
// - Default view: timetable shows ONLY start/end/duration
// - Click task: reveals steps + required items (grouped under the task)
// - Inventory is a drawer, opened only when clicked
// - Clicking a required item shows availability in Inspector (and can open drawer)

const STORAGE_KEY = "route_state_v2";

/** @type {{inventory: Record<string, {qty:number, unit:string}>, schedule: any[]}} */
let state = loadState();

const els = {
  timetable: document.getElementById("timetable"),
  inspector: document.getElementById("inspector"),

  inventoryToggleBtn: document.getElementById("inventoryToggleBtn"),
  inventoryDrawer: document.getElementById("inventoryDrawer"),
  closeInventoryBtn: document.getElementById("closeInventoryBtn"),
  inventoryList: document.getElementById("inventoryList"),

  inventoryForm: document.getElementById("inventoryForm"),
  invName: document.getElementById("invName"),
  invQty: document.getElementById("invQty"),
  invUnit: document.getElementById("invUnit"),

  exportBtn: document.getElementById("exportBtn"),
  importBtn: document.getElementById("importBtn"),
  resetBtn: document.getElementById("resetBtn"),

  importDialog: document.getElementById("importDialog"),
  importText: document.getElementById("importText"),
  doImportBtn: document.getElementById("doImportBtn"),

  addTaskBtn: document.getElementById("addTaskBtn"),
  taskDialog: document.getElementById("taskDialog"),
  taskTime: document.getElementById("taskTime"),
  taskDuration: document.getElementById("taskDuration"),
  taskTitle: document.getElementById("taskTitle"),
  taskNotes: document.getElementById("taskNotes"),
  saveTaskBtn: document.getElementById("saveTaskBtn"),
};

// ---------- Storage ----------
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return demoState();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.inventory || !parsed.schedule) throw new Error("bad");
    return parsed;
  } catch {
    return demoState();
  }
}

function demoState() {
  return {
    inventory: {
      "Notebook": { qty: 2, unit: "" },
      "Pen": { qty: 6, unit: "" },
      "Tea leaves": { qty: 1, unit: "pack" },
      "Timer": { qty: 1, unit: "" },
      "Headphones": { qty: 1, unit: "" },
      "Yoga mat": { qty: 1, unit: "" },
      "Eggs": { qty: 6, unit: "pcs" },
      "Milk": { qty: 500, unit: "ml" },
    },
    schedule: [
      {
        id: uid(),
        time: "07:30",
        durationMins: 45,
        title: "Morning prep",
        notes: "",
        steps: [
          { name: "Review daily agenda", link: "https://www.youtube.com/results?search_query=morning+planning+routine" },
          { name: "Steep tea and hydrate", link: "https://www.youtube.com/results?search_query=how+to+make+tea" },
        ],
        required: [
          { name: "Notebook", qty: 1, unit: "" },
          { name: "Pen", qty: 1, unit: "" },
          { name: "Tea leaves", qty: 1, unit: "pack" },
          { name: "Timer", qty: 1, unit: "" },
        ],
      },
      {
        id: uid(),
        time: "09:00",
        durationMins: 90,
        title: "Deep work sprint",
        notes: "",
        steps: [
          { name: "Focus music (optional)", link: "https://www.youtube.com/results?search_query=deep+work+music" },
          { name: "Pomodoro 45/10", link: "https://www.youtube.com/results?search_query=pomodoro+timer+45+10" },
        ],
        required: [
          { name: "Headphones", qty: 1, unit: "" },
          { name: "Timer", qty: 1, unit: "" },
        ],
      },
      {
        id: uid(),
        time: "19:00",
        durationMins: 60,
        title: "Cooking",
        notes: "",
        steps: [
          { name: "Omelette (basic)", link: "https://www.youtube.com/results?search_query=basic+omelette+recipe" },
        ],
        required: [
          { name: "Eggs", qty: 2, unit: "pcs" },
          { name: "Milk", qty: 50, unit: "ml" },
        ],
      }
    ],
  };
}

// ---------- Helpers ----------
function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function normalizeName(name) {
  return (name || "").trim();
}

function fmtQty(qty, unit) {
  if (qty === null || qty === undefined || qty === "") return "";
  const num = Number(qty);
  if (Number.isNaN(num)) return "";
  const clean = Number.isInteger(num) ? String(num) : String(num);
  return unit ? `${clean} ${unit}` : `${clean}`;
}

function minutesToEndTime(startHHMM, durationMins) {
  const [h, m] = startHHMM.split(":").map(Number);
  const start = h * 60 + m;
  const end = start + Number(durationMins || 0);
  const eh = Math.floor((end % (24 * 60)) / 60);
  const em = end % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}

function sortSchedule() {
  state.schedule.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openDrawer() {
  els.inventoryDrawer.classList.add("open");
  els.inventoryDrawer.setAttribute("aria-hidden", "false");
}

function closeDrawer() {
  els.inventoryDrawer.classList.remove("open");
  els.inventoryDrawer.setAttribute("aria-hidden", "true");
}

// ---------- Rendering ----------
function renderAll() {
  sortSchedule();
  saveState();
  renderTimetable();
  renderInventoryList();
}

function renderTimetable() {
  els.timetable.innerHTML = "";

  if (state.schedule.length === 0) {
    els.timetable.innerHTML = `<p class="muted">No timetable items yet. Add one.</p>`;
    return;
  }

  state.schedule.forEach(task => {
    const endTime = minutesToEndTime(task.time, task.durationMins);

    const wrap = document.createElement("div");
    wrap.className = "task";

    // IMPORTANT: head shows ONLY time range + duration (no required items shown)
    const head = document.createElement("div");
    head.className = "task-head";

    const left = document.createElement("div");
    left.innerHTML = `
      <b>${escapeHtml(task.title)}</b>
      <div class="task-meta">${escapeHtml(task.time)}–${escapeHtml(endTime)} • ${escapeHtml(String(task.durationMins))} min</div>
    `;

    const right = document.createElement("span");
    right.className = "pill";
    right.textContent = "Open";

    head.appendChild(left);
    head.appendChild(right);

    const body = document.createElement("div");
    body.className = "task-body";

    // Steps block
    const stepsBlock = document.createElement("div");
    stepsBlock.className = "block";
    stepsBlock.innerHTML = `<h4>Steps</h4>`;
    const stepsList = document.createElement("div");
    stepsList.className = "list";

    (task.steps || []).forEach((s, idx) => {
      const row = document.createElement("div");
      row.className = "step";
      const a = document.createElement("a");
      a.href = s.link || "#";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = s.name || `Step ${idx + 1}`;
      row.appendChild(a);

      if (s.link) {
        const meta = document.createElement("span");
        meta.className = "meta";
        meta.textContent = "↗";
        row.appendChild(meta);
      }
      stepsList.appendChild(row);
    });

    if ((task.steps || []).length === 0) {
      stepsList.innerHTML = `<p class="muted small">No steps yet.</p>`;
    }

    stepsBlock.appendChild(stepsList);

    // Required items block (grouped UNDER THIS TASK)
    const reqBlock = document.createElement("div");
    reqBlock.className = "block";
    reqBlock.innerHTML = `<h4>Required items for: ${escapeHtml(task.title)}</h4>`;
    const reqList = document.createElement("div");
    reqList.className = "list";

    (task.required || []).forEach(req => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "item-btn";

      const have = state.inventory[normalizeName(req.name)];
      const haveText = have ? fmtQty(have.qty, have.unit) : "0";

      const needText = (req.qty === "" || req.qty === null || req.qty === undefined)
        ? ""
        : fmtQty(req.qty, req.unit);

      btn.innerHTML = `
        <span>
          ${escapeHtml(req.name)}
          ${needText ? `<span class="muted small"> • need ${escapeHtml(needText)}</span>` : ""}
        </span>
        <span class="pill">${escapeHtml(haveText)} have</span>
      `;

      btn.addEventListener("click", () => showInspector(req, task));
      reqList.appendChild(btn);
    });

    if ((task.required || []).length === 0) {
      reqList.innerHTML = `<p class="muted small">No required items yet.</p>`;
    }

    // manage task tools
    const tools = document.createElement("div");
    tools.className = "list";
    tools.style.marginTop = "12px";

    const addStepBtn = document.createElement("button");
    addStepBtn.type = "button";
    addStepBtn.className = "ghost";
    addStepBtn.textContent = "Add step";
    addStepBtn.addEventListener("click", () => addStepPrompt(task));

    const addReqBtn = document.createElement("button");
    addReqBtn.type = "button";
    addReqBtn.className = "ghost";
    addReqBtn.textContent = "Add required item";
    addReqBtn.addEventListener("click", () => addRequiredPrompt(task));

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "danger";
    delBtn.textContent = "Delete task";
    delBtn.addEventListener("click", () => {
      state.schedule = state.schedule.filter(t => t.id !== task.id);
      renderAll();
      els.inspector.innerHTML = `<p class="muted">Deleted.</p>`;
    });

    tools.appendChild(addStepBtn);
    tools.appendChild(addReqBtn);
    tools.appendChild(delBtn);

    reqBlock.appendChild(reqList);
    reqBlock.appendChild(tools);

    body.appendChild(stepsBlock);
    body.appendChild(reqBlock);

    head.addEventListener("click", () => {
      body.classList.toggle("open");
      right.textContent = body.classList.contains("open") ? "Close" : "Open";
    });

    wrap.appendChild(head);
    wrap.appendChild(body);
    els.timetable.appendChild(wrap);
  });
}

function renderInventoryList() {
  els.inventoryList.innerHTML = "";
  const entries = Object.entries(state.inventory).sort((a,b) => a[0].localeCompare(b[0]));

  if (entries.length === 0) {
    els.inventoryList.innerHTML = `<p class="muted">No inventory yet.</p>`;
    return;
  }

  entries.forEach(([name, obj]) => {
    const row = document.createElement("div");
    row.className = "inv-row";
    row.innerHTML = `
      <span>${escapeHtml(name)}</span>
      <span class="pill">${escapeHtml(fmtQty(obj.qty, obj.unit))}</span>
    `;
    els.inventoryList.appendChild(row);
  });
}

function showInspector(req, task) {
  const key = normalizeName(req.name);
  const have = state.inventory[key];
  const haveQty = have ? Number(have.qty) : 0;
  const needQty =
    (req.qty === "" || req.qty === null || req.qty === undefined) ? null : Number(req.qty);

  let status = "";
  if (needQty === null || Number.isNaN(needQty)) {
    status = "No required quantity set.";
  } else {
    status = haveQty >= needQty ? "✅ You have enough." : "⚠️ You may need to buy more.";
  }

  els.inspector.innerHTML = `
    <div>
      <h3 style="margin:0 0 6px;">${escapeHtml(req.name)}</h3>
      <p class="muted" style="margin:0 0 10px;">
        For: <b>${escapeHtml(task.title)}</b> (${escapeHtml(task.time)})
      </p>

      <div class="inv-row">
        <span>Needed</span>
        <span class="pill">${escapeHtml(needQty === null ? "—" : fmtQty(needQty, req.unit))}</span>
      </div>

      <div class="inv-row" style="margin-top:8px;">
        <span>You have</span>
        <span class="pill">${escapeHtml(have ? fmtQty(have.qty, have.unit) : "0")}</span>
      </div>

      <p class="small muted" style="margin-top:10px;">${escapeHtml(status)}</p>

      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button type="button" class="ghost" id="openInvBtn">Open inventory</button>
        <button type="button" class="ghost" id="consumeBtn">Consume needed qty</button>
      </div>

      <p class="small muted" style="margin-top:6px;">
        “Consume” subtracts the needed quantity from inventory (if set).
      </p>
    </div>
  `;

  document.getElementById("openInvBtn").addEventListener("click", () => {
    openDrawer();
  });

  document.getElementById("consumeBtn").addEventListener("click", () => {
    const need = (needQty === null || Number.isNaN(needQty)) ? 0 : needQty;
    if (!state.inventory[key]) state.inventory[key] = { qty: 0, unit: req.unit || "" };
    state.inventory[key].qty = Math.max(0, Number(state.inventory[key].qty) - need);
    renderAll();
    showInspector(req, task);
  });
}

// ---------- Task quick add (prompts) ----------
function addStepPrompt(task) {
  const name = prompt(`Add step for "${task.title}" (step name):`);
  if (!name) return;
  const link = prompt("Optional YouTube link:");
  task.steps = task.steps || [];
  task.steps.push({ name: name.trim(), link: (link || "").trim() });
  renderAll();
}

function addRequiredPrompt(task) {
  const item = prompt(`Add required item for "${task.title}" (item name):`);
  if (!item) return;
  const qtyRaw = prompt("Needed quantity? (leave blank if not needed)");
  const unit = prompt("Unit? (optional)");
  const qty = (qtyRaw === null || qtyRaw.trim() === "") ? "" : Number(qtyRaw);
  task.required = task.required || [];
  task.required.push({ name: item.trim(), qty, unit: (unit || "").trim() });
  renderAll();
}

// ---------- Events ----------
els.inventoryToggleBtn.addEventListener("click", () => openDrawer());
els.closeInventoryBtn.addEventListener("click", () => closeDrawer());

// close drawer on Esc
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDrawer();
});

els.inventoryForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = normalizeName(els.invName.value);
  const qty = Number(els.invQty.value);
  const unit = normalizeName(els.invUnit.value);

  if (!name) return;
  state.inventory[name] = { qty: Number.isFinite(qty) ? qty : 0, unit };
  els.invName.value = "";
  els.invQty.value = "";
  els.invUnit.value = "";
  renderAll();
});

els.addTaskBtn.addEventListener("click", () => {
  els.taskDialog.showModal();
});

els.saveTaskBtn.addEventListener("click", (e) => {
  // dialog closes automatically. We validate before allowing it to close.
  const time = els.taskTime.value;
  const durationMins = Number(els.taskDuration.value);
  const title = normalizeName(els.taskTitle.value);
  const notes = normalizeName(els.taskNotes.value);

  if (!time || !title || !Number.isFinite(durationMins)) {
    e.preventDefault();
    alert("Please fill start time, duration, and task name.");
    return;
  }

  state.schedule.push({
    id: uid(),
    time,
    durationMins,
    title,
    notes,
    steps: [],
    required: [],
  });

  els.taskTitle.value = "";
  els.taskNotes.value = "";
  renderAll();
});

els.exportBtn.addEventListener("click", async () => {
  const data = JSON.stringify(state, null, 2);
  try {
    await navigator.clipboard.writeText(data);
    els.exportBtn.textContent = "Copied!";
    setTimeout(() => (els.exportBtn.textContent = "Export"), 900);
  } catch {
    prompt("Copy your JSON:", data);
  }
});

els.importBtn.addEventListener("click", () => {
  els.importText.value = "";
  els.importDialog.showModal();
});

els.doImportBtn.addEventListener("click", (e) => {
  try {
    const incoming = JSON.parse(els.importText.value);
    if (!incoming.inventory || !incoming.schedule) throw new Error("Bad format");
    state = incoming;
    renderAll();
  } catch {
    alert("Import failed. Paste valid JSON exported from this app.");
    e.preventDefault();
  }
});

els.resetBtn.addEventListener("click", () => {
  const ok = confirm("Reset to demo data?");
  if (!ok) return;
  localStorage.removeItem(STORAGE_KEY);
  state = demoState();
  renderAll();
  els.inspector.innerHTML = `<p class="muted">Reset done.</p>`;
});

// ---------- Init ----------
renderAll();
closeDrawer();

