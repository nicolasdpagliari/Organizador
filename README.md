# Organizador 2.0

## Novedades de la versión 2

- Interfaz responsive, progreso global (completadas, total y porcentaje) y estados vacíos según el filtro.
- Apariencia Sistema, Claro u Oscuro. Sistema sigue `prefers-color-scheme`, incluidos cambios mientras la página está abierta. La preferencia se guarda por separado en `organizador.theme.v1`.
- Guardado con resultado verificable. Si falla, los cambios normales siguen en memoria y aparece una advertencia accesible; no se anuncia que se guardaron. **Exportá antes de cerrar o recargar**.
- Botón **Exportar tareas**: descarga todas las tareas en memoria, independientemente del filtro, con las APIs Blob y URL del navegador.
- Botón **Importar tareas**: seleccioná un JSON de hasta 10 MiB. Se valida por completo, se informa fecha, cantidad, completadas y pendientes y se pide confirmación antes de reemplazar. Una copia vacía también reemplaza las tareas, previa confirmación.

El archivo de copia tiene este formato (la versión de copia es independiente de la versión de la aplicación):

```json
{
  "formatVersion": 1,
  "exportedAt": "2026-11-01T12:00:00.000Z",
  "tasks": [
    { "id": "ejemplo-1", "title": "Mi tarea", "description": "", "completed": false }
  ]
}
```

Se rechazan formatos desconocidos, fechas inválidas, IDs vacíos o duplicados, títulos vacíos o mayores a 150 caracteres, descripciones que no sean texto o mayores a 3000 y estados que no sean booleanos. No se ejecuta HTML ni JavaScript del archivo. El array crudo de localStorage no es un archivo de copia: usá Exportar tareas para obtener el formato compatible.

La importación escribe primero y solo reemplaza la memoria tras un guardado exitoso. Ante validación, lectura o escritura fallida, conserva las tareas originales en memoria; un `setItem` fallido conserva el valor anterior según el contrato de Web Storage. No intenta restaurarlo con una segunda escritura que podría fallar o sobrescribir cambios de otra pestaña. Si se detectaron datos ilegibles al iniciar, se bloquean tanto el guardado como la importación para protegerlos. La exportación sigue disponible para las tareas en memoria, pero no recupera los datos ilegibles.

Se conserva **`organizador.tasks.v1`** y su array JSON, sin migración ni escritura al iniciar. Para compatibilidad, la carga conserva los registros antes aceptados incluso si exceden los límites actuales; las importaciones y los envíos del formulario exigen los límites. Una exportación de datos heredados fuera de esos límites deberá corregirse antes de poder reimportarse.

## Pruebas sin dependencias

Con Node.js instalado, desde esta carpeta:

```text
node --test task-data.test.cjs
node --check script.js
node --check task-data.js
```

Las pruebas cubren validación, límites, formato de copias, importación y errores de almacenamiento con dobles en memoria. También ejecutan los manejadores reales con un DOM simulado: arranque protegido, mensajes de edición fallida, importación cancelada o fallida, progreso y operaciones básicas. No acceden al localStorage real de los usuarios. Para la revisión manual, comprobar además descarga y selección de archivos, cancelación y confirmación, ambos temas, cambios de tema del sistema, teclado, lector de pantalla y vista móvil. El foco visible y los mensajes `aria-live` no sustituyen una evaluación con tecnologías de asistencia reales.

Aplicación web para gestionar tareas personales, completamente en español y sin dependencias, instalaciones ni servidor.

## Cómo abrirla

1. Abrí la carpeta **Organizador** en el Explorador de archivos de Windows.
2. Hacé doble clic en **index.html**. Se abrirá en tu navegador predeterminado.
3. Si preferís otro navegador, hacé clic derecho sobre el archivo y elegí **Abrir con** → Edge, Chrome o Firefox.

