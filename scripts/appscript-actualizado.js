/**
 * TRGROOMING - AppScript Actualizado v3
 * Compatible con el nuevo sistema de reservas
 * 
 * CAMBIOS EN ESTA VERSION:
 * - Horarios diferenciados por dia de la semana
 * - Lunes a Viernes: 11:00, 13:00, 15:00, 17:00
 * - Sabados: 10:00, 14:00
 * - Domingos: Sin horarios
 * - Bloqueo usando LockService para evitar race conditions
 * - Verificación doble antes de guardar
 * 
 * INSTRUCCIONES DE INSTALACION:
 * 1. Ve a Google Sheets > Extensiones > Apps Script
 * 2. Borra todo el codigo existente
 * 3. Pega este codigo
 * 4. Guarda (Ctrl+S)
 * 5. Implementar > Nueva implementacion > Aplicacion web
 * 6. Ejecutar como: Tu cuenta
 * 7. Acceso: Cualquier persona
 * 8. Copia la URL y reemplazala en app.js (SCRIPT_URL)
 * 
 * ESTRUCTURA DE COLUMNAS EN "Reservas":
 * A: ID Reserva
 * B: Timestamp
 * C: Fecha
 * D: Hora
 * E: Nombre Cliente
 * F: Telefono
 * G: Servicio
 * H: Tamaño
 * I: Pelaje
 * J: Nombre Mascota
 * K: Notas Mascota
 * L: Duracion
 * M: Precio
 */

// Nombre de la hoja
const NOMBRE_HOJA = "Reservas";

// Horarios disponibles segun el dia
const HORARIOS_SEMANA = ["11:00", "13:00", "15:00", "17:00"]; // Lunes a Viernes
const HORARIOS_SABADO = ["10:00", "14:00"]; // Sabados

// Duracion de cada cita en horas
const DURACION_CITA_HORAS = 2;

// Columna donde esta la fecha (C = indice 2, 0-based)
const COLUMNA_FECHA = 2;

// Columna donde esta la hora (D = indice 3, 0-based)
const COLUMNA_HORA = 3;

/**
 * Obtiene los horarios segun el dia de la semana
 */
function getHorariosPorFecha(fecha) {
  const dateParts = fecha.split('-');
  const year = Number(dateParts[0]);
  const month = Number(dateParts[1]) - 1;
  const day = Number(dateParts[2]);
  
  const dateObj = new Date(year, month, day);
  const dayOfWeek = dateObj.getDay();
  
  // 0 = Domingo, 1-5 = Lunes a Viernes, 6 = Sabado
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    return HORARIOS_SEMANA;
  }
  if (dayOfWeek === 6) {
    return HORARIOS_SABADO;
  }
  // Domingo sin horarios
  return [];
}

/**
 * Maneja las solicitudes GET (obtener horarios disponibles)
 */
function doGet(e) {
  try {
    const fecha = e.parameter.fecha;
    
    if (!fecha) {
      return jsonResponse({ error: "Fecha no proporcionada" });
    }
    
    const horariosDelDia = getHorariosPorFecha(fecha);
    
    // Si es domingo o una fecha sin horarios, devuelve array vacío
    if (horariosDelDia.length === 0) {
      return jsonResponse({ 
        success: true,
        horarios: [],
        fecha: fecha,
        duracionCita: DURACION_CITA_HORAS
      });
    }
    
    const horariosOcupados = obtenerHorariosOcupados(fecha);
    const horariosDisponibles = horariosDelDia.filter(
      h => !horariosOcupados.includes(h)
    );
    
    return jsonResponse({ 
      success: true,
      horarios: horariosDisponibles,
      fecha: fecha,
      duracionCita: DURACION_CITA_HORAS
    });
    
  } catch (error) {
    return jsonResponse({ 
      error: "Error al obtener horarios: " + error.message 
    });
  }
}

