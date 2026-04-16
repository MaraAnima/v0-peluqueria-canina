/**
 * TRGROOMING - AppScript Actualizado
 * Compatible con el nuevo sistema de reservas
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
 * ESTRUCTURA DE COLUMNAS EN "Hoja 1":
 * A: Nombre del dueño
 * B: Telefono
 * C: Fecha
 * D: Hora
 * E: Servicio
 * F: Tamaño
 * G: Pelaje
 * H: Nombre Mascota (NUEVO)
 * I: Notas (NUEVO)
 * J: Extras (NUEVO)
 * K: Duracion (NUEVO)
 * L: Precio (NUEVO)
 * M: Timestamp (NUEVO - cuando se creo la reserva)
 */

// Nombre de la hoja
const NOMBRE_HOJA = "Hoja 1";

// Horarios disponibles (mantener los originales)
const HORARIOS_DISPONIBLES = ["12:00", "14:00", "16:00", "18:00"];

// Columna donde esta la fecha (C = indice 2, 0-based)
const COLUMNA_FECHA = 2;

// Columna donde esta la hora (D = indice 3, 0-based)
const COLUMNA_HORA = 3;

/**
 * Maneja las solicitudes GET (obtener horarios disponibles)
 */
function doGet(e) {
  try {
    const fecha = e.parameter.fecha;
    
    if (!fecha) {
      return jsonResponse({ error: "Fecha no proporcionada" });
    }
    
    const horariosOcupados = obtenerHorariosOcupados(fecha);
    const horariosDisponibles = HORARIOS_DISPONIBLES.filter(
      h => !horariosOcupados.includes(h)
    );
    
    return jsonResponse({ 
      success: true,
      horarios: horariosDisponibles,
      fecha: fecha
    });
    
  } catch (error) {
    return jsonResponse({ 
      error: "Error al obtener horarios: " + error.message 
    });
  }
}

/**
 * Maneja las solicitudes POST (crear reserva)
 */
function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);
    
    // Validar campos requeridos
    if (!datos.nombre || !datos.telefono || !datos.fecha || !datos.hora) {
      return jsonResponse({ 
        error: "Faltan campos requeridos (nombre, telefono, fecha, hora)" 
      });
    }
    
    // Verificar que el horario siga disponible
    const horariosOcupados = obtenerHorariosOcupados(datos.fecha);
    if (horariosOcupados.includes(datos.hora)) {
      return jsonResponse({ 
        error: "El horario seleccionado ya no está disponible" 
      });
    }
    
    // Guardar la reserva
    guardarReserva(datos);
    
    return jsonResponse({ 
      success: true,
      message: "Reserva creada exitosamente",
      datos: {
        nombre: datos.nombre,
        fecha: datos.fecha,
        hora: datos.hora,
        servicio: datos.servicio || ""
      }
    });
    
  } catch (error) {
    return jsonResponse({ 
      error: "Error al crear reserva: " + error.message 
    });
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
  
  // Procesar extras (puede venir como array o string)
  let extrasStr = "";
  if (datos.extras) {
    if (Array.isArray(datos.extras)) {
      extrasStr = datos.extras.join(", ");
    } else {
      extrasStr = datos.extras;
    }
  }
  
  // Crear la fila con todos los datos
  // Columnas: A:Nombre, B:Telefono, C:Fecha, D:Hora, E:Servicio, F:Tamaño, G:Pelaje, 
  //           H:NombreMascota, I:Notas, J:Extras, K:Duracion, L:Precio, M:Timestamp
  const nuevaFila = [
    datos.nombre || "",
    datos.telefono || "",
    datos.fecha || "",
    datos.hora || "",
    datos.servicio || "",
    datos.tamano || datos.tamaño || "",
    datos.pelaje || "",
    datos.nombreMascota || datos.nombre_mascota || "",
    datos.notasMascota || datos.notas_mascota || datos.notas || "",
    extrasStr,
    datos.duracion || "",
    datos.precio || "",
    new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })
  ];
  
  hoja.appendRow(nuevaFila);
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
 * Ejecuta esta funcion manualmente para verificar que todo funciona
 */
function testConfig() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NOMBRE_HOJA);
  
  if (!hoja) {
    Logger.log("ERROR: No se encontro la hoja '" + NOMBRE_HOJA + "'");
    return;
  }
  
  Logger.log("OK: Hoja encontrada");
  Logger.log("Horarios disponibles: " + HORARIOS_DISPONIBLES.join(", "));
  
  // Probar obtener horarios para hoy
  const hoy = new Date();
  const fechaHoy = normalizarFecha(hoy);
  const ocupados = obtenerHorariosOcupados(fechaHoy);
  
  Logger.log("Fecha de hoy: " + fechaHoy);
  Logger.log("Horarios ocupados hoy: " + (ocupados.length > 0 ? ocupados.join(", ") : "ninguno"));
  Logger.log("Horarios disponibles hoy: " + HORARIOS_DISPONIBLES.filter(h => !ocupados.includes(h)).join(", "));
}
