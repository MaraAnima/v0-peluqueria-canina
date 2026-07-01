# Google Apps Script — Email de confirmación, ID de reserva y cancelación

Este archivo es solo una **guía de referencia**. Copia el código en tu proyecto de
Google Apps Script (el que está detrás de `SCRIPT_URL` en `public/app.js`) y adáptalo
a los nombres de tu hoja de cálculo.

El frontend ya envía y espera lo siguiente:

- Al **confirmar** una reserva hace `POST` con un JSON que ahora incluye `email`.
  Espera de vuelta un JSON con el **ID de reserva** en `id` (o `reservaId`).
- Al **cancelar** hace `GET` a `?action=cancelar&id=EL_ID`.
  Espera `{ "mensaje": "..." }` en éxito o `{ "error": "..." }` si falla.

---

## Requisitos en tu hoja

Agrega (si no existen) estas columnas en la hoja donde guardas las reservas:

- `ID` — el identificador único de la reserva (ej: `TR-2026-0042`)
- `Email` — el correo del cliente
- `Estado` — `Confirmada` / `Cancelada`

Ajusta los índices de columna (`COL_*`) según tu hoja real.

---

## Código sugerido (Code.gs)

```javascript
// ====== CONFIG ======
const SHEET_NAME = 'Reservas';        // nombre de tu hoja
const HORARIOS = ['11:00', '13:00', '15:00', '17:00'];

// Índices de columnas (1 = A, 2 = B, ...). Ajusta a tu hoja.
const COL_ID       = 1;  // A
const COL_FECHA    = 2;  // B  (YYYY-MM-DD)
const COL_HORA     = 3;  // C
const COL_NOMBRE   = 4;  // D
const COL_TELEFONO = 5;  // E
const COL_EMAIL    = 6;  // F
const COL_ESTADO   = 7;  // G
// ...agrega el resto de tus columnas (servicio, tamaño, etc.)

function getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}

// ====== GENERAR ID ÚNICO ======
function generarId() {
  const anio = new Date().getFullYear();
  const sheet = getSheet();
  const total = Math.max(sheet.getLastRow() - 1, 0) + 1; // filas de datos + 1
  const secuencia = String(total).padStart(4, '0');
  return `TR-${anio}-${secuencia}`;
}

// ====== GET: disponibilidad de horarios y cancelación ======
function doGet(e) {
  const params = e.parameter || {};

  // --- Cancelar cita ---
  if (params.action === 'cancelar') {
    return cancelarReserva(params.id);
  }

  // --- Horarios disponibles para una fecha (comportamiento actual) ---
  const fecha = params.fecha;
  const ocupados = getHorariosOcupados(fecha);
  const horarios = HORARIOS.filter(h => !ocupados.includes(h));
  return jsonResponse({ horarios: horarios });
}

function getHorariosOcupados(fecha) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const ocupados = [];
  for (let i = 1; i < data.length; i++) {
    const estado = String(data[i][COL_ESTADO - 1] || '');
    if (estado === 'Cancelada') continue; // los cancelados liberan el horario
    if (String(data[i][COL_FECHA - 1]) === fecha) {
      ocupados.push(String(data[i][COL_HORA - 1]));
    }
  }
  return ocupados;
}

// ====== CANCELAR ======
function cancelarReserva(id) {
  if (!id) return jsonResponse({ error: 'Falta el ID de reserva.' });

  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][COL_ID - 1]).trim() === String(id).trim()) {
      const estado = String(data[i][COL_ESTADO - 1] || '');
      if (estado === 'Cancelada') {
        return jsonResponse({ error: 'Esta cita ya estaba cancelada.' });
      }
      // Marcar como cancelada (fila i+1 porque data empieza en 0 y la hoja en 1)
      sheet.getRange(i + 1, COL_ESTADO).setValue('Cancelada');

      // Email de aviso de cancelación
      const email = String(data[i][COL_EMAIL - 1] || '');
      if (email) {
        MailApp.sendEmail({
          to: email,
          subject: 'Tu cita fue cancelada — TR Corte',
          htmlBody:
            '<p>Hola ' + (data[i][COL_NOMBRE - 1] || '') + ',</p>' +
            '<p>Tu cita con <b>ID ' + id + '</b> fue cancelada correctamente.</p>' +
            '<p>Si fue un error, podés volver a reservar desde nuestra web.</p>' +
            '<p>— TR Corte</p>'
        });
      }
      return jsonResponse({ mensaje: 'Tu cita fue cancelada. Te enviamos la confirmación por email.' });
    }
  }
  return jsonResponse({ error: 'No encontramos una cita con ese ID. Revisá el email de confirmación.' });
}

// ====== POST: crear reserva + email de confirmación con ID ======
function doPost(e) {
  const datos = JSON.parse(e.postData.contents);

  // (Opcional) volver a validar que el horario siga libre
  const ocupados = getHorariosOcupados(datos.fecha);
  if (ocupados.includes(datos.hora)) {
    return jsonResponse({ error: 'Ese horario ya fue reservado. Elegí otro.' });
  }

  const id = generarId();
  const sheet = getSheet();

  // Escribí la fila con TUS columnas. Ejemplo mínimo:
  const fila = [];
  fila[COL_ID - 1]       = id;
  fila[COL_FECHA - 1]    = datos.fecha;
  fila[COL_HORA - 1]     = datos.hora;
  fila[COL_NOMBRE - 1]   = datos.nombre;
  fila[COL_TELEFONO - 1] = datos.telefono;
  fila[COL_EMAIL - 1]    = datos.email;
  fila[COL_ESTADO - 1]   = 'Confirmada';
  sheet.appendRow(fila);

  // Email de confirmación con toda la info + ID
  if (datos.email) {
    MailApp.sendEmail({
      to: datos.email,
      subject: 'Ha sido confirmada tu cita — TR Corte',
      htmlBody:
        '<h2>Ha sido confirmada tu cita</h2>' +
        '<p>Hola ' + datos.nombre + ', ¡gracias por reservar en TR Corte!</p>' +
        '<p><b>ID de reserva:</b> ' + id + '</p>' +
        '<h3>Detalles de la agenda</h3>' +
        '<ul>' +
        '<li><b>Fecha:</b> ' + datos.fecha + '</li>' +
        '<li><b>Hora:</b> ' + datos.hora + '</li>' +
        '<li><b>Servicio:</b> ' + (datos.servicio || '') + '</li>' +
        '<li><b>Tamaño:</b> ' + (datos.tamano || '') + '</li>' +
        '<li><b>Mascota:</b> ' + (datos.nombreMascota || '') + '</li>' +
        '<li><b>Extras:</b> ' + (datos.extras || 'Sin extras') + '</li>' +
        '<li><b>Duración:</b> ' + (datos.duracion || '') + '</li>' +
        '<li><b>Precio estimado:</b> $' + (datos.precio || '') + '</li>' +
        '</ul>' +
        '<p><b>Importante:</b> guardá tu ID <b>' + id + '</b>. ' +
        'Lo necesitás si querés cancelar la cita desde nuestra web.</p>' +
        '<p>— TR Corte</p>'
    });
  }

  // Devolver el ID para que el frontend lo muestre
  return jsonResponse({ ok: true, id: id });
}

// ====== HELPER ======
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## Notas

1. Después de pegar el código, **volvé a implementar** (Deploy → Manage deployments →
   Edit → New version) para que los cambios tomen efecto en la misma URL.
2. La primera vez que se envíe un email, Google pedirá autorizar el permiso `MailApp`.
3. El frontend ya está listo: no necesitás tocar `public/app.js` ni `public/index.html`.
   Si tu campo de ID usa otro nombre en la respuesta (`reservaId`, `reserva`), el
   frontend igual lo detecta.
