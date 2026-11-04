// Filas de la planilla, en el mismo orden que la plantilla PDF.
// side: 'L' = tabla izquierda (zonas), 'R' = tabla derecha (QTH fijo / refuerzos)
// pdfRow: índice de fila en la grilla del PDF (0 = fila "1")
const zonas = ['1', '2', '3', '4', '5', '5 Bis', '6', '7', '8', '9', '10', '11', '12', '13', '13 Bis',
  '14', '14 Bis', '15', '15 Bis', '16', '17', '18', '18 Bis', '19', '19 Bis', '20', '20 Bis']

export const FILAS = [
  ...zonas.map((z, i) => ({ key: 'Z' + z.replace(' ', ''), label: z, side: 'L', kind: 'zona', pdfRow: i })),
  { key: 'UVG1', label: 'UVG', side: 'L', kind: 'uvg', pdfRow: 27 },
  { key: 'UVG2', label: 'UVG', side: 'L', kind: 'uvg', pdfRow: 28 },
  { key: 'SUP1', label: 'SUP.', side: 'L', kind: 'sup', pdfRow: 29, dos: true },
  { key: 'SUP2', label: 'SUP.', side: 'L', kind: 'sup', pdfRow: 30, dos: true },
  { key: 'REF', label: 'REF.', side: 'L', kind: 'ref', pdfRow: 31 },
  { key: 'X1', label: 'ZONA', side: 'L', kind: 'extra', pdfRow: 32 },
  { key: 'X2', label: 'ZONA', side: 'L', kind: 'extra', pdfRow: 33 },
  { key: 'X3', label: 'ZONA', side: 'L', kind: 'extra', pdfRow: 34 },
  // Extras que no entran a la izquierda: se imprimen en las filas libres de abajo a la derecha
  ...[4, 5, 6, 7, 8].map((n, i) => ({ key: 'X' + n, label: 'ZONA', side: 'L', kind: 'extra', pdfRow: 27 + i, pdfSide: 'R' })),
  { key: 'QTH1', label: 'QTH fijo', side: 'R', kind: 'qth', pdfRow: 1 },
  { key: 'QTH2', label: 'QTH fijo', side: 'R', kind: 'qth', pdfRow: 2 },
  { key: 'RFZ1', label: 'Refuerzo', side: 'R', kind: 'refz', pdfRow: 4 },
  { key: 'RFZ2', label: 'Refuerzo', side: 'R', kind: 'refz', pdfRow: 5 },
  { key: 'RFZ3', label: 'Refuerzo', side: 'R', kind: 'refz', pdfRow: 6 },
]

export const TURNOS = ['6:00', '7:00', '8:00', '9:00']
export const MOTIVOS = ['Carpeta médica', 'Vacaciones', 'Ausente sin aviso', 'Suspensión', 'Franco', 'Licencia', 'Art. / Otro']

export const filaVacia = () => ({ agentes: [], cam: '', hs: '', ppol: '', zonaTxt: '', zonas: '' })

export const diaVacio = (fecha) => ({
  fecha, supervisor: '', auxiliar: '', rotas: '', backup: '', sinAgentes: '', fueraServicio: '', obs: '',
  filas: {}, ausentes: [], otros: [],
})

export const fila = (dia, key) => ({ ...filaVacia(), ...(dia.filas[key] || {}) })
export const usada = (f) => !!(f.cam || f.agentes.some(Boolean))

export const nombreCompleto = (a) => a ? `${a.apellido} ${a.nombre}`.trim() : ''
export const pad2 = (n) => String(n).padStart(2, '0')
export const fechaLarga = (iso) => { const [y, m, d] = iso.split('-'); return `${+d}/${+m}/${y}` }
export const fechaCorta = (iso) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }
const hora2 = (hs) => pad2(hs.split(':')[0]) + ':00'
const finTurno = (hs) => pad2((+hs.split(':')[0] + 12) % 24) + ':00'

