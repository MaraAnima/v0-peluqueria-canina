// ==================== CONFIGURACION ====================
const SPREADSHEET_ID = '11rzRToVwRoBOVNr-G0KYV7gi_NCUEmBG2UsMhydc3Cg';
const SHEET_NAME = 'Reservas';
const TIME_SLOTS_WEEKDAY = ['12:00', '14:00', '16:00'];
const WEEKDAY_SLOT_MINUTES = 120;
const TIME_SLOTS_SATURDAY = ['09:00', '13:00'];
const TIME_SLOTS_SUNDAY = ['09:00', '11:00', '13:00'];
const BLOCKED_DATES = ['01-01', '05-01', '07-18', '08-25', '12-25'];
const BUSINESS_TIME_ZONE = 'America/Montevideo';
const META_VERIFY_TOKEN = '5WtuSqoYeO4LKk1CQT2Xdwn0D3F8';
const NEGOCIO = 'TR Corte';

const COL_EMAIL = 16;
const COL_ESTADO = 17;

// ==================== FUNCIONES PRINCIPALES ====================

function doGet(e) {
  try {
    const params = e.parameter || {};
    const queryString = e.queryString || '';
    const metaMode = getRequestParam(params, queryString, 'hub.mode') || getRequestParam(params, queryString, 'hub_mode');

    if (metaMode === 'subscribe') {
      return verifyMetaWebhook(params, queryString);
    }

    if (params.action === 'cancelar') {
      return cancelarReserva(params.id);
    }

    if (params.action === 'consultarReagenda') {
      return consultarReagenda(params.id, params.fecha);
    }

    const fecha = params.fecha;
    if (!fecha) {
      return createJsonResponse({ error: 'Fecha requerida' });
    }

    return createJsonResponse({
      success: true,
      fecha: fecha,
      horarios: getAvailableSlots(fecha)
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

    if (isMetaWebhookPayload(data)) {
      return ContentService
        .createTextOutput('EVENT_RECEIVED')
        .setMimeType(ContentService.MimeType.TEXT);
    }

    if (data.action === 'reagendar') {
      return reagendarReserva(data);
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
    if (!resultado.success) {
      return createJsonResponse({ error: resultado.error });
    }

    const emailResult = sendEmailConfirmation(data, resultado.reservaId);
    return createJsonResponse({
      success: true,
      reservaId: resultado.reservaId,
      email: emailResult
    });
  } catch (error) {
    return createJsonResponse({ error: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ==================== META / WHATSAPP ====================

function verifyMetaWebhook(params, queryString) {
  const token = getRequestParam(params, queryString, 'hub.verify_token') || getRequestParam(params, queryString, 'hub_verify_token');
  const challenge = getRequestParam(params, queryString, 'hub.challenge') || getRequestParam(params, queryString, 'hub_challenge');

  if (token === META_VERIFY_TOKEN && challenge) {
    return ContentService
      .createTextOutput(challenge)
      .setMimeType(ContentService.MimeType.TEXT);
  }

  return ContentService
    .createTextOutput('Token de verificacion invalido')
    .setMimeType(ContentService.MimeType.TEXT);
}

function getRequestParam(params, queryString, name) {
  if (params && Object.prototype.hasOwnProperty.call(params, name)) {
    return params[name];
  }

  if (!queryString) {
    return '';
  }

  const pairs = queryString.split('&');
  for (let i = 0; i < pairs.length; i++) {
    const parts = pairs[i].split('=');
    const key = decodeURIComponent((parts[0] || '').replace(/\+/g, ' '));
    if (key === name) {
      return decodeURIComponent((parts.slice(1).join('=') || '').replace(/\+/g, ' '));
    }
  }

  return '';
}

function isMetaWebhookPayload(data) {
  return data && (
    data.object === 'whatsapp_business_account' ||
    Array.isArray(data.entry)
  );
}

// ==================== FUNCIONES DE DATOS ====================

function getAvailableSlots(fecha, excludedReservationId) {
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

    if (excludedReservationId &&
        String(row[0]).trim().toUpperCase() === excludedReservationId) {
      continue;
    }

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

  // Keep existing weekday bookings blocked when the schedule shifts.
  const usesWeekdaySlots = horariosDelDia === TIME_SLOTS_WEEKDAY;
  return horariosDelDia
    .filter(slot => !horariosOcupados.some(hora =>
      hora === slot || (usesWeekdaySlots &&
        Math.abs(timeToMinutes(hora) - timeToMinutes(slot)) < WEEKDAY_SLOT_MINUTES)
    ))
    .filter(slot => !isPastTimeSlot(fecha, slot));
}

function saveReservation(data) {
  try {
    const sheet = getSheet();
    const reservaId = generateReservationId();
    const timestamp = new Date().toLocaleString('es-UY', { timeZone: BUSINESS_TIME_ZONE });

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
      data.extras || '',
      data.deslanado ? 'SI' : 'NO',
      data.deslanado ? (data.horaBloqueada || '') : '',
      data.email || '',
      'Confirmada',
      '',
      reservationCommissionFormula()
    ]);

    trySortReservations(sheet);

    return { success: true, reservaId: reservaId };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

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
        if (String(row[COL_ESTADO]).trim().toUpperCase() === 'CANCELADA') {
          return createJsonResponse({ error: 'Esta cita ya figura como cancelada.' });
        }

        const reserva = {
          nombre: row[4],
          email: row[COL_EMAIL],
          fecha: row[2],
          hora: row[3],
          servicio: row[6]
        };

        sheet.getRange(i + 1, COL_ESTADO + 1).setValue('Cancelada');

        if (reserva.email) {
          sendEmailCancelacion(reserva, id);
        }

        return createJsonResponse({
          success: true,
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

// ==================== REAGENDAR CITA ====================

function findReschedulableReservation(id) {
  const normalizedId = typeof id === 'string' ? id.trim().toUpperCase() : '';
  if (!/^TR-[A-Z0-9]+-[A-Z0-9]+$/.test(normalizedId) || normalizedId.length > 80) {
    throw new Error('Ingresa un ID de reserva valido.');
  }

  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();
  const index = rows.findIndex((row, i) =>
    i > 0 && String(row[0]).trim().toUpperCase() === normalizedId
  );
  if (index < 0) {
    throw new Error('No encontramos una cita con ese ID. Revisa el email de confirmacion.');
  }
  const row = rows[index];
  if (String(row[COL_ESTADO]).trim().toUpperCase() === 'CANCELADA') {
    throw new Error('Esta cita esta cancelada y no se puede reagendar.');
  }
  const fecha = formatDateForComparison(row[2]);
  const hora = formatTimeForComparison(row[3]);
  if (!isValidReservationDate(fecha) || !/^\d{2}:\d{2}$/.test(hora) ||
      isPastReservationTime(fecha, hora)) {
    throw new Error('Solo se pueden reagendar citas que todavia no comenzaron.');
  }
  return { id: normalizedId, sheet: sheet, row: row, rowNumber: index + 1, fecha: fecha, hora: hora };
}

function isValidReservationDate(fecha) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const parts = fecha.split('-').map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return date.getFullYear() === parts[0] && date.getMonth() === parts[1] - 1 &&
    date.getDate() === parts[2];
}

function isPastReservationTime(fecha, hora) {
  const now = new Date();
  const today = Utilities.formatDate(now, BUSINESS_TIME_ZONE, 'yyyy-MM-dd');
  const currentTime = Utilities.formatDate(now, BUSINESS_TIME_ZONE, 'HH:mm');
  return fecha < today || (fecha === today && hora <= currentTime);
}

function consultarReagenda(id, fecha) {
  try {
    const reservation = findReschedulableReservation(id);
    const result = {
      success: true,
      reserva: {
        id: reservation.id,
        fecha: reservation.fecha,
        hora: reservation.hora,
        mascota: String(reservation.row[9] || ''),
        servicio: String(reservation.row[6] || ''),
        deslanado: reservation.row[14] === 'SI'
      }
    };
    if (fecha !== undefined) {
      if (!isValidReservationDate(fecha)) {
        throw new Error('La fecha elegida no es valida.');
      }
      result.fecha = fecha;
      result.horarios = isPastReservationTime(fecha, '23:59') ? [] :
        getAvailableSlots(fecha, reservation.id);
    }
    return createJsonResponse(result);
  } catch (error) {
    return createJsonResponse({ error: error.message });
  }
}

// Called from doPost while the reservation lock is held.
function reagendarReserva(data) {
  const reservation = findReschedulableReservation(data.id);
  const fecha = data.fecha;
  const hora = data.hora;
  if (!isValidReservationDate(fecha) || typeof hora !== 'string' ||
      !getTimeSlotsByDate(fecha).includes(hora) || isPastReservationTime(fecha, hora)) {
    return createJsonResponse({ error: 'La fecha o el horario elegidos no estan disponibles.' });
  }
  if (data.fechaActual !== reservation.fecha || data.horaActual !== reservation.hora) {
    return createJsonResponse({
      error: 'Esta cita cambio mientras la estabas viendo. Busca nuevamente el ID.',
      code: 'RESERVA_ACTUALIZADA'
    });
  }
  if (fecha === reservation.fecha && hora === reservation.hora) {
    return createJsonResponse({ error: 'Elegi una fecha u hora diferente a la cita actual.' });
  }

  const available = getAvailableSlots(fecha, reservation.id);
  if (!available.includes(hora)) {
    return createJsonResponse({ error: 'Ese horario acaba de ocuparse. Elegi otro turno.', code: 'HORARIO_OCUPADO' });
  }
  let blockedTime = '';
  if (reservation.row[14] === 'SI') {
    const slots = getTimeSlotsByDate(fecha);
    blockedTime = slots[slots.indexOf(hora) + 1];
    if (!blockedTime || !available.includes(blockedTime)) {
      return createJsonResponse({
        error: 'El deslanado necesita que el turno siguiente tambien este libre.',
        code: 'HORARIO_OCUPADO'
      });
    }
  }

  // One sheet write moves the appointment and its extra slot together.
  const values = reservation.row.slice(2, 16);
  values[0] = fecha;
  values[1] = hora;
  values[13] = blockedTime;
  reservation.sheet.getRange(reservation.rowNumber, 3, 1, 14).setValues([values]);
  trySortReservations(reservation.sheet);

  const emailResult = sendEmailReagenda(reservation, fecha, hora);
  return createJsonResponse({
    success: true,
    reservaId: reservation.id,
    fecha: fecha,
    hora: hora,
    email: emailResult
  });
}

function sendEmailReagenda(reservation, fecha, hora) {
  try {
    const email = reservation.row[COL_EMAIL];
    if (!email) return { success: false };
    MailApp.sendEmail({
      to: email,
      subject: 'Tu cita fue reagendada - ' + NEGOCIO,
      htmlBody: '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#243b53;">' +
        '<h2>Tu cita fue reagendada</h2><p>Hola ' + escapeHtml(reservation.row[4]) + ',</p>' +
        '<p><b>ID de reserva:</b> ' + escapeHtml(reservation.id) + '</p>' +
        '<p><b>Turno anterior:</b> ' + formatDateForClient(reservation.fecha) + ' a las ' +
        escapeHtml(reservation.hora) + '</p>' +
        '<p><b>Nuevo turno:</b> ' + formatDateForClient(fecha) + ' a las ' + escapeHtml(hora) + '</p>' +
        '<p><b>Mascota:</b> ' + escapeHtml(reservation.row[9]) + '<br><b>Servicio:</b> ' +
        escapeHtml(reservation.row[6]) + '</p><p>Conserva el mismo ID para gestionar tu cita.</p>' +
        '<p>' + NEGOCIO + '</p></div>'
    });
    return { success: true };
  } catch (error) {
    Logger.log('Error enviando email de reagenda: ' + error.toString());
    return { success: false };
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
          '<div style="font-size:12px;color:#627d98;">Guarda este ID: lo necesitas para reagendar o cancelar tu cita.</div>' +
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
          '<li><b>Precio estimado:</b> $' + escapeHtml(String(data.precio || '')) + '</li>' +
        '</ul>' +
        '<p style="font-size:13px;color:#627d98;">Para gestionar tu cita, entra a nuestra web, toca "Reagendar cita" o "Cancelar una cita" e ingresa el ID <b>' + reservaId + '</b>.</p>' +
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

// ==================== COMISIONES DE RESERVAS ====================

function reservationCommissionFormula() {
  // ROW follows the sorted reservation; separators match the sheet's es_ES locale.
  return '=IF(INDEX($M:$M;ROW())="";"";IFERROR(ROUND(INDEX($M:$M;ROW())/(1+22%)*10%;0);""))';
}

function updateReservationCommissions(sheet, firstRow = 2, lastRow = sheet.getLastRow()) {
  firstRow = Math.max(2, firstRow);
  if (lastRow < firstRow) return;
  const formulas = Array.from({ length: lastRow - firstRow + 1 }, () => [reservationCommissionFormula()]);
  sheet.getRange(firstRow, 20, formulas.length, 1).setFormulas(formulas);
}

function actualizarComisionesReservas() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    updateReservationCommissions(getSheet());
  } finally {
    lock.releaseLock();
  }
}

function updateReservationCommissionsOnEdit(e) {
  if (!e || !e.range || !e.source || e.source.getId() !== SPREADSHEET_ID) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== SHEET_NAME || e.range.getLastRow() < 2 ||
      e.range.getColumn() > 13 || e.range.getLastColumn() < 13) return;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  try {
    updateReservationCommissions(sheet, e.range.getRow(), e.range.getLastRow());
  } catch (error) {
    Logger.log('No se pudo actualizar la comision: ' + error.toString());
  } finally {
    lock.releaseLock();
  }
}

// ==================== ORDEN AUTOMATICO DE RESERVAS ====================

function reservationDateSortKey(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Number(Utilities.formatDate(value, BUSINESS_TIME_ZONE, 'yyyyMMdd'));
  }
  if (typeof value === 'number' && isFinite(value) && value >= 0 && value < 2958466) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000);
    return date.getUTCFullYear() * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
  }
  const text = String(value || '').trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const local = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const parts = iso ? [Number(iso[1]), Number(iso[2]), Number(iso[3])] :
    local ? [Number(local[3]), Number(local[2]), Number(local[1])] : null;
  if (parts) {
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    if (date.getFullYear() === parts[0] && date.getMonth() === parts[1] - 1 &&
        date.getDate() === parts[2]) {
      return parts[0] * 10000 + parts[1] * 100 + parts[2];
    }
  }
  return 99999999;
}

function reservationTimeSortKey(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return timeToMinutes(Utilities.formatDate(value, BUSINESS_TIME_ZONE, 'HH:mm'));
  }
  if (typeof value === 'number' && isFinite(value)) {
    if (value >= 0 && value < 1) return Math.round(value * 1440);
    if (Number.isInteger(value) && value >= 1 && value <= 23) return value * 60;
  }
  const match = String(value ?? '').trim().match(/^(\d{1,2})(?::(\d{2})(?::\d{2})?)?$/);
  if (match && Number(match[1]) < 24 && Number(match[2] || 0) < 60) {
    return Number(match[1]) * 60 + Number(match[2] || 0);
  }
  return 9999;
}

function sortReservationsByDate(sheet) {
  const count = sheet.getLastRow() - 1;
  if (count < 2) return;
  const lastDataColumn = Math.max(sheet.getLastColumn(), COL_ESTADO + 1);
  const firstKeyColumn = lastDataColumn + 1;
  const extraColumns = firstKeyColumn + 1 - sheet.getMaxColumns();
  if (extraColumns > 0) sheet.insertColumnsAfter(sheet.getMaxColumns(), extraColumns);

  const values = sheet.getRange(2, 3, count, 2).getValues();
  const keys = values.map(row => [reservationDateSortKey(row[0]), reservationTimeSortKey(row[1])]);
  const keyRange = sheet.getRange(2, firstKeyColumn, count, 2);
  try {
    keyRange.setValues(keys);
    // Native sorting preserves whole rows, including formatting, notes and formulas.
    sheet.getRange(2, 1, count, firstKeyColumn + 1).sort([
      { column: firstKeyColumn, ascending: true },
      { column: firstKeyColumn + 1, ascending: true }
    ]);
  } finally {
    keyRange.clearContent();
  }
}

function trySortReservations(sheet) {
  try {
    sortReservationsByDate(sheet);
    return true;
  } catch (error) {
    // A completed reservation remains successful even if the sorting service fails.
    Logger.log('No se pudo ordenar Reservas: ' + error.toString());
    return false;
  }
}

function ordenarReservasPorFecha() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    sortReservationsByDate(getSheet());
  } finally {
    lock.releaseLock();
  }
}

function sortReservationsOnEdit(e) {
  if (!e || !e.range || !e.source || e.source.getId() !== SPREADSHEET_ID) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== SHEET_NAME || e.range.getLastRow() < 2 ||
      e.range.getColumn() > 4 || e.range.getLastColumn() < 3) return;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  try {
    trySortReservations(sheet);
  } finally {
    lock.releaseLock();
  }
}

