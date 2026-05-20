const users = {
  Kelly: {
    role: "Admin",
    canEdit: true,
    scopes: [{ BU: "*", Region: "*" }]
  },
  Alice: {
    role: "NA Planner",
    canEdit: true,
    scopes: [{ BU: "A", Region: "NA" }]
  },
  Bob: {
    role: "EU Planner",
    canEdit: true,
    scopes: [{ BU: "A", Region: "EU" }]
  },
  Priya: {
    role: "APAC Planner",
    canEdit: true,
    scopes: [{ BU: "B", Region: "APAC" }]
  },
  Morgan: {
    role: "Finance Reviewer",
    canEdit: false,
    scopes: [{ BU: "*", Region: "*" }]
  }
};

let currentUserName = localStorage.getItem("currentUser") || "Kelly";

if (!users[currentUserName]) {
  currentUserName = "Kelly";
}

const defaultData = [
  {
    rowId: "1",
    BU: "A",
    Region: "NA",
    Product: "X1",
    Month: "Apr",
    Forecast: "100",
    Comment: "",
    Version: 1,
    LastUpdatedBy: "",
    LastUpdatedTime: ""
  },
  {
    rowId: "2",
    BU: "A",
    Region: "EU",
    Product: "X2",
    Month: "Apr",
    Forecast: "200",
    Comment: "",
    Version: 1,
    LastUpdatedBy: "",
    LastUpdatedTime: ""
  },
  {
    rowId: "3",
    BU: "B",
    Region: "APAC",
    Product: "X3",
    Month: "Apr",
    Forecast: "300",
    Comment: "",
    Version: 1,
    LastUpdatedBy: "",
    LastUpdatedTime: ""
  },
  {
    rowId: "4",
    BU: "A",
    Region: "NA",
    Product: "X4",
    Month: "May",
    Forecast: "125",
    Comment: "",
    Version: 1,
    LastUpdatedBy: "",
    LastUpdatedTime: ""
  },
  {
    rowId: "5",
    BU: "B",
    Region: "APAC",
    Product: "X5",
    Month: "May",
    Forecast: "175",
    Comment: "",
    Version: 1,
    LastUpdatedBy: "",
    LastUpdatedTime: ""
  }
];

function getCurrentUser() {
  return users[currentUserName] || users.Kelly;
}

function cloneDefaultData() {
  return defaultData.map(row => ({ ...row }));
}

function normalizeData(rows) {
  return rows.map((row, index) => ({
    rowId: row.rowId || String(index + 1),
    BU: row.BU || "",
    Region: row.Region || "",
    Product: row.Product || "",
    Month: row.Month || "",
    Forecast: String(row.Forecast ?? "0"),
    Comment: row.Comment || "",
    Version: Number(row.Version || 1),
    LastUpdatedBy: row.LastUpdatedBy || "",
    LastUpdatedTime: row.LastUpdatedTime || ""
  }));
}

function mergeWithDefaultRows(rows) {
  const rowIds = new Set(rows.map(row => row.rowId));
  const missingDefaultRows = cloneDefaultData().filter(row => !rowIds.has(row.rowId));
  return [...rows, ...missingDefaultRows];
}

function getData() {
  const saved = localStorage.getItem("forecastData");

  if (!saved) {
    return cloneDefaultData();
  }

  try {
    return mergeWithDefaultRows(normalizeData(JSON.parse(saved)));
  } catch {
    return cloneDefaultData();
  }
}

function saveData(data) {
  localStorage.setItem("forecastData", JSON.stringify(data));
}

function getChangeHistory() {
  const saved = localStorage.getItem("forecastChangeHistory");

  if (!saved) {
    return [];
  }

  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

function saveChangeHistory(history) {
  localStorage.setItem("forecastChangeHistory", JSON.stringify(history.slice(0, 50)));
}

function scopeMatches(scope, row) {
  const buMatches = scope.BU === "*" || scope.BU === row.BU;
  const regionMatches = scope.Region === "*" || scope.Region === row.Region;
  return buMatches && regionMatches;
}

function canAccessRow(row, user) {
  return user.scopes.some(scope => scopeMatches(scope, row));
}

function canEditRow(row, user) {
  return user.canEdit && canAccessRow(row, user);
}

function getVisibleRows(data) {
  const user = getCurrentUser();
  return data.filter(row => canAccessRow(row, user));
}

function formatScope(user) {
  return user.scopes
    .map(scope => {
      const bu = scope.BU === "*" ? "All BUs" : `BU ${scope.BU}`;
      const region = scope.Region === "*" ? "all regions" : scope.Region;
      return `${bu} / ${region}`;
    })
    .join(", ");
}

function setOutput(message) {
  document.getElementById("output").innerText = message;
}

function createCell(value, options = {}) {
  const cell = document.createElement("td");
  cell.textContent = value;

  if (options.editable) {
    cell.contentEditable = "true";
    cell.dataset.column = options.column;
  }

  if (options.className) {
    cell.className = options.className;
  }

  return cell;
}

function populateUserSelect() {
  const select = document.getElementById("userSelect");
  select.innerHTML = "";

  Object.entries(users).forEach(([name, user]) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = `${name} - ${user.role}`;
    select.appendChild(option);
  });

  select.value = users[currentUserName] ? currentUserName : "Kelly";
}