/** Zona tal como aparece en el parte de WhatsApp */
export function zonaParte(def, f) {
  switch (def.kind) {
    case 'zona': return def.label.replace(' ', '').toUpperCase()
    case 'uvg': return 'UVG'
    case 'sup': return (f.zonaTxt || 'SUPERVISOR').toUpperCase()
    case 'ref': return ('REFUERZO ' + (f.zonaTxt || '')).trim().toUpperCase()
    case 'extra': return (f.zonaTxt || 'S/Z').toUpperCase()
    default: return ('REFUERZO ' + (f.zonas || '')).trim().toUpperCase()
  }
}

/** Todas las filas cargadas, con su definición */
export const filasUsadas = (dia) =>
  FILAS.map((def) => ({ def, f: fila(dia, def.key) })).filter(({ f }) => usada(f))

/** Resumen general del día (para la planilla PDF y la pantalla) */
export function resumen(dia) {
  const usadas = filasUsadas(dia)
  const porHora = Object.fromEntries(TURNOS.map((t) => [t, usadas.filter(({ f }) => f.hs === t && f.cam).map(({ f }) => f.cam)]))
  const sinAgente = FILAS.filter((d) => d.kind === 'zona' && !usada(fila(dia, d.key)))
    .map((d) => d.label.replace(' ', '').toUpperCase())
  // Una zona cubierta por una fila "ZONA" extra (ej. "13") no se cuenta como vacía
  const extras = usadas.filter(({ def }) => def.kind === 'extra').map(({ f }) => (f.zonaTxt || '').replace(/\s/g, '').toUpperCase())
  const sinAgenteReal = sinAgente.filter((z) => !extras.includes(z))
  // Avisos: zonas repetidas / móviles repetidos
  const cams = usadas.map(({ f }) => f.cam).filter(Boolean)
  const camsRepetidas = [...new Set(cams.filter((c, i) => cams.indexOf(c) !== i))]
  const ids = usadas.flatMap(({ f }) => f.agentes.filter(Boolean))
  const agentesRepetidos = [...new Set(ids.filter((c, i) => ids.indexOf(c) !== i))]
  const sinHora = usadas.filter(({ f }) => !f.hs).map(({ def }) => def.label)
  return { enCalle: cams.length, porHora, sinAgente: sinAgenteReal, camsRepetidas, agentesRepetidos, sinHora }
}

