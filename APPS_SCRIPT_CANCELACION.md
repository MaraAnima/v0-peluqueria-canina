# Google Apps Script — Email de confirmación, ID de reserva y cancelación

Este es tu script actual **adaptado**: se agrega la columna `Email`, el envío del
correo "Ha sido confirmada tu cita" con la agenda + el ID, y la cancelación por ID.
Se quitó todo lo de WhatsApp.

### Qué cambió respecto a tu versión

1. **Nueva columna `Email`** (columna Q, índice 16) y **nueva columna `Estado`**
   (columna R, índice 17). No tocan los índices de `Deslanado` [14] ni
   `Hora Bloqueada` [15], así que no rompe nada.
2. **`saveReservation`** ahora guarda `data.email` y marca la reserva como `Confirmada`.
3. **`doPost`** manda el email de confirmación (en vez de WhatsApp) con la agenda + el ID,
   y devuelve `reservaId`.
4. **`doGet`** ahora acepta `?action=cancelar&id=...`: busca la reserva, la marca como
   `Cancelada` (conserva el histórico) y manda un email de cancelación.
5. **`getAvailableSlots`** ignora las filas con estado `Cancelada`, así el turno vuelve a
   quedar libre para otra persona.

El frontend ya envía `email` y ya lee `reservaId` de la respuesta, así que **no hay que
tocar `public/app.js` ni `public/index.html`**.

---

## Código completo (Code.gs)

