"use strict";

// Shared, DOM-free validation and persistence for the browser and Node tests.
const TaskData = (() => {
  const STORAGE_KEY = "organizador.tasks.v1";
  function validateTasks(value, strict = true) {
    if (!Array.isArray(value)) throw new Error("Las tareas deben ser una lista.");
    const ids = new Set();
    return value.map((task, index) => {
      if (!task || typeof task.id !== "string" || (strict && !task.id.trim()) || ids.has(task.id) ||
          typeof task.title !== "string" || !task.title.trim() ||
          typeof task.description !== "string" || typeof task.completed !== "boolean" ||
          (strict && (task.title.length > 150 || task.description.length > 3000))) {
        throw new Error(`La tarea ${index + 1} es inválida o tiene un ID repetido. Límites: título 150, descripción 3000 caracteres.`);
      }
      ids.add(task.id);
      return { id: task.id, title: task.title, description: task.description, completed: task.completed };
    });
  }
  function parseBackup(text) {
    const data = JSON.parse(text);
    if (!data || data.formatVersion !== 1 || typeof data.exportedAt !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T/.test(data.exportedAt) || !Number.isFinite(Date.parse(data.exportedAt))) {
      throw new Error("El archivo no es una copia compatible (formatVersion: 1 y exportedAt ISO requeridos).");
    }
    return { formatVersion: 1, exportedAt: data.exportedAt, tasks: validateTasks(data.tasks) };
  }
  function makeBackup(tasks) {
    return { formatVersion: 1, exportedAt: new Date().toISOString(), tasks };
  }
  function writeTasks(getStorage, tasks, readable = true) {
    if (!readable) return { ok: false, reason: "protected" };
    try {
      getStorage().setItem(STORAGE_KEY, JSON.stringify(tasks));
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: "storage", error };
    }
  }
  function importTasks(getStorage, current, incoming, readable = true) {
    try {
      const validated = validateTasks(incoming);
      const result = writeTasks(getStorage, validated, readable);
      return { ...result, tasks: result.ok ? validated : current };
    } catch (error) {
      return { ok: false, reason: "validation", error, tasks: current };
    }
  }
  return { STORAGE_KEY, validateTasks, parseBackup, makeBackup, writeTasks, importTasks };
})();
if (typeof module !== "undefined" && module.exports) module.exports = TaskData;