function updateCurrentUserDisplay() {
  const user = getCurrentUser();

  document.getElementById("currentUserDisplay").innerText = currentUserName;
  document.getElementById("roleDisplay").innerText = user.role;
  document.getElementById("scopeDisplay").innerText = formatScope(user);
  document.getElementById("userSelect").value = currentUserName;
}

function switchUser() {
  currentUserName = document.getElementById("userSelect").value;
  localStorage.setItem("currentUser", currentUserName);
  renderApp();
  setOutput(`Switched to user: ${currentUserName}`);
}

function renderTable(data) {
  const user = getCurrentUser();
  const visibleRows = getVisibleRows(data);
  const tbody = document.querySelector("#forecastTable tbody");
  tbody.innerHTML = "";

  if (visibleRows.length === 0) {
    const row = document.createElement("tr");
    const cell = createCell("No forecast rows are available for this user.", {
      className: "empty-state"
    });
    cell.colSpan = 9;
    row.appendChild(cell);
    tbody.appendChild(row);
    document.getElementById("saveChangesButton").disabled = true;
    return;
  }

  visibleRows.forEach(rowData => {
    const row = document.createElement("tr");
    const rowCanEdit = canEditRow(rowData, user);
    row.dataset.rowId = rowData.rowId;
    row.dataset.version = String(rowData.Version);

    row.appendChild(createCell(rowData.BU));
    row.appendChild(createCell(rowData.Region));
    row.appendChild(createCell(rowData.Product));
    row.appendChild(createCell(rowData.Month));
    row.appendChild(
      createCell(rowData.Forecast, {
        editable: rowCanEdit,
        column: "Forecast",
        className: rowCanEdit ? "" : "readonly"
      })
    );
    row.appendChild(
      createCell(rowData.Comment, {
        editable: rowCanEdit,
        column: "Comment",
        className: rowCanEdit ? "" : "readonly"
      })
    );
    row.appendChild(createCell(rowData.Version));
    row.appendChild(createCell(rowData.LastUpdatedBy));
    row.appendChild(createCell(rowData.LastUpdatedTime));

    tbody.appendChild(row);
  });

  setupEditableCells();
  document.getElementById("saveChangesButton").disabled =
    document.querySelectorAll('td[contenteditable="true"]').length === 0;
}

function setupEditableCells() {
  const editableCells = document.querySelectorAll('td[contenteditable="true"]');

  editableCells.forEach(cell => {
    cell.dataset.originalValue = cell.innerText.trim();

    cell.addEventListener("input", () => {
      if (cell.dataset.column === "Forecast") {
        const cleaned = cell.innerText.replace(/[^0-9]/g, "");
        if (cell.innerText !== cleaned) {
          cell.innerText = cleaned;
        }
      }

      if (cell.innerText.trim() !== cell.dataset.originalValue) {
        cell.classList.add("changed");
      } else {
        cell.classList.remove("changed");
      }
    });
  });
}

function buildAggregates(data) {
  const groups = new Map();

  getVisibleRows(data).forEach(row => {
    const key = `${row.BU}|${row.Region}|${row.Month}`;
    const current = groups.get(key) || {
      BU: row.BU,
      Region: row.Region,
      Month: row.Month,
      TotalForecast: 0,
      RowCount: 0
    };

    current.TotalForecast += Number(row.Forecast || 0);
    current.RowCount += 1;
    groups.set(key, current);
  });

  return Array.from(groups.values()).sort((a, b) => {
    return `${a.BU}${a.Region}${a.Month}`.localeCompare(`${b.BU}${b.Region}${b.Month}`);
  });
}

