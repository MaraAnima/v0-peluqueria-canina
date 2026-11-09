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

    const trInboxResponse = trInboxDoGet(e);
    if (trInboxResponse) return trInboxResponse;

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
  const trInboxResponse = trInboxDoPost(e);
  if (trInboxResponse) return trInboxResponse;

  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return createJsonResponse({ error: 'Error al parsear datos' });
    }
    // Los webhooks de Meta ya fueron procesados por trInboxDoPost(e).

    if (data.action === 'reagendar') {
      return reagendarReserva(data);
    }

    const camposRequeridos = ['nombre', 'telefono', 'fecha', 'hora', 'servicio', 'tamano', 'pelaje', 'nombreMascota'];
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

    const emailResult = data.email ? sendEmailConfirmation(data, resultado.reservaId) : { success: false, skipped: true };
    const whatsappResult = sendWhatsappReservationConfirmation(data, resultado.reservaId);
    return createJsonResponse({
      success: true,
      reservaId: resultado.reservaId,
      email: emailResult,
      whatsapp: whatsappResult
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
  if (!isValidReservationDate(fecha) || isPastReservationTime(fecha, '23:59')) return [];
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

function reservationBreedColumn(sheet, fixedColumns) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn > fixedColumns) {
    const headers = sheet.getRange(1, fixedColumns + 1, 1, lastColumn - fixedColumns).getValues()[0];
    const index = headers.findIndex(header => String(header).trim().toLowerCase() === 'raza');
    if (index >= 0) return fixedColumns + index + 1;
  }

  const column = Math.max(lastColumn, fixedColumns) + 1;
  const maxColumns = sheet.getMaxColumns();
  if (column > maxColumns) sheet.insertColumnsAfter(maxColumns, column - maxColumns);
  sheet.getRange(1, column).setValue('Raza');
  return column;
}