/** Texto del parte de WhatsApp para un turno */
export function parteWhatsApp(dia, padron, hs) {
  const ag = (id) => padron.find((a) => a.id === id)
  const moviles = filasUsadas(dia).filter(({ f }) => f.hs === hs)
  // Los supervisores van primero, como en los partes de ejemplo
  moviles.sort((a, b) => (b.def.kind === 'sup') - (a.def.kind === 'sup'))
  const otros = dia.otros.filter((o) => o.hs === hs && o.agente)
  const ausentes = dia.ausentes.filter((a) => a.hs === hs && a.agente)
  const recepcion = otros.filter((o) => o.tipo === 'RECEPCIÓN')
  const afectados = otros.filter((o) => o.tipo === 'AFECTADO')

  const L = []
  L.push('_*Dirección General de Operaciones al Cuerpo de Patrulla Vicente López*_', '')
  L.push('*PARTE SALIDA DE MÓVILES*', '')
  L.push(`*SUPERVISOR:* _*${dia.supervisor.toUpperCase()}*_`)
  L.push(`*AUXILIAR:* _${dia.auxiliar.toUpperCase()}_`, '')
  L.push(`*FECHA:* ${fechaLarga(dia.fecha)}`)
  L.push('*HORARIO:* ', `${hora2(hs)} A ${finTurno(hs)} Hs`, '')

  let agentesEnMovil = 0
  moviles.forEach(({ def, f }, i) => {
    L.push(`${pad2(i + 1)}- *Movil ${f.cam || 'S/N'}/Zona ${zonaParte(def, f)}*`)
    f.agentes.filter(Boolean).forEach((id) => {
      const a = ag(id); agentesEnMovil++
      L.push(`Agente: ${nombreCompleto(a)}`, `LP: ${a?.lp || 'S/N'}`)
    })
    L.push(`Of.Policia: ${f.ppol || 'Sin personal'}`, '')
  })

  if (recepcion.length) {
    L.push('*RECEPCIÓN*')
    recepcion.forEach((o) => { const a = ag(o.agente); L.push(`Agente: ${nombreCompleto(a)}`, `LP: ${a?.lp || 'S/N'}`) })
    L.push('')
  }

  if (ausentes.length) {
    L.push('*_AUSENTES_*', '')
    ausentes.forEach((x, i) => {
      const a = ag(x.agente)
      L.push(`${i + 1}- Agente: ${nombreCompleto(a)}`, `LP: ${a?.lp || 'S/N'} (${x.motivo})`, '')
    })
  }

  L.push('*OBSERVACIONES:*', '')
  if (afectados.length) {
    L.push('', '*Personal afectado a otro sector:*')
    afectados.forEach((o) => { const a = ag(o.agente); L.push(`${nombreCompleto(a)} (LP: ${a?.lp || 'S/N'}) → ${o.destino}`) })
  } else L.push('')

  const fp = agentesEnMovil + otros.length
  const fa = ausentes.length
  const policiales = moviles.filter(({ f }) => f.ppol).length
  const motivos = {}
  ausentes.forEach((x) => { motivos[x.motivo] = (motivos[x.motivo] || 0) + 1 })

  L.push('', '               *_PARTE DIARIO:_*', '')
  L.push(`*Dotaciones en Calle:* ${pad2(moviles.length)}`)
  L.push(`*Zonas Cubiertas:* ${pad2(moviles.length)}`, '')
  L.push('*SE CUMPLE ORDEN DE SERVICIO*', 'N°: ', '')
  L.push(`*F.E*: ${pad2(fp + fa)}`, `*F.P*: ${pad2(fp)}`, `*F.A*: ${pad2(fa)}`, '')
  Object.entries(motivos).forEach(([m, n]) => L.push(`*${m}*: ${pad2(n)}`))
  L.push(`*Total personal Policial:* ${pad2(policiales)}`)
  return L.join('\n')
}

/** Líneas automáticas de observaciones para la planilla PDF */
const ABREV = { 'Carpeta médica': 'C. MÉD.', 'Vacaciones': 'VAC.', 'Ausente sin aviso': 'A.S.A.', 'Suspensión': 'SUSP.', 'Licencia': 'LIC.' }
export function observacionesPdf(dia, padron) {
  const ag = (id) => padron.find((a) => a.id === id)
  const corto = (a) => a ? `${a.apellido} ${a.nombre ? a.nombre[0] + '.' : ''}`.trim() : '?'
  const partes = []
  const aus = dia.ausentes.filter((x) => x.agente)
  if (aus.length) partes.push('AUSENTES: ' + aus.map((x) => `${corto(ag(x.agente))} LP ${ag(x.agente)?.lp || 'S/N'} (${ABREV[x.motivo] || x.motivo.toUpperCase()})`).join(' - '))
  const af = dia.otros.filter((o) => o.agente && o.tipo === 'AFECTADO')
  if (af.length) partes.push('AFECTADOS: ' + af.map((o) => `${corto(ag(o.agente))} LP ${ag(o.agente)?.lp || 'S/N'} > ${o.destino.toUpperCase()}`).join(' - '))
  const rc = dia.otros.filter((o) => o.agente && o.tipo === 'RECEPCIÓN')
  if (rc.length) partes.push('RECEPCIÓN: ' + rc.map((o) => `${corto(ag(o.agente))} LP ${ag(o.agente)?.lp || 'S/N'} (${o.hs} HS)`).join(' - '))
  if (dia.obs.trim()) partes.push(dia.obs.trim())
  return partes
}