function renderSummary(data) {
  const tbody = document.querySelector("#summaryTable tbody");
  const aggregates = buildAggregates(data);
  tbody.innerHTML = "";

  if (aggregates.length === 0) {
    const row = document.createElement("tr");
    const cell = createCell("No forecast totals are available for this user.", {
      className: "empty-state"
    });
    cell.colSpan = 5;
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  aggregates.forEach(summary => {
    const row = document.createElement("tr");
    row.appendChild(createCell(summary.BU));
    row.appendChild(createCell(summary.Region));
    row.appendChild(createCell(summary.Month));
    row.appendChild(createCell(summary.TotalForecast.toLocaleString()));
    row.appendChild(createCell(summary.RowCount));
    tbody.appendChild(row);
  });
}

function renderHistory() {
  const user = getCurrentUser();
  const tbody = document.querySelector("#historyTable tbody");
  const visibleHistory = getChangeHistory()
    .filter(entry => canAccessRow(entry, user))
    .slice(0, 10);

  tbody.innerHTML = "";

  if (visibleHistory.length === 0) {
    const row = document.createElement("tr");
    const cell = createCell("No saved changes yet.", { className: "empty-state" });
    cell.colSpan = 7;
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  visibleHistory.forEach(entry => {
    const row = document.createElement("tr");
    row.appendChild(createCell(entry.updatedTime));
    row.appendChild(createCell(entry.updatedBy));
    row.appendChild(createCell(`${entry.BU}/${entry.Region}/${entry.Product}/${entry.Month}`));
    row.appendChild(createCell(entry.column));
    row.appendChild(createCell(entry.oldValue));
    row.appendChild(createCell(entry.newValue));
    row.appendChild(createCell(`${entry.fromVersion} -> ${entry.toVersion}`));
    tbody.appendChild(row);
  });
}

function collectPendingChanges(data) {
  const rowChanges = new Map();
  const editableCells = document.querySelectorAll('td[contenteditable="true"]');

  editableCells.forEach(cell => {
    const rowElement = cell.closest("tr");
    const rowId = rowElement.dataset.rowId;
    const column = cell.dataset.column;
    const newValue = cell.innerText.trim();
    const targetRow = data.find(item => item.rowId === rowId);

    if (!targetRow) {
      return;
    }

    const oldValue = String(targetRow[column] ?? "");

    if (oldValue === newValue) {
      return;
    }

    if (!rowChanges.has(rowId)) {
      rowChanges.set(rowId, {
        rowElement,
        targetRow,
        fields: []
      });
    }

    rowChanges.get(rowId).fields.push({
      column,
      oldValue,
      newValue
    });
  });

  return Array.from(rowChanges.values());
}

function validatePendingChanges(rowChanges) {
  const user = getCurrentUser();
  const errors = [];

  rowChanges.forEach(change => {
    const originalVersion = Number(change.rowElement.dataset.version || 0);
    const latestVersion = Number(change.targetRow.Version || 1);

    if (!canEditRow(change.targetRow, user)) {
      errors.push(`No edit access for row ${change.targetRow.rowId}.`);
    }

    if (originalVersion !== latestVersion) {
      errors.push(
        `Version conflict on row ${change.targetRow.rowId}: page has v${originalVersion}, latest is v${latestVersion}.`
      );
    }

    change.fields.forEach(field => {
      if (field.column === "Forecast" && field.newValue === "") {
        errors.push(`Forecast cannot be blank on row ${change.targetRow.rowId}.`);
      }
    });
  });

  return errors;
}

function saveChanges() {
  const data = getData();
  const rowChanges = collectPendingChanges(data);

  if (rowChanges.length === 0) {
    setOutput("No changes detected.");
    return;
  }

  const validationErrors = validatePendingChanges(rowChanges);

  if (validationErrors.length > 0) {
    setOutput(`Save blocked:\n${validationErrors.join("\n")}`);
    return;
  }

  const now = new Date().toLocaleString();
  const savedChanges = [];

  rowChanges.forEach(change => {
    const fromVersion = Number(change.targetRow.Version || 1);
    const toVersion = fromVersion + 1;

    change.fields.forEach(field => {
      change.targetRow[field.column] = field.newValue;
      savedChanges.push({
        rowId: change.targetRow.rowId,
        BU: change.targetRow.BU,
        Region: change.targetRow.Region,
        Product: change.targetRow.Product,
        Month: change.targetRow.Month,
        column: field.column,
        oldValue: field.oldValue,
        newValue: field.newValue,
        updatedBy: currentUserName,
        updatedTime: now,
        fromVersion,
        toVersion
      });
    });

    change.targetRow.Version = toVersion;
    change.targetRow.LastUpdatedBy = currentUserName;
    change.targetRow.LastUpdatedTime = now;
  });

  saveData(data);
  saveChangeHistory([...savedChanges.reverse(), ...getChangeHistory()]);
  renderApp();
  setOutput(
    `Saved ${savedChanges.length} change(s). Summed forecast totals were recalculated from the latest rows.`
  );
}

function refreshData() {
  renderApp();
  setOutput("Refreshed from the latest saved forecast data.");
}

function resetHighlight() {
  const editableCells = document.querySelectorAll('td[contenteditable="true"]');
  editableCells.forEach(cell => {
    cell.classList.remove("changed");
  });
  setOutput("Highlight cleared.");
}

function resetAllData() {
  localStorage.removeItem("forecastData");
  localStorage.removeItem("forecastChangeHistory");
  localStorage.removeItem("currentUser");
  currentUserName = "Kelly";
  populateUserSelect();
  renderApp();
  setOutput("Data reset to default values.");
}

function renderApp() {
  const data = getData();
  updateCurrentUserDisplay();
  renderTable(data);
  renderSummary(data);
  renderHistory();
}

populateUserSelect();
document.getElementById("switchUserButton").addEventListener("click", switchUser);
document.getElementById("saveChangesButton").addEventListener("click", saveChanges);
document.getElementById("refreshDataButton").addEventListener("click", refreshData);
document.getElementById("resetHighlightButton").addEventListener("click", resetHighlight);
document.getElementById("resetDataButton").addEventListener("click", resetAllData);

renderApp();