function onEdit(e) {
  updateReservationCommissionsOnEdit(e);
  sortReservationsOnEdit(e);
}

// ==================== FUNCIONES AUXILIARES ====================

function getSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  ensureExtraColumns(sheet);
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
  if (lastColumn === 0) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    styleHeaders(sheet, expectedHeaders.length);
    return;
  }

  const currentHeaders = sheet.getRange(1, 1, 1, Math.max(lastColumn, 1)).getValues()[0];
  for (let i = 0; i < expectedHeaders.length; i++) {
    if (!currentHeaders[i]) {
      sheet.getRange(1, i + 1).setValue(expectedHeaders[i]);
    }
  }

  styleHeaders(sheet, expectedHeaders.length);
}

function styleHeaders(sheet, headerCount) {
  sheet.getRange(1, 1, 1, headerCount)
    .setFontWeight('bold')
    .setBackground('#4a90a4')
    .setFontColor('#ffffff');
  sheet.setColumnWidths(1, headerCount, 120);
}

function formatDateForComparison(fecha) {
  if (!fecha) return '';
  if (typeof fecha === 'string' && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return fecha;
  }
  if (fecha instanceof Date) {
    return Utilities.formatDate(fecha, BUSINESS_TIME_ZONE, 'yyyy-MM-dd');
  }
  try {
    const dateObj = new Date(fecha);
    if (!isNaN(dateObj.getTime())) {
      return Utilities.formatDate(dateObj, BUSINESS_TIME_ZONE, 'yyyy-MM-dd');
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
  const dateKey = String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');

  if (BLOCKED_DATES.includes(dateKey)) {
    return [];
  }

  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    return TIME_SLOTS_WEEKDAY;
  }

  if (dayOfWeek === 6) {
    return TIME_SLOTS_SATURDAY;
  }

  if (dayOfWeek === 0) {
    return TIME_SLOTS_SUNDAY;
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
    return Utilities.formatDate(hora, BUSINESS_TIME_ZONE, 'HH:mm');
  }
  try {
    const dateObj = new Date(hora);
    if (!isNaN(dateObj.getTime())) {
      return Utilities.formatDate(dateObj, BUSINESS_TIME_ZONE, 'HH:mm');
    }
  } catch (e) {}
  return hora.toString();
}

function timeToMinutes(hora) {
  const [hours, minutes] = hora.split(':').map(Number);
  return hours * 60 + minutes;
}

function isPastTimeSlot(fecha, slot) {
  const today = Utilities.formatDate(new Date(), BUSINESS_TIME_ZONE, 'yyyy-MM-dd');
  if (fecha !== today) {
    return false;
  }

  const nowTime = Utilities.formatDate(new Date(), BUSINESS_TIME_ZONE, 'HH:mm');
  return slot <= nowTime;
}

function formatDateForClient(fecha) {
  if (!fecha) return '';
  if (fecha instanceof Date) {
    return Utilities.formatDate(fecha, BUSINESS_TIME_ZONE, 'dd/MM/yyyy');
  }
  if (typeof fecha === 'string' && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const parts = fecha.split('-');
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }
  return String(fecha);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateReservationId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `TR-${timestamp}-${random}`.toUpperCase();
}

function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== FUNCIONES DE DEBUG ====================

function testGetSlots() {
  const fecha = '2026-08-01';
  const slots = getAvailableSlots(fecha);
  Logger.log('Horarios disponibles para ' + fecha + ': ' + JSON.stringify(slots));
}

function debugVerFechas() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();

  Logger.log('=== DEBUG FECHAS ===');
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    Logger.log('Fila ' + (i + 1) + ':');
    Logger.log('  - Fecha formateada: ' + formatDateForComparison(row[2]));
    Logger.log('  - Hora formateada: ' + formatTimeForComparison(row[3]));
    Logger.log('  - Estado: ' + row[COL_ESTADO]);
    Logger.log('  - Deslanado: ' + row[14] + ' | Hora bloqueada: ' + row[15]);
  }
}