function saveReservation(data) {
  try {
    const sheet = getSheet();
    const reservaId = generateReservationId();
    const timestamp = new Date().toLocaleString('es-UY', { timeZone: BUSINESS_TIME_ZONE });

    const row = [
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
    ];

    const breed = typeof data.razaMascota === 'string' ? data.razaMascota.trim() : '';
    if (breed && breed.length <= 80 && !/^[=+@-]|[\r\n]/.test(breed)) {
      const breedColumn = reservationBreedColumn(sheet, row.length);
      while (row.length < breedColumn) row.push('');
      row[breedColumn - 1] = breed;
    }
    sheet.appendRow(row);
    const ultimaFila = sheet.getLastRow();

if (String(sheet.getRange(ultimaFila, 2).getValue()).trim().toLowerCase() === 'cancelada') {
  sheet
    .getRange(ultimaFila, 1, 1, sheet.getLastColumn())
    .setBackground('#f4cccc');
}

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
          mensaje: 'Tu cita fue cancelada correctamente.'
        });
      }
    }

    return createJsonResponse({
      error: 'No encontramos una cita con ese ID. Revisa el ID de reserva.'
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

// Called from web or WhatsApp while the reservation lock is held.
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

// ==================== WHATSAPP INBOX / AUTOMATIZACION ====================
// Pegar este archivo completo en Apps Script. Mantiene agenda web + webhook Meta + panel interno.
/**
 * TR Corte / Tu Racion - WhatsApp Inbox para Google Apps Script.
 *
 * Este archivo ya esta integrado con la agenda actual:
 *
 * 1. Pegar el archivo completo en Apps Script.
 * 2. Ejecutar una vez setupTrInbox().
 * 3. Configurar Script Properties:
 *      WHATSAPP_ACCESS_TOKEN
 *      WHATSAPP_PHONE_NUMBER_ID
 *      WHATSAPP_VERIFY_TOKEN
 *      WHATSAPP_GRAPH_VERSION
 *      PANEL_API_KEY
 *      WHATSAPP_RESERVATION_TEMPLATE_NAME
 *      WHATSAPP_RESERVATION_TEMPLATE_LANGUAGE
 */

var TR_SHEETS = {
  conversations: "Conversaciones",
  messages: "Mensajes",
  flows: "Flujos",
  nodes: "FlowNodes",
  edges: "FlowEdges",
  logs: "WebhookLogs"
};

var TR_INBOX_VERSION = "2026-11-07-whatsapp-reschedule-confirmation";

var TR_HEADERS = {
  Conversaciones: [
    "ID",
    "Telefono",
    "Nombre Cliente",
    "Estado",
    "Etiquetas",
    "Reserva ID",
    "Ultimo Mensaje",
    "Ultimo Mensaje At",
    "Flow ID",
    "Flow Node ID",
    "Bot State",
    "Bot Data JSON",
    "Updated At"
  ],
  Mensajes: [
    "ID",
    "Conversation ID",
    "WhatsApp Message ID",
    "Direccion",
    "Texto",
    "Timestamp",
    "Estado",
    "Automatico",
    "Usuario",
    "Error"
  ],
  Flujos: ["ID", "Nombre", "Activo", "Disparadores", "Start Node ID", "Updated At"],
  FlowNodes: ["ID", "Flow ID", "Tipo", "Titulo", "Texto", "Opciones JSON", "Pos X", "Pos Y"],
  FlowEdges: ["ID", "Flow ID", "From Node ID", "To Node ID", "Condicion"],
  WebhookLogs: ["Timestamp", "Tipo", "Detalle"]
};

function setupTrInbox() {
  Object.keys(TR_HEADERS).forEach(function (sheetName) {
    var sheet = trGetOrCreateSheet_(sheetName);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(TR_HEADERS[sheetName]);
    } else {
      trEnsureHeaders_(sheet, TR_HEADERS[sheetName]);
    }
  });
  trCreateDefaultWelcomeFlow_();
}

function trInboxDoGet(e) {
  e = e || { parameter: {} };
  var params = e.parameter || {};

  if (params["hub.mode"] === "subscribe") {
    var verifyToken = trProp_("WHATSAPP_VERIFY_TOKEN");
    if (params["hub.verify_token"] === verifyToken) {
      return ContentService.createTextOutput(params["hub.challenge"] || "");
    }
    return ContentService.createTextOutput("Forbidden").setMimeType(ContentService.MimeType.TEXT);
  }

  if (!params.trInboxAction) return null;

  var authError = trRequirePanelKey_(params.panelKey);
  if (authError) return trJson_(authError, 401);

  if (params.trInboxAction === "version") {
    return trJson_({ version: TR_INBOX_VERSION });
  }

  if (params.trInboxAction === "listConversations") {
    return trJson_({ conversations: trListConversations_() });
  }

  if (params.trInboxAction === "listMessages") {
    return trJson_({ messages: trListMessages_(params.conversationId) });
  }

  if (params.trInboxAction === "listFlows") {
    return trJson_({
      flows: trSheetToObjects_(TR_SHEETS.flows),
      nodes: trSheetToObjects_(TR_SHEETS.nodes),
      edges: trSheetToObjects_(TR_SHEETS.edges)
    });
  }

  if (params.trInboxAction === "listLogs") {
    return trJson_({ logs: trListLogs_(params.limit) });
  }

  if (params.trInboxAction === "syncReservations") {
    return trJson_({
      synced: trSyncReservationConversations_(params)
    });
  }

  return trJson_({ error: "Accion no soportada" }, 400);
}

function trInboxDoPost(e) {
  var body = trParseBody_(e);
  if (!body) return null;

  if (body.object === "whatsapp_business_account" && body.entry) {
    trProcessWhatsappWebhook_(body);
    return trJson_({ ok: true });
  }

  if (!body.trInboxAction) return null;

  var authError = trRequirePanelKey_(body.panelKey);
  if (authError) return trJson_(authError, 401);

  if (body.trInboxAction === "saveFlow") {
    trSaveFlow_(body.flow || {});
    return trJson_({ ok: true });
  }

  if (body.trInboxAction === "updateConversation") {
    var conversation = trUpdateInboxConversation_(body.conversationId, body.patch || {});
    return trJson_({ ok: true, conversation: conversation });
  }

  return trJson_({ error: "Accion no soportada" }, 400);
}

function trProcessWhatsappWebhook_(payload) {
  try {
    var summary = trWebhookSummary_(payload);
    trLog_("webhook_received", summary);

    (payload.entry || []).forEach(function (entry) {
      (entry.changes || []).forEach(function (change) {
        var value = change.value || {};

        (value.statuses || []).forEach(function (status) {
          trUpdateMessageStatus_(status.id, status.status, status.errors || []);
        });

        (value.messages || []).forEach(function (message) {
          var text = trExtractIncomingText_(message);
          if (!text) return;
          var phone = message.from;
          var contact = trFindContact_(value.contacts || [], phone);
          var timestamp = message.timestamp
            ? new Date(Number(message.timestamp) * 1000)
            : new Date();

          var conversation = trUpsertConversation_(phone, contact, text, timestamp);
          trAppendMessage_({
            conversationId: conversation.ID,
            whatsappMessageId: message.id,
            direction: "inbound",
            text: text,
            timestamp: timestamp,
            status: "received",
            automatic: false,
            user: "",
            error: ""
          });

          trRunFlowForIncoming_(conversation, text);
        });
      });
    });
  } catch (err) {
    trLog_("webhook_error", err && err.stack ? err.stack : String(err));
  }
}

function trWebhookSummary_(payload) {
  var messageCount = 0;
  var statusCount = 0;
  var phones = [];
  (payload.entry || []).forEach(function (entry) {
    (entry.changes || []).forEach(function (change) {
      var value = change.value || {};
      statusCount += (value.statuses || []).length;
      (value.messages || []).forEach(function (message) {
        messageCount++;
        if (message.from) phones.push(trNormalizePhone_(message.from));
      });
    });
  });
  return "messages=" + messageCount + " statuses=" + statusCount + " phones=" + phones.join(",");
}

function trRunFlowForIncoming_(conversation, text) {
  if (conversation.Estado === "Resuelto") {
    var reset = { Estado: "Abierto", "Flow ID": "", "Flow Node ID": "", "Bot State": "", "Bot Data JSON": "" };
    trMarkConversation_(conversation.ID, reset);
    conversation = Object.assign({}, conversation, reset);
  }

  if (conversation["Bot State"]) {
    trHandleBotState_(conversation, text);
    return;
  }

  var flowId = conversation["Flow ID"];
  var nodeId = conversation["Flow Node ID"];

  if (!flowId) {
    var flow = trFindMatchingFlow_(text) || trFindDefaultWelcomeFlow_();
    if (!flow) {
      trMarkConversation_(conversation.ID, { Estado: "Abierto" });
      return;
    }
    flowId = flow.ID;
    nodeId = flow["Start Node ID"];
    trMarkConversation_(conversation.ID, {
      "Flow ID": flowId,
      "Flow Node ID": nodeId,
      Estado: "Abierto"
    });
  } else {
    var currentNode = trFindNode_(flowId, nodeId);
    if (!currentNode) {
      trRestartWelcomeFlow_(conversation);
      return;
    }
    if (currentNode && currentNode.Tipo === "question") {
      var nextFromAnswer = trFindEdgeForAnswer_(flowId, nodeId, text);
      if (!nextFromAnswer) {
        trSendAutomaticMessage_(conversation.ID, conversation.Telefono, "No reconozco esa opcion. Elegi un boton, escribi su nombre o su numero.");
        trExecuteFlowNode_(conversation.ID, conversation.Telefono, flowId, nodeId, 0);
        return;
      }
      nodeId = nextFromAnswer["To Node ID"];
    } else {
      var nextEdge = trFirstEdgeFrom_(flowId, nodeId);
      if (nextEdge) nodeId = nextEdge["To Node ID"];
    }
  }

  trExecuteFlowNode_(conversation.ID, conversation.Telefono, flowId, nodeId, 0);
}

function trRestartWelcomeFlow_(conversation) {
  var defaultFlow = trFindDefaultWelcomeFlow_();
  if (!defaultFlow) return;
  trMarkConversation_(conversation.ID, {
    Estado: "Abierto",
    "Flow ID": defaultFlow.ID,
    "Flow Node ID": defaultFlow["Start Node ID"],
    "Bot State": "",
    "Bot Data JSON": ""
  });
  trExecuteFlowNode_(conversation.ID, conversation.Telefono, defaultFlow.ID, defaultFlow["Start Node ID"], 0);
}

function trExecuteFlowNode_(conversationId, phone, flowId, nodeId, depth) {
  if (!nodeId || depth > 8) return;

  var node = trFindNode_(flowId, nodeId);
  if (!node) return;

  trMarkConversation_(conversationId, {
    "Flow ID": flowId,
    "Flow Node ID": nodeId
  });

  if (node.Tipo === "start") {
    var nextStart = trFirstEdgeFrom_(flowId, nodeId);
    if (nextStart) trExecuteFlowNode_(conversationId, phone, flowId, nextStart["To Node ID"], depth + 1);
    return;
  }

  if (node.Tipo === "message") {
    trSendAutomaticMessage_(conversationId, phone, node.Texto);
    var nextMessage = trFirstEdgeFrom_(flowId, nodeId);
    if (nextMessage) trExecuteFlowNode_(conversationId, phone, flowId, nextMessage["To Node ID"], depth + 1);
    return;
  }

  if (node.Tipo === "question") {
    var options = trParseJson_(node["Opciones JSON"], []);
    var edges = trEdgesFrom_(flowId, nodeId);
    if (options.length && options.length <= 3) {
      var buttons = options.map(function (item, index) {
        return {
          id: edges[index] ? edges[index]["To Node ID"] : String(index + 1),
          title: item
        };
      });
      trSendAutomaticButtons_(conversationId, phone, node.Texto, buttons);
      return;
    }

    var body = node.Texto;
    if (options.length) {
      body += "\n\n" + options.map(function (item, index) {
        return index + 1 + ". " + item;
      }).join("\n");
    }
    trSendAutomaticMessage_(conversationId, phone, body);
    return;
  }

  if (node.Tipo === "handoff") {
    trSendAutomaticMessage_(conversationId, phone, node.Texto);
    trMarkConversation_(conversationId, {
      Estado: "Resuelto",
      "Flow Node ID": ""
    });
    return;
  }

  if (node.Tipo === "action") {
    if (node.ID === "schedule") {
      trAskReservationType_(conversationId, phone);
      return;
    }

    if (node.ID === "cancel") {
      trSetBotState_(conversationId, "esperando_cancelacion_id", {});
      trSendAutomaticMessage_(conversationId, phone, "Pasame el ID de reserva que queres cancelar.");
      return;
    }

    if (node.ID === "reschedule") {
      trSetBotState_(conversationId, "esperando_reagenda_id", {});
      trSendAutomaticMessage_(conversationId, phone, "Pasame el ID de la reserva que queres reagendar.");
      return;
    }

    if (node.ID === "consultas") {
      trSendAutomaticMessage_(conversationId, phone, trConsultasMessage_());
      trClearBotState_(conversationId);
      trMarkConversation_(conversationId, {
        Estado: "Resuelto",
        Etiquetas: "consulta"
      });
      return;
    }

    trSendAutomaticMessage_(conversationId, phone, node.Texto);
    trMarkConversation_(conversationId, {
      Estado: "Resuelto"
    });
  }
}

function trHandleBotState_(conversation, text) {
  var state = conversation["Bot State"];
  var data = trParseJson_(conversation["Bot Data JSON"], {});
  var conversationId = conversation.ID;
  var phone = conversation.Telefono;
  var cleanText = String(text || "").trim();

  if (state === "esperando_reagenda_id") {
    trStartRescheduleFromWhatsapp_(conversationId, phone, cleanText);
    return;
  }

  if (state === "esperando_reagenda_confirmacion") {
    var reply = cleanText.match(/^reagenda_(confirmar|otro|mantener):(.+)$/);
    if (reply && reply[2] !== data.reagendaConfirmacionId) {
      trSendAutomaticMessage_(conversationId, phone, "Ese boton corresponde a un resumen anterior. Revisa el cambio actual.");
      trAskRescheduleConfirmation_(conversationId, phone, data);
      return;
    }
    var choice = reply ? { confirmar: "Confirmar cambio", otro: "Elegir otro turno", mantener: "Mantener turno" }[reply[1]] :
      trResolveMappedChoice_(cleanText, {
        "1": "Confirmar cambio", confirmar: "Confirmar cambio", si: "Confirmar cambio",
        "2": "Elegir otro turno", volver: "Elegir otro turno",
        "3": "Mantener turno", no: "Mantener turno", cancelar_cambio: "Mantener turno"
      });
    if (choice === "Confirmar cambio") {
      trRescheduleReservationFromWhatsapp_(conversationId, phone, data, data.reagendaConfirmacionId);
      return;
    }
    if (choice === "Elegir otro turno") {
      delete data.fecha;
      delete data.hora;
      delete data.slots;
      delete data.reagendaConfirmacionId;
      trSendAvailableDateList_(conversationId, phone, data);
      return;
    }
    if (choice === "Mantener turno") {
      trClearBotState_(conversationId);
      trMarkConversation_(conversationId, { Estado: "Resuelto", "Reserva ID": data.reservaId });
      trSendAutomaticMessage_(conversationId, phone, "No hice cambios en tu reserva. Tu ID sigue siendo " + data.reservaId + ".");
      return;
    }
    trSendAutomaticMessage_(conversationId, phone, "Para cambiar el turno necesito que confirmes el resumen.");
    trAskRescheduleConfirmation_(conversationId, phone, data);
    return;
  }

  if (state === "esperando_tipo_agenda") {
    var reservationType = trResolveMappedChoice_(cleanText, {
      agenda_nueva: "Nueva reserva",
      agenda_repetir: "Repetir ultima reserva",
      repetir_ultima: "Repetir ultima reserva"
    });

    if (reservationType === "Nueva reserva") {
      trStartNewReservation_(conversationId, phone);
      return;
    }

    if (reservationType === "Repetir ultima reserva") {
      trStartRepeatedReservation_(conversationId, phone);
      return;
    }

    trSendAutomaticMessage_(conversationId, phone, "Elegí una de estas opciones para seguir.");
    trAskReservationType_(conversationId, phone);
    return;
  }

  if (state === "esperando_nombre") {
    data.nombre = cleanText;
    trSetBotState_(conversationId, "esperando_mascota", data);
    trSendAutomaticMessage_(conversationId, phone, "Gracias. Como se llama la mascota?");
    return;
  }

  if (state === "esperando_mascota") {
    data.nombreMascota = cleanText;
    trSetBotState_(conversationId, "esperando_tamano", data);
    trSendAutomaticButtons_(conversationId, phone, "Que tamaño tiene?", [
      { id: "tamano_chico", title: "Chico" },
      { id: "tamano_mediano", title: "Mediano" },
      { id: "tamano_grande", title: "Grande" }
    ]);
    return;
  }

  if (state === "esperando_servicio") {
    data.servicio = trResolveServiceChoice_(cleanText);
    if (!data.servicio) {
      trSendAutomaticMessage_(conversationId, phone, "No reconozco ese servicio. Elegi una opcion de la lista.");
      trSendServiceQuestion_(conversationId, phone, data);
      return;
    }
    var servicePriceInfo = trCalculateReservationPrice_(data.servicio, data.tamano, data.pelaje);
    data.precio = servicePriceInfo ? servicePriceInfo.price : "";
    data.precioTexto = servicePriceInfo ? servicePriceInfo.text : "";
    trSetBotState_(conversationId, "esperando_fecha", data);
    trSendAvailableDateList_(conversationId, phone, data);
    return;
  }

  if (state === "esperando_tamano") {
    data.tamano = trResolveMappedChoice_(cleanText, {
      tamano_chico: "Chico",
      tamano_mediano: "Mediano",
      tamano_grande: "Grande"
    }) || cleanText;
    trSetBotState_(conversationId, "esperando_pelaje", data);
    trSendAutomaticButtons_(conversationId, phone, "Que tipo de pelaje tiene?", [
      { id: "pelaje_corto", title: "Corto" },
      { id: "pelaje_largo", title: "Largo" }
    ]);
    return;
  }

  if (state === "esperando_pelaje") {
    data.pelaje = trResolveMappedChoice_(cleanText, {
      pelaje_corto: "Corto",
      pelaje_largo: "Largo"
    }) || cleanText;
    trSetBotState_(conversationId, "esperando_servicio", data);
    trSendServiceQuestion_(conversationId, phone, data);
    return;
  }

  if (state === "esperando_fecha" || state === "esperando_reagenda_fecha") {
    var selectedDate = trResolveDateInput_(cleanText, data.dateOptions || []);
    if (!selectedDate) {
      trSendAutomaticMessage_(conversationId, phone, "No reconozco esa fecha. Elegi una opcion de la lista o escribila como dia/mes, por ejemplo 10/07.");
      trSendAvailableDateList_(conversationId, phone, data);
      return;
    }

    var slots = trAvailableReservationSlots_(data, selectedDate);
    if (!slots.length) {
      trSendAutomaticMessage_(conversationId, phone, "Para esa fecha no hay horarios disponibles. Elegi otra fecha.");
      trSendAvailableDateList_(conversationId, phone, data);
      return;
    }

    data.fecha = selectedDate;
    data.slots = slots;
    trSetBotState_(conversationId, data.reagenda ? "esperando_reagenda_hora" : "esperando_hora", data);
    trSendAvailableHourList_(conversationId, phone, slots);
    return;
  }

  if (state === "esperando_hora" || state === "esperando_reagenda_hora") {
    var selectedHour = trResolveSlot_(cleanText, data.slots || []);
    if (!selectedHour) {
      trSendAutomaticMessage_(conversationId, phone, "No reconozco ese horario. Elegi uno de estos:\n\n" + (data.slots || []).map(function (slot, index) {
        return index + 1 + ". " + slot;
      }).join("\n"));
      return;
    }

    data.hora = selectedHour;
    if (data.reagenda) {
      trAskRescheduleConfirmation_(conversationId, phone, data);
    } else {
      trSaveReservationFromWhatsapp_(conversationId, phone, data);
    }
    return;
  }

  if (state === "esperando_email") {
    data.email = cleanText;
    trSaveReservationFromWhatsapp_(conversationId, phone, data);
    return;
  }

  if (state === "esperando_cancelacion_id") {
    var reservaId = trCleanReservationId_(cleanText);
    var cancelResult = trCancelReservationForWhatsapp_(reservaId);
    if (!cancelResult.ok) {
      trSendAutomaticMessage_(conversationId, phone, cancelResult.message);
      return;
    }

    trClearBotState_(conversationId);
    trMarkConversation_(conversationId, {
      Estado: "Resuelto",
      Etiquetas: "cancelacion",
      "Reserva ID": reservaId
    });
    trSendAutomaticMessage_(conversationId, phone, "Tu turno con ID " + reservaId + " fue cancelado correctamente.");
    return;
  }

  trClearBotState_(conversationId);
  trMarkConversation_(conversationId, { Estado: "Abierto" });
}

function trFindWhatsappReschedulableReservation_(id, phone) {
  var reservation = findReschedulableReservation(trCleanReservationId_(id));
  var sender = trNormalizePhone_(phone);
  if (!sender || sender !== trNormalizePhone_(reservation.row[5])) {
    throw new Error("El ID no corresponde a una reserva de este numero. Revisa el ID e intenta nuevamente.");
  }
  return reservation;
}

function trStartRescheduleFromWhatsapp_(conversationId, phone, id) {
  try {
    var reservation = trFindWhatsappReschedulableReservation_(id, phone);
    var data = {
      reagenda: true,
      reservaId: reservation.id,
      fechaActual: reservation.fecha,
      horaActual: reservation.hora,
      servicio: String(reservation.row[6] || ""),
      deslanado: reservation.row[14] === "SI"
    };
    trSendAutomaticMessage_(conversationId, phone,
      "Encontre tu reserva " + reservation.id + " para el " + trFormatDisplayDate_(reservation.fecha) +
      " a las " + reservation.hora + ". Vamos a elegir un nuevo turno.");
    trSendAvailableDateList_(conversationId, phone, data);
  } catch (error) {
    trSetBotState_(conversationId, "esperando_reagenda_id", {});
    trSendAutomaticMessage_(conversationId, phone, trCleanCancellationMessage_(error.message || String(error)));
  }
}

function trAskRescheduleConfirmation_(conversationId, phone, data) {
  data.reagendaConfirmacionId = Utilities.getUuid();
  trSetBotState_(conversationId, "esperando_reagenda_confirmacion", data);
  trSendAutomaticButtons_(conversationId, phone,
    "Revisa el cambio antes de confirmar:\n\n" +
    "ID de reserva: " + data.reservaId + "\n" +
    "Turno anterior: " + trFormatDisplayDate_(data.fechaActual) + " a las " + data.horaActual + "\n" +
    "Nuevo turno: " + trFormatDisplayDate_(data.fecha) + " a las " + data.hora + "\n\n" +
    "Tu reserva no se modifica hasta que confirmes.", [
      { id: "reagenda_confirmar:" + data.reagendaConfirmacionId, title: "Confirmar cambio" },
      { id: "reagenda_otro:" + data.reagendaConfirmacionId, title: "Elegir otro turno" },
      { id: "reagenda_mantener:" + data.reagendaConfirmacionId, title: "Mantener turno" }
    ]);
}

function trRescheduleReservationFromWhatsapp_(conversationId, phone, data, confirmationId) {
  if (!data.reagendaConfirmacionId || confirmationId !== data.reagendaConfirmacionId) {
    trAskRescheduleConfirmation_(conversationId, phone, data);
    return;
  }
  delete data.reagendaConfirmacionId;
  var lock = LockService.getScriptLock();
  var locked = false;
  var result;
  try {
    lock.waitLock(30000);
    locked = true;
    // Recheck ownership under the same lock used by web bookings and reschedules.
    trFindWhatsappReschedulableReservation_(data.reservaId, phone);
    var response = reagendarReserva({
      id: data.reservaId,
      fecha: data.fecha,
      hora: data.hora,
      fechaActual: data.fechaActual,
      horaActual: data.horaActual
    });
    result = trParseJson_(response.getContent(), {});
  } catch (error) {
    result = { error: trCleanCancellationMessage_(error.message || String(error)) };
  } finally {
    if (locked) lock.releaseLock();
  }

  if (!result.success) {
    if (result.code === "HORARIO_OCUPADO") {
      delete data.hora;
      data.slots = trAvailableReservationSlots_(data, data.fecha);
      trSendAutomaticMessage_(conversationId, phone, result.error + " Tu reserva anterior se mantiene.");
      if (data.slots.length) {
        trSetBotState_(conversationId, "esperando_reagenda_hora", data);
        trSendAvailableHourList_(conversationId, phone, data.slots);
      } else {
        delete data.fecha;
        trSendAvailableDateList_(conversationId, phone, data);
      }
      return;
    }
    trSetBotState_(conversationId, "esperando_reagenda_id", {});
    trSendAutomaticMessage_(conversationId, phone,
      (result.error || "No pude confirmar el cambio.") + " Pasame nuevamente el ID para revisar la reserva actual.");
    return;
  }

  trClearBotState_(conversationId);
  trMarkConversation_(conversationId, {
    Estado: "Resuelto",
    "Reserva ID": result.reservaId,
    Etiquetas: "reagenda"
  });
  trSendAutomaticMessage_(conversationId, phone,
    "Tu turno fue reagendado correctamente.\n\n" +
    "ID de reserva: " + result.reservaId + "\n" +
    "Turno anterior: " + trFormatDisplayDate_(data.fechaActual) + " a las " + data.horaActual + "\n" +
    "Nuevo turno: " + trFormatDisplayDate_(result.fecha) + " a las " + result.hora + "\n\n" +
    "Conservas el mismo ID de reserva.");
}

function trSaveReservationFromWhatsapp_(conversationId, phone, data) {
  data.email = data.email || "";
  data.telefono = trNormalizePhone_(phone);
  data.notasMascota = data.notasMascota || "";
  data.duracion = data.duracion || "";
  var priceInfo = trCalculateReservationPrice_(data.servicio, data.tamano, data.pelaje);
  data.precio = priceInfo ? priceInfo.price : (data.precio || "");
  data.precioTexto = priceInfo ? priceInfo.text : (data.precioTexto || "");
  data.extras = data.extras || "";
  data.deslanado = trReservationNeedsDeslanado_(data);

  var lock = LockService.getScriptLock();
  var locked = false;
  var result;
  var available = [];
  var unavailable = false;
  try {
    lock.waitLock(30000);
    locked = true;
    available = trAvailableReservationSlots_(data, data.fecha);
    if (available.indexOf(data.hora) === -1) {
      unavailable = true;
    } else {
      var daySlots = getTimeSlotsByDate(data.fecha);
      data.horaBloqueada = data.deslanado ? daySlots[daySlots.indexOf(data.hora) + 1] : "";
      result = saveReservation(data);
    }
  } catch (error) {
    result = { success: false, error: "No pude verificar el turno. Volve a intentarlo." };
    trLog_("whatsapp_reservation_error", String(error));
  } finally {
    if (locked) lock.releaseLock();
  }

  if (unavailable) {
    delete data.hora;
    delete data.horaBloqueada;
    data.slots = available;
    trSendAutomaticMessage_(conversationId, phone, "Ese horario ya no esta disponible. Vamos a elegir otro turno.");
    if (available.length) {
      trSetBotState_(conversationId, "esperando_hora", data);
      trSendAvailableHourList_(conversationId, phone, available);
    } else {
      delete data.fecha;
      trSendAvailableDateList_(conversationId, phone, data);
    }
    return;
  }

  if (!result || !result.success) {
    trSendAutomaticMessage_(conversationId, phone, "No pude guardar la reserva. " + (result && result.error ? result.error : "Volvamos a intentarlo."));
    trMarkConversation_(conversationId, {
      Estado: "Abierto"
    });
    return;
  }

  trClearBotState_(conversationId);
  trMarkConversation_(conversationId, {
    Estado: "Resuelto",
    "Reserva ID": result.reservaId,
    Etiquetas: "agenda"
  });
  trSendWhatsappReservationConfirmation(data, result.reservaId, conversationId);
}

function trAskReservationType_(conversationId, phone) {
  trSetBotState_(conversationId, "esperando_tipo_agenda", {});
  trSendAutomaticButtons_(conversationId, phone, "Perfecto. Como queres agendar?", [
    { id: "agenda_nueva", title: "Nueva reserva" },
    { id: "agenda_repetir", title: "Repetir ultima" }
  ]);
}

function trStartNewReservation_(conversationId, phone) {
  trSetBotState_(conversationId, "esperando_nombre", {});
  trSendAutomaticMessage_(conversationId, phone, "Perfecto. Para agendar necesito algunos datos. Cual es tu nombre?");
}

function trStartRepeatedReservation_(conversationId, phone) {
  var lastReservation = trFindLastReservationByPhone_(phone);
  if (!lastReservation) {
    trSendAutomaticMessage_(conversationId, phone, "No encontre una reserva anterior con este numero. Empezamos una nueva.");
    trStartNewReservation_(conversationId, phone);
    return;
  }

  var priceInfo = trCalculateReservationPrice_(lastReservation.servicio, lastReservation.tamano, lastReservation.pelaje);
  lastReservation.precio = priceInfo ? priceInfo.price : (lastReservation.precio || "");
  lastReservation.precioTexto = priceInfo ? priceInfo.text : (lastReservation.precio ? "$" + lastReservation.precio : "");

  trSendAutomaticMessage_(
    conversationId,
    phone,
    "Perfecto, repetimos tu ultima reserva:\n\n" +
      "Mascota: " + (lastReservation.nombreMascota || "-") + "\n" +
      "Servicio: " + (lastReservation.servicio || "-") + "\n" +
      "Tamaño: " + (lastReservation.tamano || "-") + "\n" +
      "Pelaje: " + (lastReservation.pelaje || "-") +
      (lastReservation.precioTexto ? "\nPrecio estimado: " + lastReservation.precioTexto : "")
  );

  trSetBotState_(conversationId, "esperando_fecha", lastReservation);
  trSendAvailableDateList_(conversationId, phone, lastReservation);
}

function trFindLastReservationByPhone_(phone) {
  var targetPhone = trNormalizePhone_(phone);
  var rows = trReadReservationRows_();
  for (var i = rows.length - 1; i >= 0; i--) {
    var row = rows[i];
    var rowPhone = trNormalizePhone_(row[5]);
    var status = trNormalize_(row[17]);
    if (rowPhone !== targetPhone || status === "cancelada") continue;

    var reservation = {
      nombre: row[4] || "",
      telefono: targetPhone,
      servicio: row[6] || "",
      tamano: row[7] || "",
      pelaje: row[8] || "",
      nombreMascota: row[9] || "",
      notasMascota: row[10] || "",
      duracion: row[11] || "",
      precio: row[12] || "",
      extras: row[13] || "",
      deslanado: row[14] === "SI"
    };

    if (reservation.nombre && reservation.servicio && reservation.tamano && reservation.pelaje && reservation.nombreMascota) {
      return reservation;
    }
  }
  return null;
}

function trReadReservationRows_() {
  var sheet = null;
  if (typeof getSheet === "function") {
    sheet = getSheet();
  } else if (typeof SHEET_NAME !== "undefined" && SHEET_NAME) {
    sheet = trGetOrCreateSheet_(SHEET_NAME);
  } else {
    sheet = trGetOrCreateSheet_("Reservas");
  }

  var values = sheet.getDataRange().getValues();
  return values.length > 1 ? values.slice(1) : [];
}

function trReadReservationObjects_() {
  var sheet = null;
  if (typeof getSheet === "function") {
    sheet = getSheet();
  } else if (typeof SHEET_NAME !== "undefined" && SHEET_NAME) {
    sheet = trGetOrCreateSheet_(SHEET_NAME);
  } else {
    sheet = trGetOrCreateSheet_("Reservas");
  }

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(trHeaderKey_);
  return values.slice(1).filter(function (row) {
    return row.some(function (cell) { return cell !== ""; });
  }).map(function (row) {
    var object = {};
    headers.forEach(function (header, index) {
      object[header] = row[index];
    });
    return object;
  });
}

function trReservationValue_(row, keys) {
  for (var i = 0; i < keys.length; i++) {
    var value = row[keys[i]];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
}

function trReservationDataFromRow_(row) {
  var price = trReservationValue_(row, ["Precio"]);
  return {
    nombre: trReservationValue_(row, ["Nombre Cliente", "Cliente", "Nombre"]),
    telefono: trNormalizePhone_(trReservationValue_(row, ["Telefono", "Teléfono", "Celular"])),
    fecha: trFormatStorageDate_(trReservationValue_(row, ["Fecha"])),
    hora: trFormatDisplayTime_(trReservationValue_(row, ["Hora"])),
    servicio: trReservationValue_(row, ["Servicio"]),
    tamano: trReservationValue_(row, ["Tamano", "Tamaño"]),
    pelaje: trReservationValue_(row, ["Pelaje"]),
    nombreMascota: trReservationValue_(row, ["Nombre Mascota", "Mascota"]),
    notasMascota: trReservationValue_(row, ["Notas Mascota"]),
    duracion: trReservationValue_(row, ["Duracion", "Duración"]),
    precio: price,
    precioTexto: price ? "$" + price : "",
    extras: trReservationValue_(row, ["Extras"]),
    deslanado: trNormalize_(trReservationValue_(row, ["Deslanado"])) === "si"
  };
}

function trReservationMessageExists_(reservaId, conversationId) {
  return trSheetToObjects_(TR_SHEETS.messages).some(function (row) {
    return row["Conversation ID"] === conversationId && String(row.Texto || "").indexOf(reservaId) >= 0;
  });
}

function trSendServiceQuestion_(conversationId, phone, data) {
  data = data || {};
  trSendAutomaticList_(conversationId, phone, {
    body: "Que servicio queres agendar?",
    button: "Ver servicios",
    sections: [{
      title: "Servicios TRCorte",
      rows: trServiceOptions_().map(function (service) {
        var priceInfo = trCalculateReservationPrice_(service.title, data.tamano, data.pelaje);
        return {
          id: service.id,
          title: service.title,
          description: priceInfo ? service.description + " - " + priceInfo.text : service.description
        };
      })
    }]
  });
}

function trServiceOptions_() {
  return [
    {
      id: "servicio_bano",
      title: "Baño",
      description: "Baño completo con secado"
    },
    {
      id: "servicio_bano_corte",
      title: "Baño y corte",
      description: "Baño completo + corte de pelo"
    },
    {
      id: "servicio_bano_esquila",
      title: "Baño y esquila",
      description: "Baño completo + esquila"
    },
    {
      id: "servicio_bano_deslanado",
      title: "Baño + deslanado",
      description: "Baño completo + deslanado"
    },
    {
      id: "servicio_bano_deslanado_corte",
      title: "Baño + desl. y corte",
      description: "Baño completo + deslanado + corte"
    }
  ];
}

function trResolveServiceChoice_(text) {
  var normalized = trNormalize_(text).replace(/\s+/g, "_");
  var services = trServiceOptions_();
  for (var i = 0; i < services.length; i++) {
    var service = services[i];
    if (service.id === text || service.id === normalized) return service.title;
    if (trNormalize_(service.title) === trNormalize_(text)) return service.title;
  }
  return "";
}

function trCalculateReservationPrice_(servicio, tamano, pelaje) {
  var serviceKey = trNormalize_(servicio);
  var sizeKey = trNormalize_(tamano);
  var coatKey = trNormalize_(pelaje);
  var prices = trReservationPriceTable_();
  var servicePrices = prices[serviceKey];
  if (!servicePrices) return null;
  var sizePrices = servicePrices[sizeKey];
  if (!sizePrices) return null;
  var price = sizePrices[coatKey];
  if (!price) return null;
  return {
    price: price,
    text: "$" + price
  };
}

function trReservationPriceTable_() {
  return {
    "bano": {
      chico: { corto: 720, largo: 795 },
      mediano: { corto: 910, largo: 960 },
      grande: { corto: 1280, largo: 1320 }
    },
    "bano y corte": {
      chico: { corto: 875, largo: 975 },
      mediano: { corto: 1050, largo: 1210 },
      grande: { corto: 1515, largo: 1665 }
    },
    "bano y esquila": {
      chico: { corto: 770, largo: 860 },
      mediano: { corto: 925, largo: 1065 },
      grande: { corto: 1335, largo: 1465 }
    },
    "bano + deslanado": {
      chico: { corto: 1920, largo: 1995 },
      mediano: { corto: 2110, largo: 2160 },
      grande: { corto: 2480, largo: 2520 }
    },
    "bano + desl. y corte": {
      chico: { corto: 2075, largo: 2175 },
      mediano: { corto: 2250, largo: 2410 },
      grande: { corto: 2715, largo: 2865 }
    }
  };
}

function trReservationNeedsDeslanado_(data) {
  return data.deslanado === true || trNormalize_(data.servicio).indexOf("desl") !== -1;
}

function trAvailableReservationSlots_(data, fecha) {
  var available = getAvailableSlots(fecha, data.reagenda ? data.reservaId : undefined);
  if (data.reagenda ? data.deslanado === true : trReservationNeedsDeslanado_(data)) {
    var daySlots = getTimeSlotsByDate(fecha);
    available = available.filter(function (slot) {
      var next = daySlots[daySlots.indexOf(slot) + 1];
      return !!next && available.indexOf(next) !== -1;
    });
  }
  return available.filter(function (slot) {
    return !data.reagenda || fecha !== data.fechaActual || slot !== data.horaActual;
  });
}

function trSendAvailableDateList_(conversationId, phone, data) {
  var options = trBuildAvailableDateOptions_(21, 8, data);
  data.dateOptions = options;
  trSetBotState_(conversationId, data.reagenda ? "esperando_reagenda_fecha" : "esperando_fecha", data);
  if (!options.length) {
    trSendAutomaticMessage_(conversationId, phone, "No encontre fechas disponibles en las proximas semanas. Escribinos de nuevo mas tarde y volvemos a revisar.");
    trMarkConversation_(conversationId, { Estado: "Abierto" });
    return;
  }
  trSendAutomaticList_(conversationId, phone, {
    body: "Que fecha preferis?",
    button: "Ver fechas",
    sections: [{
      title: "Fechas disponibles",
      rows: options.map(function (option) {
        return {
          id: option.value,
          title: option.title,
          description: option.description
        };
      })
    }]
  });
}

function trSendAvailableHourList_(conversationId, phone, slots) {
  trSendAutomaticList_(conversationId, phone, {
    body: "Tenemos estos horarios disponibles:",
    button: "Ver horarios",
    sections: [{
      title: "Horarios",
      rows: slots.map(function (slot) {
        return { id: slot, title: slot, description: "" };
      })
    }]
  });
}

function trBuildAvailableDateOptions_(daysToCheck, maxResults, data) {
  var options = [];
  var timezone = Session.getScriptTimeZone();
  var date = new Date();
  for (var i = 0; i < daysToCheck && options.length < maxResults; i++) {
    var candidate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + i);
    var value = Utilities.formatDate(candidate, timezone, "yyyy-MM-dd");
    var slots = trAvailableReservationSlots_(data || {}, value);
    if (slots && slots.length) {
      options.push({
        value: value,
        title: Utilities.formatDate(candidate, timezone, "dd/MM"),
        description: trWeekdayLabel_(candidate) + " - " + slots.length + " horarios"
      });
    }
  }
  return options;
}

function trResolveMappedChoice_(text, choices) {
  var normalized = trNormalize_(text).replace(/\s+/g, "_");
  if (choices[normalized]) return choices[normalized];
  var keys = Object.keys(choices);
  for (var i = 0; i < keys.length; i++) {
    if (trNormalize_(choices[keys[i]]) === trNormalize_(text)) return choices[keys[i]];
  }
  return "";
}

function trResolveDateInput_(text, options) {
  var clean = String(text || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  var optionMatch = (options || []).find(function (option) {
    return option.value === clean || trNormalize_(option.title) === trNormalize_(clean);
  });
  if (optionMatch) return optionMatch.value;
  var ddmm = clean.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (ddmm) {
    var day = ("0" + ddmm[1]).slice(-2);
    var month = ("0" + ddmm[2]).slice(-2);
    return "2026-" + month + "-" + day;
  }
  var isoDateTime = clean.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (isoDateTime) return isoDateTime[1];
  return "";
}

function trWeekdayLabel_(date) {
  return ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"][date.getDay()];
}

function trFormatDisplayDate_(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "dd/MM/yyyy");
  }
  var text = String(value);
  var match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return match[3] + "/" + match[2] + "/" + match[1];
  return text;
}

