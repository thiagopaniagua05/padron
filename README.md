# Salida de Móviles

App web para cargar la planilla diaria de salida de móviles del Cuerpo de Patrulla de Vicente López. Con esos datos genera:

- **El PDF de la planilla**, escrito sobre la plantilla oficial (`public/plantilla.pdf`).
- **Los partes de WhatsApp de cada turno** (06, 07, 08 y 09 hs), con F.E / F.P / F.A, motivos de ausencia y totales calculados automáticamente.

Stack: React 18 + Vite, `pdf-lib` para el PDF, Vercel Routing Middleware para la contraseña. No tiene backend ni base de datos.

## Uso

1. **Padrón**: se carga una sola vez (apellido, nombre, LP). Desde cualquier selector se puede dar de alta a un agente nuevo con el botón `+`.
2. **Planilla**: por cada zona se busca al agente. Se puede escribir parte del apellido, del nombre o del LP, en cualquier orden. Al elegirlo se completan solos el móvil y la hora que usó la última vez (solo si esos campos están vacíos). Si cargás el móvil a mano, la hora se completa con la última que tuvo ese móvil.
   - Las filas **SUP.** admiten dos agentes.
   - Las filas **REF.** y **ZONA** tienen un texto de zona (ej. `14 A 18 BIS`, `BERMUDEZ`, `13`).
   - Cuando se ocupan las tres filas ZONA aparece una cuarta, hasta un máximo de ocho. En el PDF, las que no entran a la izquierda se imprimen en las filas libres de abajo a la derecha.
   - **QTH fijo / Refuerzo**: la columna *Zonas* se imprime en la columna P.POL. del PDF y arma el texto "REFUERZO 6/7/9/10" del parte.
3. **Ausentes y otros**: ausentes con su motivo, recepción y personal afectado a otro sector. Todo esto se agrega solo a las observaciones del PDF y a los partes.
4. **Copiar día anterior**: copia los móviles, las zonas, el supervisor y el auxiliar del último día guardado. Así solo se corrigen los cambios.
5. **Generar PDF** / pestaña **Partes WhatsApp** (copiar o abrir en WhatsApp).

La app avisa de móviles repetidos, agentes en dos móviles, filas sin horario y zonas sin cubrir.

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
