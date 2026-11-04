import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { FILAS, TURNOS, fila, filasUsadas, resumen, observacionesPdf, fechaCorta } from './logic'

// Coordenadas de la plantilla (puntos PDF, origen abajo a la izquierda, hoja carta 612x792)
const ROW_Y = (i) => 792 - (98.64 + i * 14.6218) // centro vertical de cada fila
const COL = {
  agL: 92.8, agLw: 90, camL: 205.9, hsL: 245.3, ppL: 280.6, ppLw: 33,
  agR: 301.6, agRw: 94, camR: 428.2, ppR: 510.7, ppRw: 98,
  valR: 400, valRw: 160, full: 301.6, fullw: 252, tot: 510.7,
}
const INK = rgb(0.118, 0.227, 0.541)

export async function generarPdf(dia, padron) {
  const bytes = await fetch('/plantilla.pdf').then((r) => r.arrayBuffer())
  const doc = await PDFDocument.load(bytes)
  const page = doc.getPages()[0]
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const reg = await doc.embedFont(StandardFonts.Helvetica)

  const texto = (s, x, y, { size = 7, font = bold, center = false, maxw } = {}) => {
    s = String(s ?? '').replace(/[→›]/g, '>')
    if (!s) return
    while (maxw && font.widthOfTextAtSize(s, size) > maxw && size > 4.5) size -= 0.25
    const w = font.widthOfTextAtSize(s, size)
    page.drawText(s, { x: center ? x - w / 2 : x, y: y - size * 0.35, size, font, color: INK })
  }

  // Si dos agentes del día comparten apellido, se agrega el nombre (ej. MEZA DIEGO / MEZA ERIKA)
  const ag = (id) => padron.find((a) => a.id === id)
  const usados = filasUsadas(dia).flatMap(({ f }) => f.agentes.filter(Boolean)).map(ag).filter(Boolean)
  const nombrePdf = (a) => usados.filter((u) => u.apellido === a.apellido).length > 1 ? `${a.apellido} ${a.nombre}` : a.apellido
  const nombresFila = (def, f) => {
    const as = f.agentes.filter(Boolean).map(ag).filter(Boolean)
    let s = as.length > 1 ? as.map((a) => a.apellido).join(' - ') : as[0] ? nombrePdf(as[0]) : ''
    if ((def.kind === 'ref' || def.kind === 'extra') && f.zonaTxt) s += ` (${f.zonaTxt.toUpperCase()})`
    return s
  }

  // Filas que comparten la misma celda (no debería pasar, pero por si acaso)
  for (const def of FILAS) {
    const f = fila(dia, def.key)
    const y = ROW_Y(def.pdfRow)
    if (def.pdfSide === 'R') {
      texto(nombresFila(def, f), COL.agR, y, { maxw: COL.agRw })
      texto(f.cam, COL.camR, y, { center: true })
      texto([f.hs && f.hs + ' HS', f.ppol].filter(Boolean).join(' - ').toUpperCase(), COL.ppR, y, { center: true, maxw: COL.ppRw })
    } else if (def.side === 'L') {
      texto(nombresFila(def, f), COL.agL, y, { maxw: COL.agLw })
      texto(f.cam, COL.camL, y, { center: true })
      texto(f.hs, COL.hsL, y, { center: true })
      texto(f.ppol, COL.ppL, y, { center: true, maxw: COL.ppLw, size: 6 })
    } else {
      texto(nombresFila(def, f), COL.agR, y, { maxw: COL.agRw })
      texto(f.cam, COL.camR, y, { center: true })
      const pp = [f.zonas, f.ppol].filter(Boolean).join(' - ').toUpperCase()
      texto(pp, COL.ppR, y, { center: true, maxw: COL.ppRw })
    }
  }

  texto(fechaCorta(dia.fecha), 510.7, 729, { size: 8, center: true })
  texto(dia.backup, COL.full, ROW_Y(8), { maxw: COL.fullw, font: reg })
  texto(dia.sinAgentes, COL.full, ROW_Y(11), { maxw: COL.fullw, font: reg })
  texto(dia.fueraServicio, COL.full, ROW_Y(13), { maxw: COL.fullw, font: reg })

  const r = resumen(dia)
  TURNOS.forEach((t, i) => texto(r.porHora[t].join('-'), COL.valR, ROW_Y(14 + i), { maxw: COL.valRw }))

  // Observaciones: 4 renglones. Achica la letra hasta que entre; si igual no entra, usa las filas libres de abajo.
  const MAX = COL.fullw
  const partir = (size) => {
    const out = []
    for (const parte of [observacionesPdf(dia, padron).join(' | ')].filter(Boolean)) {
      let actual = ''
      for (const palabra of parte.split(' ')) {
        const prueba = actual ? actual + ' ' + palabra : palabra
        if (reg.widthOfTextAtSize(prueba, size) > MAX && actual) { out.push(actual); actual = palabra } else actual = prueba
      }
      if (actual) out.push(actual)
    }
    return out
  }
  let SIZE = 6.5, lineas = partir(SIZE)
  while (lineas.length > 4 && SIZE > 5) { SIZE -= 0.25; lineas = partir(SIZE) }
  const filasObs = [19, 20, 21, 22, 32, 33, 34]
  lineas.slice(0, filasObs.length).forEach((l, i) => texto(l, COL.full, ROW_Y(filasObs[i]), { font: reg, size: SIZE, maxw: MAX }))

  // Totales (la celda TOTAL trae un "0" impreso: se tapa)
  texto(r.enCalle, COL.tot, ROW_Y(23), { center: true })
  texto(dia.rotas || '-', COL.tot, ROW_Y(24), { center: true })
  texto(r.sinAgente.length ? 'ZONA ' + r.sinAgente.join(', ') : '-', COL.tot, ROW_Y(25), { center: true, maxw: 98 })
  page.drawRectangle({ x: 462, y: ROW_Y(26) - 6, width: 98, height: 12, color: rgb(226 / 255, 232 / 255, 240 / 255) })
  texto(r.enCalle, COL.tot, ROW_Y(26), { center: true })

  return doc.save()
}

export async function descargarPdf(dia, padron) {
  const bytes = await generarPdf(dia, padron)
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `PLANILLA MOVILES ${fechaCorta(dia.fecha).replaceAll('/', '-')}.pdf`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