function trFormatStorageDate_(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  var text = String(value).trim();
  var match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return match[1] + "-" + match[2] + "-" + match[3];
  var ddmm = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmm) return ddmm[3] + "-" + ("0" + ddmm[2]).slice(-2) + "-" + ("0" + ddmm[1]).slice(-2);
  return text;
}

function trFormatDisplayTime_(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "HH:mm");
  }
  var text = String(value).trim();
  var dateText = text.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\b/);
  if (dateText) return ("0" + dateText[1]).slice(-2) + ":" + dateText[2];
  var simple = text.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (simple) return ("0" + simple[1]).slice(-2) + ":" + (simple[2] || "00");
  return text;
}

function trSetBotState_(conversationId, state, data) {
  trMarkConversation_(conversationId, {
    "Bot State": state,
    "Bot Data JSON": JSON.stringify(data || {}),
    "Updated At": new Date()
  });
}

function trClearBotState_(conversationId) {
  trMarkConversation_(conversationId, {
    "Bot State": "",
    "Bot Data JSON": "",
    "Flow ID": "",
    "Flow Node ID": "",
    "Updated At": new Date()
  });
}

function trResolveSlot_(text, slots) {
  var normalized = String(text || "").trim();
  if (/^\d+$/.test(normalized)) {
    var index = Number(normalized) - 1;
    return slots[index] || "";
  }
  var comparable = formatTimeForComparison(normalized);
  return slots.indexOf(comparable) >= 0 ? comparable : "";
}