/**
 * Maneja las solicitudes POST (crear reserva)
 * Usa LockService para evitar race conditions
 */
function doPost(e) {
  // Obtener un lock para evitar que dos personas reserven el mismo horario
  const lock = LockService.getScriptLock();
  
  try {
    // Intentar obtener el lock por hasta 10 segundos
    const hasLock = lock.tryLock(10000);
    
    if (!hasLock) {
      return jsonResponse({ 
        error: "El sistema está ocupado, por favor intenta de nuevo en unos segundos" 
      });
    }
    
    const datos = JSON.parse(e.postData.contents);
    
    // Validar campos requeridos
    if (!datos.nombre || !datos.telefono || !datos.fecha || !datos.hora) {
      return jsonResponse({ 
        error: "Faltan campos requeridos (nombre, telefono, fecha, hora)" 
      });
    }
    
    // Validar nombre (más de 3 letras, sin números)
    const nombreLimpio = datos.nombre.trim();
    if (nombreLimpio.length <= 3) {
      return jsonResponse({ 
        error: "El nombre debe tener más de 3 letras" 
      });
    }
    if (/\d/.test(nombreLimpio)) {
      return jsonResponse({ 
        error: "El nombre no puede contener números" 
      });
    }
    
    // Validar teléfono (mínimo 6 dígitos)
    const telefonoDigitos = datos.telefono.replace(/\D/g, '');
    if (telefonoDigitos.length < 6) {
      return jsonResponse({ 
        error: "El teléfono debe tener al menos 6 dígitos" 
      });
    }
    
    // Validar nombre de mascota
    if (!datos.nombreMascota && !datos.nombre_mascota) {
      return jsonResponse({ 
        error: "El nombre de la mascota es obligatorio" 
      });
    }
    
    // VERIFICACION DOBLE: Verificar que el horario siga disponible
    const horariosOcupados = obtenerHorariosOcupados(datos.fecha);
    if (horariosOcupados.includes(datos.hora)) {
      return jsonResponse({ 
        error: "¡Lo sentimos! El horario " + datos.hora + " ya fue reservado por otra persona. Por favor elige otro horario." 
      });
    }
    
    // Guardar la reserva
    guardarReserva(datos);
    
    return jsonResponse({ 
      success: true,
      message: "¡Reserva creada exitosamente!",
      datos: {
        nombre: datos.nombre,
        fecha: datos.fecha,
        hora: datos.hora,
        servicio: datos.servicio || "",
        duracion: DURACION_CITA_HORAS + " horas"
      }
    });
    
  } catch (error) {
    return jsonResponse({ 
      error: "Error al crear reserva: " + error.message 
    });
  } finally {
    // Siempre liberar el lock
    lock.releaseLock();
  }
}

/**
 * Obtiene los horarios ocupados para una fecha especifica
 */
function obtenerHorariosOcupados(fechaBuscada) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NOMBRE_HOJA);
  const datos = hoja.getDataRange().getValues();
  const horariosOcupados = [];
  
  // Normalizar la fecha buscada
  const fechaNormalizada = normalizarFecha(fechaBuscada);
  
  // Empezar desde fila 1 (saltear encabezado si existe)
  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    const fechaFila = normalizarFecha(fila[COLUMNA_FECHA]);
    
    if (fechaFila === fechaNormalizada) {
      const hora = fila[COLUMNA_HORA];
      if (hora) {
        horariosOcupados.push(formatearHora(hora));
      }
    }
  }
  
  return horariosOcupados;
}

/**
 * Guarda una nueva reserva en la hoja
 */
