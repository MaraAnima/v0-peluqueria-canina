# Google Apps Script - Reservas, Meta, email y cancelacion

La fuente de verdad para pegar en Google Apps Script es:

`apps-script/Codigo.gs`

## Que incluye

- Validacion de webhook Meta / WhatsApp con el token `5WtuSqoYeO4LKk1CQT2Xdwn0D3F8`.
- Reservas por Google Sheets en la hoja `Reservas`.
- Horarios:
  - Lunes, miercoles, jueves y viernes: `11:00`, `13:00`, `15:00`, `17:00`.
  - Sabados y domingos: `09:00`, `11:00`, `13:00`.
  - Martes no disponible.
- Dias bloqueados todos los anos: `01-01`, `05-01`, `07-18`, `08-25`, `12-25`.
- Si la fecha elegida es hoy, no acepta horarios que ya empezaron.
- Deslanado bloquea el turno siguiente.
- Guarda `Email` y `Estado`.
- Marca cancelaciones como `Cancelada` sin borrar el historico.
- Las citas canceladas liberan el horario.
- Envia email de confirmacion con ID de reserva.
- Envia email cuando se cancela una reserva.
- Responde `EVENT_RECEIVED` para POSTs de Meta que no sean reservas.

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