function trCleanReservationId_(value) {
  return String(value || "")
    .trim()
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

function trCleanCancellationMessage_(message) {
  var text = String(message || "");
  text = text.replace(/No encontramos una cita con ese ID\.?\s*Revisa el email de confirmacion\.?/i, "No encontramos una reserva con ese ID. Revisa el ID y volve a intentarlo.");
  text = text.replace(/No encontramos una cita con ese ID\.?\s*Revisa el email de confirmaci.n\.?/i, "No encontramos una reserva con ese ID. Revisa el ID y volve a intentarlo.");
  text = text.replace(/Revisa el email de confirmacion\.?/i, "Revisa el ID de reserva.");
  text = text.replace(/Revisa el email de confirmaci.n\.?/i, "Revisa el ID de reserva.");
  return text;
}

function trCancelReservationForWhatsapp_(id) {
  try {
    var response = cancelarReserva(id);
    var content = response && response.getContent ? response.getContent() : "";
    var parsed = trParseJson_(content, {});
    if (parsed.error) return { ok: false, message: trCleanCancellationMessage_(parsed.error) };
    return { ok: true, message: parsed.mensaje || "Cancelada" };
  } catch (err) {
    return { ok: false, message: trCleanCancellationMessage_("No pude cancelar esa reserva. " + String(err)) };
  }
}

function trSendWhatsappReservationConfirmation(data, reservaId, conversationId) {
  var phone = trNormalizePhone_(data.telefono);
  var priceText = data.precioTexto || (data.precio ? "$" + data.precio : "");
  var text = trReservationConfirmationText_(data, reservaId, priceText);

  if (conversationId) {
    return trSendAutomaticMessage_(conversationId, phone, text);
  }

  var webConversation = trEnsureWebReservationConversation_(data, reservaId, text);
  var templateName = trReservationTemplateName_();
  var shouldUseTemplate = !!templateName;
  var result = templateName
    ? trSendWhatsappReservationTemplate_(phone, data, reservaId, priceText)
    : trSendWhatsappText_(phone, text);
  if (!result.ok) {
    var templateResult = trSendWhatsappReservationTemplate_(phone, data, reservaId, priceText);
    if (templateResult.ok) {
      result = templateResult;
    } else if (templateResult.error) {
      result.error = result.error + " | Template: " + templateResult.error;
    }
  }
  if (!result.ok) {
    trLog_("whatsapp_confirmation_failed", "phone=" + phone + " reserva=" + reservaId + " error=" + (result.error || ""));
  }
  trAppendMessage_({
    conversationId: webConversation.ID,
    whatsappMessageId: result.messageId || "",
    direction: "outbound",
    text: shouldUseTemplate || result.sentAsTemplate ? "[Plantilla WhatsApp]\n" + text : text,
    timestamp: new Date(),
    status: result.ok ? "sent" : "failed",
    automatic: true,
    user: "",
    error: result.error || ""
  });
  trMarkConversation_(webConversation.ID, {
    "Ultimo Mensaje": text,
    "Ultimo Mensaje At": new Date(),
    "Updated At": new Date()
  });
  return result;
}

function trReservationConfirmationText_(data, reservaId, priceText) {
  return "¡Hola, *" + (data.nombre || "cliente") + "*! 🐾\n\n" +
    "Tu reserva en *TRCorte* para *" + (data.servicio || "tu servicio") + "* fue confirmada con éxito.\n\n" +
    "🐶 ID de reserva: *" + reservaId + "*\n" +
    (priceText ? "💰 Precio estimado: *" + priceText + "*\n" : "") +
    "Te esperamos junto a *" + (data.nombreMascota || "tu mascota") + "* el *" +
    trFormatDisplayDate_(data.fecha) + "* a las *" + trFormatDisplayTime_(data.hora) + "*.\n\n" +
    "¡Gracias por elegirnos!✨";
}

function sendWhatsappReservationConfirmation(data, reservaId) {
  return trSendWhatsappReservationConfirmation(data, reservaId);
}

function trSyncReservationConversations_(params) {
  params = params || {};
  var targetPhone = trNormalizePhone_(params.phone || params.telefono || "");
  var targetReservationId = String(params.reservaId || params.reservationId || params.id || "").trim();
  var shouldSendWhatsapp = String(params.sendWhatsapp || "").toLowerCase() === "1" ||
    String(params.sendWhatsapp || "").toLowerCase() === "true";

  if (!targetPhone && !targetReservationId) {
    return { ok: false, error: "Indica phone o reservaId para sincronizar una reserva puntual." };
  }

  var rows = trReadReservationObjects_();
  var matches = rows.filter(function (row) {
    var reservaId = trReservationValue_(row, ["-", "ID", "Reserva ID"]);
    var phone = trNormalizePhone_(trReservationValue_(row, ["Telefono", "Teléfono", "Celular"]));
    if (targetReservationId && reservaId !== targetReservationId) return false;
    if (targetPhone && phone !== targetPhone) return false;
    return !!phone && !!reservaId;
  });

  var results = matches.map(function (row) {
    var reservaId = trReservationValue_(row, ["-", "ID", "Reserva ID"]);
    var data = trReservationDataFromRow_(row);
    var priceText = data.precioTexto || (data.precio ? "$" + data.precio : "");
    var text = trReservationConfirmationText_(data, reservaId, priceText);
    var conversation = trEnsureWebReservationConversation_(data, reservaId, text);
    var alreadyLogged = trReservationMessageExists_(reservaId, conversation.ID);
    var sendResult = { ok: true, skipped: true };

    if (shouldSendWhatsapp && !alreadyLogged) {
      sendResult = trSendWhatsappReservationTemplate_(data.telefono, data, reservaId, priceText);
      trAppendMessage_({
        conversationId: conversation.ID,
        whatsappMessageId: sendResult.messageId || "",
        direction: "outbound",
        text: "[Plantilla WhatsApp]\n" + text,
        timestamp: new Date(),
        status: sendResult.ok ? "sent" : "failed",
        automatic: true,
        user: "",
        error: sendResult.error || ""
      });
    }

    return {
      reservaId: reservaId,
      phone: data.telefono,
      conversationId: conversation.ID,
      alreadyLogged: alreadyLogged,
      whatsapp: sendResult
    };
  });

  return { ok: true, count: results.length, results: results };
}

function trSendWhatsappReservationTemplate_(phone, data, reservaId, priceText) {
  var templateName = trReservationTemplateName_();
  if (!templateName) {
    return { ok: false, error: "Falta WHATSAPP_RESERVATION_TEMPLATE_NAME para enviar a numeros que no escribieron antes." };
  }

  if (templateName === "hello_world") {
    return trSendWhatsappTemplate_(phone, templateName, trReservationTemplateLanguage_("en_US"), []);
  }

  var languageCode = trReservationTemplateLanguage_("es_UY");
  if (templateName === "reserva_confirmada_trcorte" && languageCode === "en_US") {
    languageCode = "es_UY";
  }

  return trSendWhatsappTemplate_(phone, templateName, languageCode, [
    { name: "nombre_cliente", text: data.nombre || "cliente" },
    { name: "servicio", text: data.servicio || "tu servicio" },
    { name: "id_reserva", text: reservaId },
    { name: "precio", text: priceText || "$0" },
    { name: "nombre_mascota", text: data.nombreMascota || "tu mascota" },
    { name: "fecha", text: trFormatDisplayDate_(data.fecha) },
    { name: "hora", text: trFormatDisplayTime_(data.hora) }
  ]);
}

function trReservationTemplateName_() {
  return trProp_("WHATSAPP_RESERVATION_TEMPLATE_NAME").trim() ||
    trProp_("WHATSAPP_RESERVATION_TEMPLATE_NAM").trim() ||
    "reserva_confirmada_trcorte";
}

function trReservationTemplateLanguage_(fallback) {
  return trProp_("WHATSAPP_RESERVATION_TEMPLATE_LANGUAGE").trim() ||
    trProp_("WHATSAPP_RESERVATION_TEMPLATE_LANG").trim() ||
    trProp_("WHATSAPP_RESERVATION_TEMPLATE_LAN").trim() ||
    fallback ||
    "es_UY";
}

function trEnsureWebReservationConversation_(data, reservaId, text) {
  var phone = trNormalizePhone_(data.telefono);
  var sheet = trGetOrCreateSheet_(TR_SHEETS.conversations);
  var rows = trSheetToObjects_(TR_SHEETS.conversations);
  var existing = rows.find(function (row) {
    return trNormalizePhone_(row.Telefono) === phone;
  });
  var now = new Date();
  var displayName = existing && existing["Nombre Cliente"]
    ? existing["Nombre Cliente"]
    : (data.nombre || phone);
  var patch = {
    Telefono: phone,
    "Nombre Cliente": displayName,
    Estado: "Resuelto",
    Etiquetas: "agenda, web",
    "Reserva ID": reservaId,
    "Ultimo Mensaje": text,
    "Ultimo Mensaje At": now,
    "Flow ID": "",
    "Flow Node ID": "",
    "Bot State": "",
    "Bot Data JSON": "",
    "Updated At": now
  };

  if (existing) {
    trUpdateRowById_(sheet, existing.ID, patch);
    return Object.assign({}, existing, patch);
  }

  var row = Object.assign({ ID: "conv_" + phone }, patch);
  trAppendObject_(TR_SHEETS.conversations, row);
  return row;
}

function trConsultasMessage_() {
  return "Por consultas sobre tu servicio, comunicate con Sucursal Pinar 🐾\n\n" +
    "📍 Av. Pérez Butler esq. Eduardo Fabini\n" +
    "📲 +598 96 235 307\n" +
    "🕘 Lun. a vie. de 9:00 a 19:00\n" +
    "🕘 Sáb. y dom. de 9:00 a 15:00";
}

function trSendAutomaticMessage_(conversationId, phone, text) {
  var result = trSendWhatsappText_(phone, text);
  trAppendMessage_({
    conversationId: conversationId,
    whatsappMessageId: result.messageId || "",
    direction: "outbound",
    text: text,
    timestamp: new Date(),
    status: result.ok ? "sent" : "failed",
    automatic: true,
    user: "",
    error: result.error || ""
  });
  trMarkConversation_(conversationId, {
    "Ultimo Mensaje": text,
    "Ultimo Mensaje At": new Date(),
    "Updated At": new Date()
  });
  return result;
}

function trSendAutomaticButtons_(conversationId, phone, text, buttons) {
  var result = trSendWhatsappButtons_(phone, text, buttons);
  trAppendMessage_({
    conversationId: conversationId,
    whatsappMessageId: result.messageId || "",
    direction: "outbound",
    text: text + "\n\n" + buttons.map(function (button) { return button.title; }).join(" / "),
    timestamp: new Date(),
    status: result.ok ? "sent" : "failed",
    automatic: true,
    user: "",
    error: result.error || ""
  });
  trMarkConversation_(conversationId, {
    "Ultimo Mensaje": text,
    "Ultimo Mensaje At": new Date(),
    "Updated At": new Date()
  });
  return result;
}

function trSendAutomaticList_(conversationId, phone, list) {
  var result = trSendWhatsappList_(phone, list);
  var text = list.body + "\n\n" + (list.sections || []).map(function (section) {
    return (section.rows || []).map(function (row) { return row.title; }).join(" / ");
  }).join(" / ");
  trAppendMessage_({
    conversationId: conversationId,
    whatsappMessageId: result.messageId || "",
    direction: "outbound",
    text: text,
    timestamp: new Date(),
    status: result.ok ? "sent" : "failed",
    automatic: true,
    user: "",
    error: result.error || ""
  });
  trMarkConversation_(conversationId, {
    "Ultimo Mensaje": list.body,
    "Ultimo Mensaje At": new Date(),
    "Updated At": new Date()
  });
  return result;
}

function trSendAutomaticImage_(conversationId, phone, imageUrl, caption) {
  var result = trSendWhatsappImage_(phone, imageUrl, caption);
  trAppendMessage_({
    conversationId: conversationId,
    whatsappMessageId: result.messageId || "",
    direction: "outbound",
    text: caption || imageUrl,
    timestamp: new Date(),
    status: result.ok ? "sent" : "failed",
    automatic: true,
    user: "",
    error: result.error || ""
  });
  return result;
}

function trSendWhatsappText_(to, text) {
  return trSendWhatsappPayload_({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: trNormalizePhone_(to),
    type: "text",
    text: {
      preview_url: false,
      body: text
    }
  });
}

function trSendWhatsappImage_(to, imageUrl, caption) {
  return trSendWhatsappPayload_({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: trNormalizePhone_(to),
    type: "image",
    image: {
      link: imageUrl,
      caption: caption || ""
    }
  });
}

function trSendWhatsappButtons_(to, text, buttons) {
  return trSendWhatsappPayload_({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: trNormalizePhone_(to),
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: text },
      action: {
        buttons: buttons.slice(0, 3).map(function (button) {
          return {
            type: "reply",
            reply: {
              id: String(button.id || button.title).slice(0, 256),
              title: String(button.title).slice(0, 20)
            }
          };
        })
      }
    }
  });
}