function guardarReserva(datos) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NOMBRE_HOJA);
  
  const reservaId = generarIdReserva();
  const timestamp = new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
  
  // Columnas: ID Reserva, Timestamp, Fecha, Hora, Nombre, Telefono, 
  //           Servicio, Tamaño, Pelaje, NombreMascota, Notas, Duracion, Precio
  const nuevaFila = [
    reservaId,
    timestamp,
    datos.fecha || "",
    datos.hora || "",
    datos.nombre || "",
    datos.telefono || "",
    datos.servicio || "",
    datos.tamano || datos.tamaño || "",
    datos.pelaje || "",
    datos.nombreMascota || datos.nombre_mascota || "",
    datos.notasMascota || datos.notas_mascota || datos.notas || "",
    datos.duracion || "",
    datos.precio || ""
  ];
  
  hoja.appendRow(nuevaFila);
}

/**
 * Genera un ID unico para la reserva
 */
function generarIdReserva() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `TR-${timestamp}-${random}`.toUpperCase();
}

/**
 * Normaliza una fecha a formato YYYY-MM-DD
 */
function normalizarFecha(fecha) {
  if (!fecha) return "";
  
  // Si es un objeto Date
  if (fecha instanceof Date) {
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  }
  
  // Si es string
  const fechaStr = String(fecha).trim();
  
  // Formato DD/MM/YYYY
  if (fechaStr.includes('/')) {
    const partes = fechaStr.split('/');
    if (partes.length === 3) {
      const dia = partes[0].padStart(2, '0');
      const mes = partes[1].padStart(2, '0');
      const año = partes[2].length === 2 ? '20' + partes[2] : partes[2];
      return `${año}-${mes}-${dia}`;
    }
  }
  
  // Formato YYYY-MM-DD (ya normalizado)
  if (fechaStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return fechaStr;
  }
  
  // Intentar parsear como Date
  try {
    const d = new Date(fechaStr);
    if (!isNaN(d.getTime())) {
      const año = d.getFullYear();
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const dia = String(d.getDate()).padStart(2, '0');
      return `${año}-${mes}-${dia}`;
    }
  } catch (e) {}
  
  return fechaStr;
}

/**
 * Formatea una hora a HH:MM
 */
function formatearHora(hora) {
  if (!hora) return "";
  
  // Si es un objeto Date
  if (hora instanceof Date) {
    const horas = String(hora.getHours()).padStart(2, '0');
    const minutos = String(hora.getMinutes()).padStart(2, '0');
    return `${horas}:${minutos}`;
  }
  
  // Si es string
  const horaStr = String(hora).trim();
  
  // Formato HH:MM
  if (horaStr.match(/^\d{1,2}:\d{2}$/)) {
    const partes = horaStr.split(':');
    return partes[0].padStart(2, '0') + ':' + partes[1];
  }
  
  return horaStr;
}

/**
 * Crea una respuesta JSON con CORS habilitado
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Funcion de prueba para verificar la configuracion
 */
function testConfig() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NOMBRE_HOJA);
  
  if (!hoja) {
    Logger.log("ERROR: No se encontro la hoja '" + NOMBRE_HOJA + "'");
    return;
  }
  
  Logger.log("OK: Hoja encontrada");
  Logger.log("Horarios Lunes-Viernes: " + HORARIOS_SEMANA.join(", "));
  Logger.log("Horarios Sabados: " + HORARIOS_SABADO.join(", "));
  Logger.log("Duracion de cada cita: " + DURACION_CITA_HORAS + " horas");
  
  // Probar obtener horarios para hoy
  const hoy = new Date();
  const fechaHoy = normalizarFecha(hoy);
  const horariosDelDia = getHorariosPorFecha(fechaHoy);
  const ocupados = obtenerHorariosOcupados(fechaHoy);
  
  Logger.log("Fecha de hoy: " + fechaHoy);
  Logger.log("Horarios del dia: " + (horariosDelDia.length > 0 ? horariosDelDia.join(", ") : "ninguno (domingo)"));
  Logger.log("Horarios ocupados hoy: " + (ocupados.length > 0 ? ocupados.join(", ") : "ninguno"));
  Logger.log("Horarios disponibles hoy: " + horariosDelDia.filter(h => !ocupados.includes(h)).join(", "));
}