Los archivos `styles.css`, `task-data.js` y `script.js` deben permanecer junto a `index.html`. No es necesario ejecutar comandos ni usar Live Server.

## Cómo usarla

- Escribí un título y, si querés, una descripción. Presioná **Agregar tarea**.
- Usá la casilla de cada tarjeta para marcarla como completada o pendiente.
- Elegí **Editar** para cargar una tarea en el formulario; luego **Guardar cambios** o **Cancelar edición**.
- Elegí **Eliminar** y confirmá para borrar una tarea.
- Usá **Todas**, **Pendientes** y **Completadas** para filtrar la lista.
- El contador siempre muestra todas las tareas pendientes, independientemente del filtro.

## Decisiones técnicas

- **HTML5:** estructura semántica, etiquetas de formularios y avisos accesibles.
- **CSS3:** diseño con Grid y Flexbox, tarjetas y adaptación a pantallas pequeñas. La tipografía es del sistema, sin descargas externas.
- **JavaScript puro:** mantiene las tareas y actualiza la interfaz con las funciones nativas del navegador.
- **localStorage:** guarda automáticamente después de agregar, editar, completar o eliminar. No necesita una base de datos ni conexión a Internet.
- **Seguridad:** el contenido de las tareas se coloca con `textContent`, sin interpretar HTML ingresado por el usuario.

## Cómo verificar las funcionalidades

1. Intentá agregar una tarea vacía y otra con solo espacios: debe aparecer un mensaje y no debe crearse ninguna.
2. Agregá una tarea solo con título y otra con título y descripción: ambas deben aparecer y aumentar el contador.
3. Marcá una tarea como completada: su título debe verse tachado y el contador debe disminuir. Desmarcala para comprobar el cambio inverso.
4. Probá los tres filtros y verificá que cada uno muestre las tareas correspondientes.
5. Editá el título y la descripción. Guardá y comprobá los cambios; probá también cancelar una edición.
6. Recargá la página: las tareas y sus estados deben conservarse.
7. Eliminá una tarea: cancelar la confirmación debe conservarla y aceptar debe borrarla. Recargá para comprobar que sigue eliminada.
8. Agregá como título `<b>Prueba</b>`: debe aparecer como texto literal, sin negrita ni ejecución de HTML.
9. Reducí el ancho de la ventana o abrí las herramientas del navegador con F12 y activá la vista móvil. El formulario y la lista deben acomodarse en una columna.
10. Navegá usando Tab y activá botones con Enter o la casilla con Espacio. Debe verse el indicador de foco.

## Almacenamiento y límites

Las tareas son locales: no se envían a ningún servicio ni se sincronizan entre dispositivos, navegadores o perfiles. Borrar los datos del navegador puede eliminarlas. En modo privado pueden perderse al cerrar la sesión.

El comportamiento de `localStorage` en páginas abiertas con `file://` depende del navegador. Usá siempre el mismo navegador y la misma ubicación del archivo para conservar el acceso a los datos; mover la carpeta puede cambiarlo. Si el navegador bloquea el almacenamiento o se alcanza su límite, la aplicación muestra un aviso: los cambios permanecen en memoria durante esa pestaña, pero no se garantiza que sobrevivan a una recarga.

Si los datos guardados están dañados, se muestra un aviso y no se sobrescriben automáticamente. No hay sincronización de cambios entre varias pestañas abiertas; usá una sola pestaña para evitar sobrescribir cambios.

El título admite hasta 150 caracteres y la descripción hasta 3000.

## Archivos

| Archivo | Función |
| --- | --- |
| `index.html` | Estructura y formulario |
| `styles.css` | Apariencia y diseño adaptable |
| `script.js` | Tareas, filtros, validación y guardado |
| `task-data.js` | Validación, formato de copias y persistencia sin DOM |
| `task-data.test.cjs` | Pruebas con Node.js, sin dependencias |
| `README.md` | Instrucciones y verificación |
