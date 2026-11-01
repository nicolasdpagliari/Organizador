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
    TaskData.validateTasks(parsed, false); // Preserve valid legacy data, including older oversized fields.
    tasks = parsed;
  } catch {
    storageReadable = false;
    storageError.textContent = "No se pudieron leer las tareas guardadas. Podés usar la aplicación, pero no se sobrescribirán los datos anteriores. Revisá el almacenamiento del navegador antes de recargar.";
    storageError.hidden = false;
  }
}

function showStorageResult(result) {
  storageError.hidden = result.ok;
  if (!result.ok) {
    storageError.textContent = result.reason === "protected"
      ? "El almacenamiento está protegido porque no se pudo interpretar. Los datos anteriores no se sobrescribirán. Exportá las tareas en memoria antes de recargar."
      : "No se pudieron guardar los cambios. Exportá las tareas en memoria antes de cerrar o recargar esta pestaña.";
  }
  return result;
}

function saveTasks() {
  return showStorageResult(TaskData.writeTasks(() => localStorage, tasks, storageReadable));
}

function announceChange(message, result) {
  status.textContent = result.ok ? message : "Cambio aplicado solo en memoria. No se guardó; podés exportarlo.";
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
  const completed = tasks.length - pending;
  const percentage = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  document.querySelector("#progress-text").textContent = `${completed} de ${tasks.length} completadas · ${percentage}%`;
  document.querySelector("#task-progress").value = percentage;
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
      const saved = saveTasks();
      renderTasks(task.id);
      announceChange(task.completed ? "Tarea completada. ¡Un paso más!" : "Tarea marcada como pendiente.", saved);
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
      const saved = saveTasks();
      renderTasks(visible[index + 1]?.id || visible[index - 1]?.id);
      if (tasks.length === 0) titleInput.focus();
      announceChange("Tarea eliminada.", saved);
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
  titleError.textContent = "Escribí un título para la tarea.";
  if (!title) {
    titleError.hidden = false;
    titleInput.setAttribute("aria-invalid", "true");
    titleInput.focus();
    return;
  }
  const description = descriptionInput.value.trim();
  if (title.length > 150 || description.length > 3000) {
    titleError.textContent = "Límites: título 150 y descripción 3000 caracteres.";
    titleError.hidden = false;
    titleInput.focus();
    return;
  }
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
  const saved = saveTasks();
  resetForm();
  renderTasks();
  announceChange(wasEditing ? "Cambios guardados." : filter === "completed" ? "Tarea agregada. Podés verla en Todas o Pendientes." : "Tarea agregada.", saved);
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

function exportTasks() {
  try {
    const blob = new Blob([JSON.stringify(TaskData.makeBackup(tasks), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `organizador-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = "Copia preparada para descargar. Incluye todas las tareas en memoria.";
  } catch {
    status.textContent = "No se pudo exportar la copia. Intentá nuevamente en este navegador.";
  }
}

let importing = false;
async function handleImport(event) {
  const file = event.target.files[0];
  if (!file || importing) return;
  importing = true;
  document.querySelector("#import-tasks").disabled = true;
  try {
    if (file.size > 10 * 1024 * 1024) throw new Error("El archivo supera el límite de 10 MiB.");
    const backup = TaskData.parseBackup(await file.text());
    if (!storageReadable) throw new Error("Importación bloqueada para proteger datos almacenados ilegibles. Exportá tus tareas y revisá el almacenamiento antes de recargar.");
    const completed = backup.tasks.filter(task => task.completed).length;
    const confirmed = window.confirm(`Copia del ${new Date(backup.exportedAt).toLocaleString("es-AR")}: ${backup.tasks.length} tareas, ${completed} completadas y ${backup.tasks.length - completed} pendientes.\nReemplazará las ${tasks.length} tareas actuales, incluidos cambios solo en memoria. Exportá primero si querés conservarlas.\n¿Confirmás el reemplazo?`);
    if (!confirmed) {
      status.textContent = "Importación cancelada. Tus tareas siguen intactas.";
      return;
    }
    const result = TaskData.importTasks(() => localStorage, tasks, backup.tasks, storageReadable);
    showStorageResult(result);
    if (!result.ok) {
      status.textContent = "No se importaron las tareas. Se conservaron las tareas originales en memoria; la escritura fallida no reemplazó el almacenamiento.";
      return;
    }
    tasks = result.tasks;
    resetForm();
    renderTasks();
    status.textContent = `Importación guardada: ${tasks.length} tareas. Revisá los filtros para verlas.`;
  } catch (error) {
    status.textContent = `No se importó el archivo. ${error.message} Tus tareas actuales no se reemplazaron.`;
  } finally {
    event.target.value = "";
    importing = false;
    document.querySelector("#import-tasks").disabled = false;
    document.querySelector("#import-tasks").focus();
  }
}

function setupTheme() {
  const select = document.querySelector("#theme");
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  try {
    const saved = localStorage.getItem("organizador.theme.v1");
    if (["light", "dark", "system"].includes(saved)) select.value = saved;
  } catch { /* Theme storage is independent from task storage. */ }
  const apply = () => {
    document.documentElement.dataset.theme = select.value === "system" ? (media.matches ? "dark" : "light") : select.value;
  };
  select.addEventListener("change", () => {
    apply();
    try { localStorage.setItem("organizador.theme.v1", select.value); }
    catch { status.textContent = "Apariencia aplicada. No se pudo guardar la preferencia para la próxima visita."; }
  });
  media.addEventListener("change", apply);
  apply();
}

document.querySelector("#export-tasks").addEventListener("click", exportTasks);
document.querySelector("#import-tasks").addEventListener("click", () => document.querySelector("#import-file").click());
document.querySelector("#import-file").addEventListener("change", handleImport);
setupTheme();
loadTasks();
renderTasks();