function trSendWhatsappList_(to, list) {
  return trSendWhatsappPayload_({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: trNormalizePhone_(to),
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: list.body },
      action: {
        button: String(list.button || "Ver opciones").slice(0, 20),
        sections: (list.sections || []).map(function (section) {
          return {
            title: String(section.title || "Opciones").slice(0, 24),
            rows: (section.rows || []).slice(0, 10).map(function (row) {
              return {
                id: String(row.id || row.title).slice(0, 200),
                title: String(row.title || row.id).slice(0, 24),
                description: String(row.description || "").slice(0, 72)
              };
            })
          };
        })
      }
    }
  });
}

function trSendWhatsappTemplate_(to, templateName, languageCode, bodyParams) {
  var template = {
    name: templateName,
    language: {
      code: languageCode || "es_UY"
    }
  };

  if ((bodyParams || []).length) {
    template.components = [{
      type: "body",
      parameters: bodyParams.map(function (value) {
        var parameter = {
          type: "text",
          text: String(value && value.text !== undefined ? value.text : value || "")
        };
        if (value && value.name) parameter.parameter_name = value.name;
        return parameter;
      })
    }];
  }

  var result = trSendWhatsappPayload_({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: trNormalizePhone_(to),
    type: "template",
    template: template
  });
  result.sentAsTemplate = true;
  return result;
}

