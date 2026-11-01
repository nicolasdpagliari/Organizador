# Organizador

Aplicación web para gestionar tareas personales, completamente en español y sin dependencias, instalaciones ni servidor.

## Cómo abrirla

1. Abrí la carpeta **Organizador** en el Explorador de archivos de Windows.
2. Hacé doble clic en **index.html**. Se abrirá en tu navegador predeterminado.
3. Si preferís otro navegador, hacé clic derecho sobre el archivo y elegí **Abrir con** → Edge, Chrome o Firefox.

Los archivos `styles.css` y `script.js` deben permanecer junto a `index.html`. No es necesario ejecutar comandos ni usar Live Server.

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
| `README.md` | Instrucciones y verificación |
