// ==================== CONFIGURACION ====================
const SPREADSHEET_ID = '11rzRToVwRoBOVNr-G0KYV7gi_NCUEmBG2UsMhydc3Cg';
const SHEET_NAME = 'Reservas';
const TIME_SLOTS_WEEKDAY = ['11:00', '13:00', '15:00', '17:00'];
const TIME_SLOTS_SATURDAY = ['10:00', '14:00'];

// ==================== FUNCIONES PRINCIPALES ====================

function doGet(e) {
  try {
    const fecha = e.parameter.fecha;
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

    const camposRequeridos = ['nombre', 'telefono', 'fecha', 'hora'];
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
    // El deslanado ocupa el turno actual + el turno siguiente (2 horas extra),
    // por lo que el turno siguiente debe existir y estar libre.
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

      // Aseguramos que se guarde el turno bloqueado correcto
      data.horaBloqueada = siguiente;
    }

    const resultado = saveReservation(data);

    if (resultado.success) {
      return createJsonResponse({ success: true, reservaId: resultado.reservaId });
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

  // Si es domingo o una fecha sin horarios, devuelve array vacío
  if (horariosDelDia.length === 0) {
    return [];
  }

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const fechaReserva = row[2];
    const horaReserva = row[3];

    if (fechaReserva && formatDateForComparison(fechaReserva) === fecha) {
      if (horaReserva) {
        const horaFormateada = formatTimeForComparison(horaReserva);
        horariosOcupados.push(horaFormateada);
      }

      // Si la reserva incluye deslanado, tambien se ocupa el turno siguiente.
      // Columnas: [14] = 'Deslanado', [15] = 'Hora Bloqueada'
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
      data.extras || '',                                  // Extras (texto)
      data.deslanado ? 'SI' : 'NO',                       // Deslanado
      data.deslanado ? (data.horaBloqueada || '') : ''    // Hora Bloqueada (turno siguiente)
    ]);

    return { success: true, reservaId: reservaId };
  } catch (error) {
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
      'Extras', 'Deslanado', 'Hora Bloqueada'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#4a90a4')
      .setFontColor('#ffffff');
    sheet.setColumnWidths(1, headers.length, 120);
  } else {
    // Asegura que las columnas nuevas existan en hojas ya creadas
    ensureExtraColumns(sheet);
  }

  return sheet;
}

// Agrega las columnas nuevas (Extras, Deslanado, Hora Bloqueada) si la hoja
// fue creada con una version anterior del script.
function ensureExtraColumns(sheet) {
  const expectedHeaders = [
    'ID Reserva', 'Timestamp', 'Fecha', 'Hora', 'Nombre Cliente',
    'Telefono', 'Servicio', 'Tamano', 'Pelaje', 'Nombre Mascota',
    'Notas Mascota', 'Duracion', 'Precio',
    'Extras', 'Deslanado', 'Hora Bloqueada'
  ];

  const lastColumn = sheet.getLastColumn();
  if (lastColumn >= expectedHeaders.length) {
    return; // Ya tiene todas las columnas
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

  // Evita problemas de zona horaria creando la fecha localmente
  const year = Number(dateParts[0]);
  const month = Number(dateParts[1]) - 1;
  const day = Number(dateParts[2]);

  const dateObj = new Date(year, month, day);
  const dayOfWeek = dateObj.getDay();

  // getDay():
  // 0 = Domingo
  // 1 = Lunes
  // 2 = Martes
  // 3 = Miércoles
  // 4 = Jueves
  // 5 = Viernes
  // 6 = Sábado

  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    return TIME_SLOTS_WEEKDAY;
  }

  if (dayOfWeek === 6) {
    return TIME_SLOTS_SATURDAY;
  }

  // Domingo sin horarios
  return [];
}

// Formatea la hora para comparacion
function formatTimeForComparison(hora) {
  if (!hora) return '';

  // Si ya es string en formato HH:MM
  if (typeof hora === 'string' && hora.match(/^\d{1,2}:\d{2}$/)) {
    // Asegurar formato con 2 digitos para la hora
    const parts = hora.split(':');
    return String(parts[0]).padStart(2, '0') + ':' + parts[1];
  }

  // Si es objeto Date (como en Google Sheets)
  if (hora instanceof Date) {
    const hours = String(hora.getHours()).padStart(2, '0');
    const minutes = String(hora.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // Intentar parsear como fecha/hora
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

function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== FUNCIONES DE DEBUG ====================

function testGetSlots() {
  const fecha = '2026-04-30';
  const slots = getAvailableSlots(fecha);
  Logger.log('Horarios disponibles para ' + fecha + ': ' + JSON.stringify(slots));
}

function debugVerFechas() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();

  Logger.log('=== DEBUG FECHAS ===');
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const fechaReserva = row[2];
    const horaReserva = row[3];

    Logger.log('Fila ' + (i + 1) + ':');
    Logger.log('  - Fecha formateada: ' + formatDateForComparison(fechaReserva));
    Logger.log('  - Hora formateada: ' + formatTimeForComparison(horaReserva));
    Logger.log('  - Deslanado: ' + row[14] + ' | Hora bloqueada: ' + row[15]);
  }
}