function trSendWhatsappPayload_(payload) {
  var token = trProp_("WHATSAPP_ACCESS_TOKEN");
  var phoneNumberId = trProp_("WHATSAPP_PHONE_NUMBER_ID");
  var version = trProp_("WHATSAPP_GRAPH_VERSION") || "v20.0";
  var url = "https://graph.facebook.com/" + version + "/" + phoneNumberId + "/messages";

  try {
    var response = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + token },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    var code = response.getResponseCode();
    var data = trParseJson_(response.getContentText(), {});
    if (code >= 200 && code < 300) {
      return { ok: true, messageId: data.messages && data.messages[0] && data.messages[0].id };
    }
    if (data.error) {
      var errorText = data.error.message || response.getContentText();
      if (data.error.code) errorText += " (code " + data.error.code + ")";
      if (data.error.error_subcode) errorText += " (subcode " + data.error.error_subcode + ")";
      if (data.error.error_data && data.error.error_data.details) {
        errorText += " - " + data.error.error_data.details;
      }
      if (data.error.fbtrace_id) errorText += " fbtrace_id=" + data.error.fbtrace_id;
      if (payload.type === "template") {
        errorText += " payload=" + JSON.stringify(payload.template).slice(0, 900);
      }
      errorText += " raw=" + response.getContentText().slice(0, 900);
      return { ok: false, error: errorText };
    }
    return { ok: false, error: response.getContentText() };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

function trCreateDefaultWelcomeFlow_() {
  var flows = trSheetToObjects_(TR_SHEETS.flows);
  var welcomeText = "¡Hola! Bienvenido a *TRCorte* 🐾\n\n" +
    "¿Cómo podemos ayudarte hoy?\n\n" +
    "Elegí una opción:\n" +
    "1. Agendar turno\n" +
    "2. Cancelar turno\n" +
    "3. Reagendar turno";
  if (flows.some(function (flow) { return flow.ID === "welcome_default"; })) {
    trDeleteWhere_(TR_SHEETS.nodes, "Flow ID", "welcome_default");
    trDeleteWhere_(TR_SHEETS.edges, "Flow ID", "welcome_default");
    trUpdateRowById_(trGetOrCreateSheet_(TR_SHEETS.flows), "welcome_default", {
      Nombre: "Bienvenida principal",
      Activo: "TRUE",
      Disparadores: "hola, buenas, turno, agendar, agenda, consulta",
      "Start Node ID": "start",
      "Updated At": new Date()
    });
  } else {
    trAppendObject_(TR_SHEETS.flows, {
      ID: "welcome_default",
      Nombre: "Bienvenida principal",
      Activo: "TRUE",
      Disparadores: "hola, buenas, turno, agendar, agenda, consulta",
      "Start Node ID": "start",
      "Updated At": new Date()
    });
  }

  [
    ["start", "welcome_default", "start", "Inicio", "", "[]", 225, 20],
    ["menu", "welcome_default", "question", "Pregunta principal", welcomeText, JSON.stringify(["Agendar", "Cancelar turno", "Reagendar turno"]), 210, 138],
    ["schedule", "welcome_default", "action", "Agendar turno", "Perfecto. Te vamos a pedir los datos para buscar un horario disponible.", "[]", 35, 395],
    ["cancel", "welcome_default", "action", "Cancelar turno", "Pasame el ID de reserva y lo revisamos.", "[]", 225, 395],
    ["reschedule", "welcome_default", "action", "Reagendar turno", "Pasame el ID de la reserva que queres reagendar.", "[]", 415, 395]
  ].forEach(function (row) {
    trAppendObject_(TR_SHEETS.nodes, {
      ID: row[0],
      "Flow ID": row[1],
      Tipo: row[2],
      Titulo: row[3],
      Texto: row[4],
      "Opciones JSON": row[5],
      "Pos X": row[6],
      "Pos Y": row[7]
    });
  });

  [
    ["edge_start_menu", "welcome_default", "start", "menu", ""],
    ["edge_menu_schedule", "welcome_default", "menu", "schedule", "agenda,agendar,agendar turno"],
    ["edge_menu_cancel", "welcome_default", "menu", "cancel", "cancelar,cancelar turno"],
    ["edge_menu_reschedule", "welcome_default", "menu", "reschedule", "reagendar,reagendar turno,reagendar cita,cambiar turno"]
  ].forEach(function (row) {
    trAppendObject_(TR_SHEETS.edges, {
      ID: row[0],
      "Flow ID": row[1],
      "From Node ID": row[2],
      "To Node ID": row[3],
      Condicion: row[4]
    });
  });
}

function trFindMatchingFlow_(text) {
  var normalized = trNormalize_(text);
  return trSheetToObjects_(TR_SHEETS.flows).find(function (flow) {
    if (String(flow.Activo).toUpperCase() !== "TRUE") return false;
    return String(flow.Disparadores || "")
      .split(",")
      .map(trNormalize_)
      .filter(Boolean)
      .some(function (trigger) { return normalized.indexOf(trigger) !== -1; });
  });
}

function trFindDefaultWelcomeFlow_() {
  return trSheetToObjects_(TR_SHEETS.flows).find(function (flow) {
    return flow.ID === "welcome_default" && String(flow.Activo).toUpperCase() === "TRUE";
  });
}

function trFindNode_(flowId, nodeId) {
  return trSheetToObjects_(TR_SHEETS.nodes).find(function (node) {
    return node["Flow ID"] === flowId && node.ID === nodeId;
  });
}

function trFirstEdgeFrom_(flowId, nodeId) {
  return trEdgesFrom_(flowId, nodeId)[0] || null;
}

function trEdgesFrom_(flowId, nodeId) {
  return trSheetToObjects_(TR_SHEETS.edges).filter(function (edge) {
    return edge["Flow ID"] === flowId && edge["From Node ID"] === nodeId;
  });
}

function trFindEdgeForAnswer_(flowId, nodeId, text) {
  var normalized = trNormalize_(text);
  var edges = trEdgesFrom_(flowId, nodeId);
  if (!normalized) return null;
  var match = edges.find(function (edge) {
    return normalized === trNormalize_(edge["To Node ID"]) ||
      String(edge.Condicion || "").split(",").map(trNormalize_).filter(Boolean).indexOf(normalized) !== -1;
  });
  if (match) return match;
  var node = trFindNode_(flowId, nodeId);
  var options = node ? trParseJson_(node["Opciones JSON"], []) : [];
  var index = /^\d+$/.test(normalized) ? Number(normalized) - 1 : options.map(trNormalize_).indexOf(normalized);
  return index >= 0 && index < options.length ? edges[index] || null : null;
}

function trUpsertConversation_(phone, contact, text, timestamp) {
  var sheet = trGetOrCreateSheet_(TR_SHEETS.conversations);
  var rows = trSheetToObjects_(TR_SHEETS.conversations);
  var normalizedPhone = trNormalizePhone_(phone);
  var existing = rows.find(function (row) {
    return trNormalizePhone_(row.Telefono) === normalizedPhone;
  });
  var now = new Date();
  var incomingName = contact && contact.profile && contact.profile.name ? contact.profile.name : phone;
  var displayName = existing && existing["Nombre Cliente"]
    ? existing["Nombre Cliente"]
    : incomingName;
  var patch = {
    Telefono: normalizedPhone,
    "Nombre Cliente": displayName,
    Estado: existing ? existing.Estado : "Abierto",
    Etiquetas: existing ? existing.Etiquetas : "",
    "Ultimo Mensaje": text,
    "Ultimo Mensaje At": timestamp,
    "Updated At": now
  };

  if (existing) {
    trUpdateRowById_(sheet, existing.ID, patch);
    return Object.assign({}, existing, patch);
  }

  var id = "conv_" + normalizedPhone;
  var row = Object.assign({
    ID: id,
    "Reserva ID": "",
    "Flow ID": "",
    "Flow Node ID": "",
    "Bot State": "",
    "Bot Data JSON": ""
  }, patch);
  trAppendObject_(TR_SHEETS.conversations, row);
  return row;
}

function trAppendMessage_(message) {
  trAppendObject_(TR_SHEETS.messages, {
    ID: "msg_" + Utilities.getUuid(),
    "Conversation ID": message.conversationId,
    "WhatsApp Message ID": message.whatsappMessageId,
    Direccion: message.direction,
    Texto: message.text,
    Timestamp: message.timestamp,
    Estado: message.status,
    Automatico: message.automatic ? "TRUE" : "FALSE",
    Usuario: message.user || "",
    Error: message.error || ""
  });
}

function trUpdateMessageStatus_(whatsappMessageId, status, errors) {
  var sheet = trGetOrCreateSheet_(TR_SHEETS.messages);
  var rows = trSheetToObjects_(TR_SHEETS.messages);
  var match = rows.find(function (row) {
    return row["WhatsApp Message ID"] === whatsappMessageId;
  });
  if (!match) return;
  var errorText = (errors || []).map(function (item) {
    return item.message || item.title || "";
  }).filter(Boolean).join("; ");
  trUpdateRowById_(sheet, match.ID, {
    Estado: status,
    Error: errorText
  });
}

function trListConversations_() {
  var conversations = trSheetToObjects_(TR_SHEETS.conversations).map(trConversationDto_);
  var byId = {};
  conversations.forEach(function (conversation) {
    byId[conversation.id] = true;
  });

  trMessagesGroupedAsConversations_().forEach(function (conversation) {
    if (!byId[conversation.id]) {
      conversations.push(conversation);
      byId[conversation.id] = true;
    }
  });

  return conversations.sort(function (a, b) {
    return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
  });
}

function trConversationDto_(row) {
  return {
    id: row.ID,
    customerName: row["Nombre Cliente"],
    phone: row.Telefono,
    status: row.Estado || "Abierto",
    tags: String(row.Etiquetas || "").split(",").map(function (tag) { return tag.trim(); }).filter(Boolean),
    reservation: row["Reserva ID"] ? { id: row["Reserva ID"] } : null,
    lastMessage: row["Ultimo Mensaje"],
    lastMessageAt: row["Ultimo Mensaje At"],
    flowId: row["Flow ID"],
    flowNodeId: row["Flow Node ID"]
  };
}

function trMessagesGroupedAsConversations_() {
  var grouped = {};
  trSheetToObjects_(TR_SHEETS.messages).forEach(function (row) {
    var conversationId = row["Conversation ID"];
    if (!conversationId) return;
    var current = grouped[conversationId];
    var timestamp = row.Timestamp || "";
    if (!current || trTimestampValue_(timestamp) >= trTimestampValue_(current.lastMessageAt)) {
      var phone = String(conversationId).replace(/^conv_/, "");
      grouped[conversationId] = {
        id: conversationId,
        customerName: phone,
        phone: phone,
        status: "Abierto",
        tags: [],
        reservation: null,
        lastMessage: row.Texto,
        lastMessageAt: timestamp,
        flowId: "",
        flowNodeId: ""
      };
    }
  });
  return Object.keys(grouped).map(function (id) { return grouped[id]; });
}

function trTimestampValue_(value) {
  if (!value) return 0;
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) return value.getTime();
  var parsed = new Date(value);
  if (!isNaN(parsed.getTime())) return parsed.getTime();
  var text = String(value);
  var match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), Number(match[4]), Number(match[5])).getTime();
  return 0;
}

