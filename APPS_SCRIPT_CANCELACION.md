# Google Apps Script - Reservas, Meta, email y cancelacion

La fuente de verdad para pegar en Google Apps Script es:

`apps-script/Codigo.gs`

## Que incluye

- Validacion de webhook Meta / WhatsApp con el token `5WtuSqoYeO4LKk1CQT2Xdwn0D3F8`.
- Reservas por Google Sheets en la hoja `Reservas`.
- Horarios:
  - Lunes a viernes (incluidos los martes): `12:00`, `14:00`, `16:00`.
  - Sabados: `09:00`, `13:00`.
  - Domingos: `09:00`, `11:00`, `13:00`.
- Dias bloqueados todos los anos: `01-01`, `05-01`, `07-18`, `08-25`, `12-25`.
- Si la fecha elegida es hoy, no acepta horarios que ya empezaron.
- Deslanado bloquea el turno siguiente.
- Guarda `Email` y `Estado`.
- Marca cancelaciones como `Cancelada` sin borrar el historico.
- Las citas canceladas liberan el horario.
- Envia email de confirmacion con ID de reserva.
- Envia email cuando se cancela una reserva.
- Permite consultar una cita con su ID y reagendar su fecha y hora, conservando el ID.
- Valida nuevamente la disponibilidad bajo el bloqueo de reservas antes de reagendar.
- Una reagenda libera el turno anterior y mueve tambien el bloqueo de deslanado.
- Las citas canceladas o ya iniciadas no se pueden reagendar.
- Envia la confirmacion del cambio al email original de la reserva.
- Responde `EVENT_RECEIVED` para POSTs de Meta que no sean reservas.

## Reagendar por ID

La web usa `GET ?action=consultarReagenda&id=TR-...` para consultar una cita.
Con `&fecha=YYYY-MM-DD` devuelve los horarios disponibles sin contar la propia
reserva. La respuesta no expone email ni telefono.

El cambio se confirma mediante POST JSON con `action: "reagendar"`, `id`,
`fecha`, `hora`, `fechaActual` y `horaActual`. Los ultimos dos campos evitan
sobrescribir un cambio que se haya hecho desde otra pantalla.
No se crean filas nuevas ni se modifica el ID, el servicio o los datos del cliente.

Pruebas locales, con una hoja y correos simulados: `npm test`.

## Columnas esperadas

1. ID Reserva
2. Timestamp
3. Fecha
4. Hora
5. Nombre Cliente
6. Telefono
7. Servicio
8. Tamano
9. Pelaje
10. Nombre Mascota
11. Notas Mascota
12. Duracion
13. Precio
14. Extras
15. Deslanado
16. Hora Bloqueada
17. Email
18. Estado

## Deploy

1. Abrir Google Apps Script.
2. Reemplazar todo el contenido por `apps-script/Codigo.gs`.
3. Guardar.
4. Ir a `Implementar` -> `Administrar implementaciones`.
5. Editar la implementacion web con el lapiz.
6. Elegir `Nueva version`.
7. Ejecutar como: tu cuenta.
8. Acceso: cualquier persona.
9. Deploy.

## Prueba Meta

Usar esta forma:

```text
https://TU_URL/exec?hub.mode=subscribe&hub.verify_token=5WtuSqoYeO4LKk1CQT2Xdwn0D3F8&hub.challenge=ok_meta
```

Debe responder exactamente:

```text
ok_meta
```