```javascript
// ==================== CONFIGURACION ====================
const SPREADSHEET_ID = '11rzRToVwRoBOVNr-G0KYV7gi_NCUEmBG2UsMhydc3Cg';
const SHEET_NAME = 'Reservas';
const TIME_SLOTS_WEEKDAY = ['11:00', '13:00', '15:00', '17:00'];
const TIME_SLOTS_SATURDAY = ['10:00', '14:00'];
const NEGOCIO = 'TR Corte'; // nombre que aparece en los emails

// Indice (0-based) de las columnas nuevas en la hoja
const COL_EMAIL = 16;  // Q
const COL_ESTADO = 17; // R

// ==================== FUNCIONES PRINCIPALES ====================

function doGet(e) {
  try {
    const params = e.parameter || {};

    // --- Cancelar cita por ID ---
    if (params.action === 'cancelar') {
      return cancelarReserva(params.id);
    }

    // --- Horarios disponibles (comportamiento original) ---
    const fecha = params.fecha;
    if (!fecha) {
      return createJsonResponse({ error: 'Fecha requerida' });
    }
    const horariosDisponibles = getAvailableSlots(fecha);
    return createJsonResponse({
      fecha: fecha,
      horarios: horariosDisponibles
    });
  } catch (error) {
    return createJsonResponse({ error: error.toString() });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return createJsonResponse({ error: 'Error al parsear datos' });
    }

    const camposRequeridos = ['nombre', 'telefono', 'email', 'fecha', 'hora'];
    for (const campo of camposRequeridos) {
      if (!data[campo]) {
        return createJsonResponse({ error: 'Campo requerido faltante: ' + campo });
      }
    }

    const horariosDisponibles = getAvailableSlots(data.fecha);
    if (!horariosDisponibles.includes(data.hora)) {
      return createJsonResponse({
        error: 'Lo sentimos, el horario ' + data.hora + ' ya fue reservado.',
        horariosDisponibles: horariosDisponibles
      });
    }

    // ===== Validacion extra para el servicio de deslanado =====
    if (data.deslanado) {
      const slotsDelDia = getTimeSlotsByDate(data.fecha);
      const idx = slotsDelDia.indexOf(data.hora);
      const siguiente = slotsDelDia[idx + 1];

      if (!siguiente) {
        return createJsonResponse({
          error: 'El horario ' + data.hora + ' no permite deslanado porque es el ultimo turno del dia.',
          horariosDisponibles: horariosDisponibles
        });
      }

      if (!horariosDisponibles.includes(siguiente)) {
        return createJsonResponse({
          error: 'El turno siguiente (' + siguiente + '), necesario para el deslanado, ya esta reservado.',
          horariosDisponibles: horariosDisponibles
        });
      }

      data.horaBloqueada = siguiente;
    }

    const resultado = saveReservation(data);

    if (resultado.success) {
      const emailResult = sendEmailConfirmation(data, resultado.reservaId);
      return createJsonResponse({
        success: true,
        reservaId: resultado.reservaId,
        email: emailResult
      });
    } else {
      return createJsonResponse({ error: resultado.error });
    }

  } catch (error) {
    return createJsonResponse({ error: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ==================== FUNCIONES DE DATOS ====================

function getAvailableSlots(fecha) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const horariosOcupados = [];

  const horariosDelDia = getTimeSlotsByDate(fecha);
  if (horariosDelDia.length === 0) {
    return [];
  }

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const fechaReserva = row[2];
    const horaReserva = row[3];

    // Las citas canceladas NO ocupan turno: se saltean para liberar el horario
    if (String(row[COL_ESTADO]).trim().toUpperCase() === 'CANCELADA') {
      continue;
    }

    if (fechaReserva && formatDateForComparison(fechaReserva) === fecha) {
      if (horaReserva) {
        horariosOcupados.push(formatTimeForComparison(horaReserva));
      }

      const deslanado = row[14];
      const horaBloqueada = row[15];
      if (deslanado === 'SI' && horaBloqueada) {
        horariosOcupados.push(formatTimeForComparison(horaBloqueada));
      }
    }
  }

  return horariosDelDia.filter(slot => !horariosOcupados.includes(slot));
}

function saveReservation(data) {
  try {
    const sheet = getSheet();
    const reservaId = generateReservationId();
    const timestamp = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });

    sheet.appendRow([
      reservaId,
      timestamp,
      data.fecha,
      data.hora,
      data.nombre,
      data.telefono,
      data.servicio || '',
      data.tamano || '',
      data.pelaje || '',
      data.nombreMascota || '',
      data.notasMascota || '',
      data.duracion || '',
      data.precio || '',
      data.extras || '',                                  // Extras
      data.deslanado ? 'SI' : 'NO',                       // Deslanado
      data.deslanado ? (data.horaBloqueada || '') : '',   // Hora Bloqueada
      data.email || '',                                   // Email (nueva columna)
      'Confirmada'                                         // Estado (nueva columna)
    ]);

    return { success: true, reservaId: reservaId };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ==================== CANCELAR CITA ====================

function cancelarReserva(id) {
  if (!id) {
    return createJsonResponse({ error: 'Falta el ID de reserva.' });
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (String(row[0]).trim().toUpperCase() === String(id).trim().toUpperCase()) {

        // Si ya estaba cancelada, avisamos y no hacemos nada mas
        if (String(row[COL_ESTADO]).trim().toUpperCase() === 'CANCELADA') {
          return createJsonResponse({
            error: 'Esta cita ya figura como cancelada.'
          });
        }

        // Datos para el email
        const reserva = {
          nombre: row[4],
          email: row[COL_EMAIL],
          fecha: row[2],
          hora: row[3],
          servicio: row[6]
        };

        // Marcar la fila como Cancelada (fila i+1, columna COL_ESTADO+1 en base 1)
        // No se borra: se conserva el historico y el turno queda libre porque
        // getAvailableSlots ignora las filas con estado "Cancelada".
        sheet.getRange(i + 1, COL_ESTADO + 1).setValue('Cancelada');

        // Email de aviso de cancelacion
        if (reserva.email) {
          sendEmailCancelacion(reserva, id);
        }

        return createJsonResponse({
          mensaje: 'Tu cita fue cancelada correctamente. Te enviamos la confirmacion por email.'
        });
      }
    }

    return createJsonResponse({
      error: 'No encontramos una cita con ese ID. Revisa el email de confirmacion.'
    });

  } catch (error) {
    return createJsonResponse({ error: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ==================== EMAILS ====================

function sendEmailConfirmation(data, reservaId) {
  try {
    if (!data.email) return { success: false, error: 'Sin email' };

    const asunto = 'Ha sido confirmada tu cita - ' + NEGOCIO;
    const htmlBody =
      '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#243b53;">' +
        '<h2 style="color:#1a4b8c;">Ha sido confirmada tu cita</h2>' +
        '<p>Hola ' + escapeHtml(data.nombre) + ', gracias por reservar en ' + NEGOCIO + '.</p>' +
        '<div style="background:#eef4fb;border:2px dashed #17b3c4;border-radius:12px;padding:16px;text-align:center;margin:16px 0;">' +
          '<div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#627d98;">ID de reserva</div>' +
          '<div style="font-size:26px;font-weight:bold;color:#1a4b8c;letter-spacing:1px;">' + reservaId + '</div>' +
          '<div style="font-size:12px;color:#627d98;">Guarda este ID: lo necesitas para cancelar tu cita.</div>' +
        '</div>' +
        '<h3 style="color:#1a4b8c;">Detalles de la agenda</h3>' +
        '<ul style="line-height:1.7;">' +
          '<li><b>Fecha:</b> ' + formatDateForClient(data.fecha) + '</li>' +
          '<li><b>Hora:</b> ' + escapeHtml(data.hora) + '</li>' +
          '<li><b>Servicio:</b> ' + escapeHtml(data.servicio || '') + '</li>' +
          '<li><b>Tamano:</b> ' + escapeHtml(data.tamano || '') + '</li>' +
          '<li><b>Mascota:</b> ' + escapeHtml(data.nombreMascota || '') + '</li>' +
          '<li><b>Extras:</b> ' + escapeHtml(data.extras || 'Sin extras') + '</li>' +
          '<li><b>Duracion:</b> ' + escapeHtml(String(data.duracion || '')) + '</li>' +
          '<li><b>Precio estimado:</b> ' + escapeHtml(String(data.precio || '')) + '</li>' +
        '</ul>' +
        '<p style="font-size:13px;color:#627d98;">Para cancelar tu cita, entra a nuestra web, toca ' +
        '"Cancelar una cita" e ingresa el ID <b>' + reservaId + '</b>.</p>' +
        '<p>- ' + NEGOCIO + '</p>' +
      '</div>';

    MailApp.sendEmail({ to: data.email, subject: asunto, htmlBody: htmlBody });
    return { success: true };
  } catch (error) {
    Logger.log('Error enviando email de confirmacion: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

function sendEmailCancelacion(reserva, reservaId) {
  try {
    const asunto = 'Tu cita fue cancelada - ' + NEGOCIO;
    const htmlBody =
      '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#243b53;">' +
        '<h2 style="color:#1a4b8c;">Tu cita fue cancelada</h2>' +
        '<p>Hola ' + escapeHtml(reserva.nombre || '') + ',</p>' +
        '<p>Tu cita con <b>ID ' + reservaId + '</b> fue cancelada correctamente.</p>' +
        '<ul style="line-height:1.7;">' +
          '<li><b>Fecha:</b> ' + formatDateForClient(reserva.fecha) + '</li>' +
          '<li><b>Hora:</b> ' + escapeHtml(String(reserva.hora || '')) + '</li>' +
        '</ul>' +
        '<p>Si fue un error, puedes volver a reservar desde nuestra web cuando quieras.</p>' +
        '<p>- ' + NEGOCIO + '</p>' +
      '</div>';

    MailApp.sendEmail({ to: reserva.email, subject: asunto, htmlBody: htmlBody });
    return { success: true };
  } catch (error) {
    Logger.log('Error enviando email de cancelacion: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// ==================== FUNCIONES AUXILIARES ====================

function getSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    const headers = [
      'ID Reserva', 'Timestamp', 'Fecha', 'Hora', 'Nombre Cliente',
      'Telefono', 'Servicio', 'Tamano', 'Pelaje', 'Nombre Mascota',
      'Notas Mascota', 'Duracion', 'Precio',
      'Extras', 'Deslanado', 'Hora Bloqueada', 'Email', 'Estado'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#4a90a4')
      .setFontColor('#ffffff');
    sheet.setColumnWidths(1, headers.length, 120);
  } else {
    ensureExtraColumns(sheet);
  }

  return sheet;
}

function ensureExtraColumns(sheet) {
  const expectedHeaders = [
    'ID Reserva', 'Timestamp', 'Fecha', 'Hora', 'Nombre Cliente',
    'Telefono', 'Servicio', 'Tamano', 'Pelaje', 'Nombre Mascota',
    'Notas Mascota', 'Duracion', 'Precio',
    'Extras', 'Deslanado', 'Hora Bloqueada', 'Email', 'Estado'
  ];

  const lastColumn = sheet.getLastColumn();
  if (lastColumn >= expectedHeaders.length) {
    return;
  }

  const newHeaders = expectedHeaders.slice(lastColumn);
  sheet.getRange(1, lastColumn + 1, 1, newHeaders.length).setValues([newHeaders]);
  sheet.getRange(1, lastColumn + 1, 1, newHeaders.length)
    .setFontWeight('bold')
    .setBackground('#4a90a4')
    .setFontColor('#ffffff');
}

function formatDateForComparison(fecha) {
  if (!fecha) return '';
  if (typeof fecha === 'string' && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return fecha;
  }
  if (fecha instanceof Date) {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  try {
    const dateObj = new Date(fecha);
    if (!isNaN(dateObj.getTime())) {
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {}
  return fecha.toString();
}

function getTimeSlotsByDate(fecha) {
  const dateParts = fecha.split('-');
  const year = Number(dateParts[0]);
  const month = Number(dateParts[1]) - 1;
  const day = Number(dateParts[2]);

  const dateObj = new Date(year, month, day);
  const dayOfWeek = dateObj.getDay();

  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    return TIME_SLOTS_WEEKDAY;
  }
  if (dayOfWeek === 6) {
    return TIME_SLOTS_SATURDAY;
  }
  return [];
}

function formatTimeForComparison(hora) {
  if (!hora) return '';
  if (typeof hora === 'string' && hora.match(/^\d{1,2}:\d{2}$/)) {
    const parts = hora.split(':');
    return String(parts[0]).padStart(2, '0') + ':' + parts[1];
  }
  if (hora instanceof Date) {
    const hours = String(hora.getHours()).padStart(2, '0');
    const minutes = String(hora.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  try {
    const dateObj = new Date(hora);
    if (!isNaN(dateObj.getTime())) {
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
  } catch (e) {}
  return hora.toString();
}

function generateReservationId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `TR-${timestamp}-${random}`.toUpperCase();
}

function formatDateForClient(fecha) {
  if (!fecha) return '';
  const f = formatDateForComparison(fecha);
  const parts = f.split('-');
  if (parts.length === 3) {
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }
  return f;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

## Pasos para activarlo

1. Reemplaza tu `Code.gs` por el código de arriba (o pega solo las partes nuevas:
   `doGet`, `doPost`, `saveReservation`, `getAvailableSlots`, `cancelarReserva`,
   `sendEmailConfirmation`, `sendEmailCancelacion`, `getSheet`/`ensureExtraColumns`,
   `formatDateForClient`, `escapeHtml` y las constantes `NEGOCIO`, `COL_EMAIL` y
   `COL_ESTADO`).
2. **Deploy → Manage deployments → Edit (lápiz) → New version → Deploy** para que la
   misma URL (`SCRIPT_URL`) tome los cambios.
3. La primera vez que se envíe un correo, Google pedirá **autorizar el permiso de
   `MailApp`**: aceptalo con tu cuenta.
4. Probá una reserva de punta a punta: te debería llegar el email con el ID, y ese ID
   debería cancelar la cita desde el botón "Cancelar una cita".

> Nota: la cancelación **no borra la fila**: la marca como `Cancelada` en la columna
> `Estado`, así conservás el histórico. El turno queda libre igualmente porque
> `getAvailableSlots` ignora las filas canceladas. Si en tu hoja ya tenés reservas
> viejas sin la columna `Estado`, esas filas se siguen contando como ocupadas (estado
> vacío ≠ "Cancelada"); podés completarlas a mano con `Confirmada` si querés.