function trListMessages_(conversationId) {
  return trSheetToObjects_(TR_SHEETS.messages).filter(function (row) {
    return row["Conversation ID"] === conversationId;
  }).map(function (row) {
    return {
      id: row.ID,
      whatsappMessageId: row["WhatsApp Message ID"],
      direction: row.Direccion,
      text: row.Texto,
      createdAt: row.Timestamp,
      status: row.Estado,
      automatic: String(row.Automatico).toUpperCase() === "TRUE",
      user: row.Usuario,
      error: row.Error
    };
  });
}

function trListLogs_(limit) {
  var rows = trSheetToObjects_(TR_SHEETS.logs);
  var count = Math.max(1, Math.min(Number(limit || 30), 100));
  return rows.slice(-count).map(function (row) {
    return {
      timestamp: row.Timestamp,
      type: row.Tipo,
      detail: row.Detalle
    };
  });
}

function trFindConversationById_(id) {
  return trSheetToObjects_(TR_SHEETS.conversations).find(function (row) { return row.ID === id; });
}

function trMarkConversation_(conversationId, patch) {
  trUpdateRowById_(trGetOrCreateSheet_(TR_SHEETS.conversations), conversationId, patch);
}

function trUpdateInboxConversation_(conversationId, patch) {
  if (!conversationId) throw new Error("Conversation ID requerido");
  var update = { "Updated At": new Date() };
  if (patch.status) update.Estado = String(patch.status);
  if (Array.isArray(patch.tags)) {
    update.Etiquetas = patch.tags.map(function (tag) {
      return String(tag).trim();
    }).filter(Boolean).join(", ");
  }
  trMarkConversation_(conversationId, update);
  var conversation = trListConversations_().find(function (item) {
    return item.id === conversationId;
  });
  if (!conversation) throw new Error("Conversacion no encontrada");
  conversation.messages = trListMessages_(conversationId);
  return conversation;
}

