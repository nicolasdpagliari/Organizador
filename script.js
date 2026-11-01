"use strict";

const STORAGE_KEY = "organizador.tasks.v1";
const form = document.querySelector("#task-form");
const titleInput = document.querySelector("#task-title");
const descriptionInput = document.querySelector("#task-description");
const titleError = document.querySelector("#title-error");
const storageError = document.querySelector("#storage-error");
const list = document.querySelector("#task-list");
const emptyState = document.querySelector("#empty-state");
const status = document.querySelector("#status");
let tasks = [];
let filter = "all";
let editingId = null;
let storageReadable = true;

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) return;
    const parsed = JSON.parse(saved);
    const ids = new Set();
    if (!Array.isArray(parsed) || !parsed.every(task => {
      if (!task || typeof task.id !== "string" || ids.has(task.id) ||
          typeof task.title !== "string" || !task.title.trim() ||
          typeof task.description !== "string" || typeof task.completed !== "boolean") return false;
      ids.add(task.id);
      return true;
    })) throw new Error("Datos inválidos");
    tasks = parsed;
  } catch {
    storageReadable = false;
    storageError.textContent = "No se pudieron leer las tareas guardadas. Podés usar la aplicación, pero no se sobrescribirán los datos anteriores. Revisá el almacenamiento del navegador antes de recargar.";
    storageError.hidden = false;
  }
}

function saveTasks() {
  if (!storageReadable) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    storageError.hidden = true;
  } catch {
    storageError.textContent = "No se pudieron guardar los cambios. Tus tareas siguen disponibles en esta pestaña, pero podrían perderse al cerrarla. Revisá si el navegador permite el almacenamiento local.";
    storageError.hidden = false;
  }
}

function resetForm() {
  editingId = null;
  form.reset();
  titleError.hidden = true;
  titleInput.removeAttribute("aria-invalid");
  document.querySelector("#form-heading").textContent = "Nueva tarea";
  document.querySelector("#submit-button").textContent = "＋ Agregar tarea";
  document.querySelector("#cancel-edit").hidden = true;
}

function editTask(task) {
  editingId = task.id;
  titleInput.value = task.title;
  descriptionInput.value = task.description;
  titleError.hidden = true;
  titleInput.removeAttribute("aria-invalid");
  document.querySelector("#form-heading").textContent = "Editar tarea";
  document.querySelector("#submit-button").textContent = "Guardar cambios";
  document.querySelector("#cancel-edit").hidden = false;
  titleInput.focus();
}

function renderTasks(focusId = null) {
  list.replaceChildren();
  const pending = tasks.filter(task => !task.completed).length;
  document.querySelector("#pending-count").textContent = pending === 1 ? "Tenés 1 tarea pendiente" : `Tenés ${pending} tareas pendientes`;
  const visible = tasks.filter(task => filter === "all" || (filter === "completed" ? task.completed : !task.completed));
  visible.forEach(task => {
    const item = document.createElement("li");
    item.className = `task card${task.completed ? " completed" : ""}`;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-check";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", `Marcar como ${task.completed ? "pendiente" : "completada"}: ${task.title}`);
    checkbox.addEventListener("change", () => {
      task.completed = checkbox.checked;
      saveTasks();
      renderTasks(task.id);
      status.textContent = task.completed ? "Tarea completada. ¡Un paso más!" : "Tarea marcada como pendiente.";
    });
    const content = document.createElement("div");
    content.className = "task-content";
    const title = document.createElement("h3");
    title.textContent = task.title;
    content.append(title);
    if (task.description) {
      const description = document.createElement("p");
      description.textContent = task.description;
      content.append(description);
    }
    const actions = document.createElement("div");
    actions.className = "task-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Editar";
    edit.setAttribute("aria-label", `Editar: ${task.title}`);
    edit.addEventListener("click", () => editTask(task));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete";
    remove.textContent = "Eliminar";
    remove.setAttribute("aria-label", `Eliminar: ${task.title}`);
    remove.addEventListener("click", () => {
      if (!window.confirm(`¿Querés eliminar la tarea «${task.title}»?`)) return;
      const index = visible.indexOf(task);
      tasks = tasks.filter(entry => entry.id !== task.id);
      if (editingId === task.id) resetForm();
      saveTasks();
      renderTasks(visible[index + 1]?.id || visible[index - 1]?.id);
      if (tasks.length === 0) titleInput.focus();
      status.textContent = "Tarea eliminada.";
    });
    actions.append(edit, remove);
    item.append(checkbox, content, actions);
    list.append(item);
    if (focusId === task.id) checkbox.focus();
  });
  emptyState.hidden = visible.length > 0;
  emptyState.querySelector("h3").textContent = tasks.length === 0 ? "Un nuevo comienzo" : "Todo despejado por acá";
  emptyState.querySelector("p").textContent = tasks.length === 0 ? "Agregá tu primera tarea y empezá a liberar espacio mental." : filter === "pending" ? "No tenés tareas pendientes. ¡Disfrutá este momento!" : "Todavía no hay tareas completadas. Cada pequeño paso cuenta.";
  if (focusId && !visible.some(task => task.id === focusId)) document.querySelector(`[data-filter="${filter}"]`).focus();
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const title = titleInput.value.trim();
  if (!title) {
    titleError.hidden = false;
    titleInput.setAttribute("aria-invalid", "true");
    titleInput.focus();
    return;
  }
  const description = descriptionInput.value.trim();
  const wasEditing = editingId !== null;
  if (wasEditing) {
    const task = tasks.find(entry => entry.id === editingId);
    task.title = title;
    task.description = description;
  } else {
    let id;
    do { id = `${Date.now()}-${Math.random().toString(36).slice(2)}`; } while (tasks.some(task => task.id === id));
    tasks.unshift({ id, title, description, completed: false });
  }
  saveTasks();
  resetForm();
  renderTasks();
  status.textContent = wasEditing ? "Cambios guardados." : filter === "completed" ? "Tarea agregada. Podés verla en Todas o Pendientes." : "Tarea agregada.";
  titleInput.focus();
});

titleInput.addEventListener("input", () => {
  if (titleInput.value.trim()) {
    titleError.hidden = true;
    titleInput.removeAttribute("aria-invalid");
  }
});
document.querySelector("#cancel-edit").addEventListener("click", () => {
  resetForm();
  titleInput.focus();
  status.textContent = "Edición cancelada.";
});
document.querySelectorAll("[data-filter]").forEach(button => {
  button.addEventListener("click", () => {
    filter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach(entry => entry.setAttribute("aria-pressed", String(entry === button)));
    renderTasks();
  });
});

loadTasks();
renderTasks();
