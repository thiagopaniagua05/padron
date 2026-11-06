# Salida de Móviles

App web para cargar la planilla diaria de salida de móviles del Cuerpo de Patrulla de Vicente López. Con esos datos genera:

- **El PDF de la planilla**, escrito sobre la plantilla oficial (`public/plantilla.pdf`).
- **Los partes de WhatsApp de cada turno** (06, 07, 08 y 09 hs), con F.E / F.P / F.A, motivos de ausencia y totales calculados automáticamente.

Stack: React 18 + Vite, `pdf-lib` para el PDF, Vercel Routing Middleware para la contraseña. No tiene backend ni base de datos.

## Uso

1. **Pegar**: se copia el parte de WhatsApp (uno o los 4 turnos juntos), se pega y se toca *Cargar*. La app lee los móviles, la zona, los agentes con su LP, el oficial de policía, los ausentes con el motivo, la recepción y el personal afectado. Si un agente no está en el padrón, lo agrega. Si el parte es de otra fecha, pregunta en qué día cargarlo. Volver a pegar un turno reemplaza lo cargado de ese turno.
2. **Móviles**: hay una tarjeta por móvil, agrupadas por turno como en el parte. Cada tarjeta tiene el móvil, la zona (una lista con las zonas, UVG, SUPERVISOR, LIBRE, REFUERZO con sus zonas, QTH fijo u otra), la hora, uno o más agentes (el 2° se puede marcar como *Adicional*, que no suma en F.P) y el oficial de policía. Una zona puede tener varios móviles.
3. **Otros**: ausentes, recepción, personal afectado, back-up, fuera de servicio, rotas y observaciones.
4. **Partes**: el texto de cada turno para copiar o mandar por WhatsApp, con los totales calculados.
5. **Generar planilla PDF**: la app reparte sola los móviles en la plantilla:
   - Cada zona numerada va en su fila.
   - UVG va en las filas UVG, y SUPERVISOR / LIBRE en las filas SUP.
   - Los refuerzos van primero en *Móviles de refuerzo* y después en la fila REF.
   - Los segundos móviles de una zona, BERMUDEZ, CUADRANTE, etc. van en las filas ZONA y después en las filas libres de abajo a la derecha.
   - Si dos agentes van en un móvil, salen como "VALLE - RAMIREZ".

La app avisa de móviles repetidos, agentes en dos móviles, móviles sin zona, zonas sin cubrir y móviles que no entran en la plantilla. Los días guardados con la versión anterior se convierten solos.

### Datos

Todo se guarda en el navegador (localStorage). Desde **Padrón → Exportar backup** se descarga un `.json` que se puede importar en otra PC o celular. Así se pasan los datos entre vos y Luna, y también sirve de respaldo.

> No subas backups con datos reales al repo: `.gitignore` ya ignora `padron-*.json`. Para el portfolio, usá datos inventados.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173 (en local no pide contraseña)
npm run build
```

## Deploy en Vercel

1. Subí el repo a GitHub (privado) e importalo en Vercel. Detecta Vite solo.
2. En **Settings → Environment Variables** agregá `APP_PASSWORD` = la contraseña (ej. `seguridad2026`) y volvé a deployar.
3. Listo. Sin la contraseña no se descarga ni el HTML ni el JS, porque la valida el servidor (`middleware.js`) y no el navegador. La sesión dura 30 días; el botón *Salir* la cierra.

Para cambiar la contraseña, modificá la variable y redeployá. Las sesiones viejas quedan invalidadas.

## Estructura

```
middleware.js          contraseña (Vercel)
public/plantilla.pdf   plantilla oficial
src/logic.js           filas de la planilla, cálculos, texto de los partes
src/pdf.js             coordenadas de la plantilla y generación del PDF
src/storage.js         guardado local, backup
src/components/        Planilla, Extras, Partes, Padron, AgentePicker
```

## Próximos pasos posibles

- Sincronizar los datos entre dispositivos con Supabase, en vez de usar el backup manual.
- Historial: abrir cualquier día anterior (ya se puede, cambiando la fecha).
- PWA instalable en el celular.