function trFindContact_(contacts, phone) {
  return contacts.find(function (contact) { return contact.wa_id === phone; }) || null;
}

function trSaveFlow_(flow) {
  if (!flow.id || !flow.nodes || !flow.edges) throw new Error("Flow invalido");
  trDeleteWhere_(TR_SHEETS.nodes, "Flow ID", flow.id);
  trDeleteWhere_(TR_SHEETS.edges, "Flow ID", flow.id);
  trUpdateOrAppend_(TR_SHEETS.flows, flow.id, {
    ID: flow.id,
    Nombre: flow.name || "Flujo sin nombre",
    Activo: flow.active ? "TRUE" : "FALSE",
    Disparadores: (flow.triggers || []).join(", "),
    "Start Node ID": flow.startNodeId || "start",
    "Updated At": new Date()
  });
  flow.nodes.forEach(function (node) {
    trAppendObject_(TR_SHEETS.nodes, {
      ID: node.id,
      "Flow ID": flow.id,
      Tipo: node.kind,
      Titulo: node.title,
      Texto: node.text,
      "Opciones JSON": JSON.stringify(node.options || []),
      "Pos X": node.x,
      "Pos Y": node.y
    });
  });
  flow.edges.forEach(function (edge, index) {
    trAppendObject_(TR_SHEETS.edges, {
      ID: edge.id || "edge_" + index + "_" + Utilities.getUuid(),
      "Flow ID": flow.id,
      "From Node ID": edge.from,
      "To Node ID": edge.to,
      Condicion: edge.condition || ""
    });
  });
}

function trGetOrCreateSheet_(sheetName) {
  var spreadsheet = typeof SPREADSHEET_ID !== "undefined" && SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error("No se pudo abrir el spreadsheet para TR Inbox");
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(sheetName);
  return sheet;
}

function trSheetToObjects_(sheetName) {
  var sheet = trGetOrCreateSheet_(sheetName);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(trHeaderKey_);
  return values.slice(1).filter(function (row) {
    return row.some(function (cell) { return cell !== ""; });
  }).map(function (row) {
    var object = {};
    headers.forEach(function (header, index) {
      object[header] = row[index];
    });
    return object;
  });
}

function trAppendObject_(sheetName, object) {
  var sheet = trGetOrCreateSheet_(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(trHeaderKey_);
  sheet.appendRow(headers.map(function (header) { return object[header] === undefined ? "" : object[header]; }));
}

function trUpdateOrAppend_(sheetName, id, object) {
  var sheet = trGetOrCreateSheet_(sheetName);
  if (!trUpdateRowById_(sheet, id, object)) trAppendObject_(sheetName, object);
}

function trUpdateRowById_(sheet, id, patch) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return false;
  var headers = values[0].map(trHeaderKey_);
  var idIndex = headers.indexOf("ID");
  for (var rowIndex = 1; rowIndex < values.length; rowIndex++) {
    if (values[rowIndex][idIndex] === id) {
      Object.keys(patch).forEach(function (key) {
        var columnIndex = headers.indexOf(key);
        if (columnIndex >= 0) sheet.getRange(rowIndex + 1, columnIndex + 1).setValue(patch[key]);
      });
      return true;
    }
  }
  return false;
}

function trEnsureHeaders_(sheet, expectedHeaders) {
  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  var existing = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(trHeaderKey_).filter(String);
  var missing = expectedHeaders.filter(function (header) {
    return existing.indexOf(header) === -1;
  });
  if (!missing.length) return;
  sheet.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
}

function trDeleteWhere_(sheetName, columnName, value) {
  var sheet = trGetOrCreateSheet_(sheetName);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return;
  var columnIndex = values[0].map(trHeaderKey_).indexOf(columnName);
  for (var i = values.length - 1; i >= 1; i--) {
    if (values[i][columnIndex] === value) sheet.deleteRow(i + 1);
  }
}

function trHeaderKey_(header) {
  var key = String(header || "").trim();
  if (key.indexOf("Usuario ") === 0) return "Usuario";
  return key;
}

function trParseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return null;
  return trParseJson_(e.postData.contents, null);
}

function trExtractIncomingText_(message) {
  if (!message) return "";
  if (message.type === "text") return (message.text && message.text.body) || "";
  if (message.type === "interactive" && message.interactive) {
    var buttonReply = message.interactive.button_reply;
    if (buttonReply) return buttonReply.id || buttonReply.title || "";
    var listReply = message.interactive.list_reply;
    if (listReply) return listReply.id || listReply.title || "";
  }
  if (message.type === "button" && message.button) {
    return message.button.payload || message.button.text || "";
  }
  return "";
}

function trParseJson_(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (err) {
    return fallback;
  }
}

function trJson_(data, status) {
  var output = ContentService
    .createTextOutput(JSON.stringify(Object.assign(status ? { status: status } : {}, data)))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

function trProp_(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || "";
}

function trRequirePanelKey_(key) {
  var expected = trProp_("PANEL_API_KEY");
  if (!expected) return { error: "PANEL_API_KEY no configurado" };
  if (key !== expected) return { error: "No autorizado" };
  return null;
}

function trNormalize_(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function trNormalizePhone_(phone) {
  var digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.indexOf("00") === 0) digits = digits.slice(2);
  if (digits.indexOf("598") !== 0) {
    if (digits.indexOf("0") === 0) digits = digits.slice(1);
    if (digits.length <= 9) digits = "598" + digits;
  }
  return digits;
}

function trLog_(type, detail) {
  trAppendObject_(TR_SHEETS.logs, {
    Timestamp: new Date(),
    Tipo: type,
    Detalle: detail
  });
}

function authorizeExternalRequests() {
  UrlFetchApp.fetch("https://graph.facebook.com/robots.txt", {
    muteHttpExceptions: true
  });
}
