// Modelo del día: una lista de móviles (como el parte de WhatsApp).
// Cada móvil: { id, cam, hs, zona, agentes: [{ id, nota }], ppol }
// La ubicación en la planilla PDF se calcula sola (ver ubicar()).

export const TURNOS = ['6:00', '7:00', '8:00', '9:00']
export const MOTIVOS = ['Carpeta médica', 'Vacaciones', 'Ausente sin aviso', 'Suspensión', 'Franco', 'Licencia', 'Art. / Otro']
export const ZONAS_NUM = ['1', '2', '3', '4', '5', '5BIS', '6', '7', '8', '9', '10', '11', '12', '13', '13BIS',
  '14', '14BIS', '15', '15BIS', '16', '17', '18', '18BIS', '19', '19BIS', '20', '20BIS']
// Opciones del selector de zona (las que llevan detalle muestran un campo extra)
export const ZONAS_OPC = [...ZONAS_NUM, 'UVG', 'SUPERVISOR', 'LIBRE', 'BERMUDEZ', 'CUADRANTE', 'REFUERZO', 'QTH FIJO', 'OTRA']
export const CON_DETALLE = { REFUERZO: '¿Qué zonas? ej. 17 A 20', 'QTH FIJO': '¿Dónde? ej. MAIPÚ', OTRA: 'Escribí la zona' }

const sinAcentos = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
export const norm = (s) => sinAcentos(s).toUpperCase().replace(/[^A-Z0-9/ ]+/g, ' ').replace(/\s+/g, ' ').trim()
export const nuevoId = () => Math.random().toString(36).slice(2, 10)

/** Normaliza el texto de zona: "Refuerzo.2/3" → "REFUERZO 2/3", "5 bis" → "5BIS" */
export function normZona(z) {
  let s = sinAcentos(z).toUpperCase().replace(/[.,;:]/g, ' ').replace(/\)/g, '/').replace(/\s+/g, ' ').trim()
  s = s.replace(/(\d+)\s+BIS\b/g, '$1BIS')
  if (/^ZONA\s+/.test(s)) s = s.replace(/^ZONA\s+/, '')
  return s
}

/** Clasifica una zona: num (1..20BIS), uvg, sup, ref, qth, otra */
export function tipoZona(z) {
  const s = normZona(z)
  if (ZONAS_NUM.includes(s)) return { tipo: 'num', base: s, det: '' }
  if (s === 'UVG') return { tipo: 'uvg', base: 'UVG', det: '' }
  if (s === 'SUPERVISOR' || s === 'SUP' || s === 'LIBRE') return { tipo: 'sup', base: s === 'SUP' ? 'SUPERVISOR' : s, det: '' }
  if (s.startsWith('REFUERZO')) return { tipo: 'ref', base: 'REFUERZO', det: s.slice(8).trim() }
  if (s.startsWith('QTH')) return { tipo: 'qth', base: 'QTH FIJO', det: s.replace(/^QTH( FIJO)?/, '').trim() }
  if (s === 'BERMUDEZ' || s === 'CUADRANTE') return { tipo: 'otra', base: s, det: '' }
  return { tipo: 'otra', base: s ? 'OTRA' : '', det: s }
}

export const movilVacio = (hs) => ({ id: nuevoId(), cam: '', hs, zona: '', agentes: [{ id: '', nota: '' }], ppol: '' })

export const diaVacio = (fecha) => ({
  v: 2, fecha, supervisor: '', auxiliar: '', rotas: '', backup: '', sinAgentes: '', fueraServicio: '', obs: '',
  moviles: [], ausentes: [], otros: [],
})

/** Convierte días guardados con la versión anterior (filas fijas) al formato nuevo */
export function migrar(d) {
  if (!d || d.moviles) return d
  const moviles = []
  for (const [key, f] of Object.entries(d.filas || {})) {
    const agentes = (f.agentes || []).filter(Boolean).map((id) => ({ id, nota: '' }))
    if (!f.cam && !agentes.length) continue
    let zona = ''
    if (key.startsWith('Z')) zona = key.slice(1).toUpperCase()
    else if (key.startsWith('UVG')) zona = 'UVG'
    else if (key.startsWith('SUP')) zona = f.zonaTxt || 'SUPERVISOR'
    else if (key === 'REF') zona = 'REFUERZO ' + (f.zonaTxt || '')
    else if (key.startsWith('X')) zona = f.zonaTxt || ''
    else if (key.startsWith('QTH')) zona = f.zonas ? 'REFUERZO ' + f.zonas : 'QTH FIJO'
    else if (key.startsWith('RFZ')) zona = 'REFUERZO ' + (f.zonas || '')
    moviles.push({ id: nuevoId(), cam: f.cam || '', hs: f.hs || '', zona: normZona(zona), agentes: agentes.length ? agentes : [{ id: '', nota: '' }], ppol: f.ppol || '' })
  }
  const { filas, ...resto } = d
  return { ...diaVacio(d.fecha), ...resto, v: 2, moviles }
}

export const nombreCompleto = (a) => a ? `${a.apellido} ${a.nombre}`.trim() : ''
export const pad2 = (n) => String(n).padStart(2, '0')
export const fechaLarga = (iso) => { const [y, m, d] = iso.split('-'); return `${+d}/${+m}/${y}` }
export const fechaCorta = (iso) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }
const hora2 = (hs) => pad2(hs.split(':')[0]) + ':00'
const finTurno = (hs) => pad2((+hs.split(':')[0] + 12) % 24) + ':00'
const esAdicional = (ag) => /ADICIONAL/i.test(ag.nota || '')
export const sinPersonal = (pp) => !pp || /^\s*(sin personal|s\/?n|-)\s*$/i.test(pp)

export const movilUsado = (m) => !!(m.cam || m.agentes.some((a) => a.id))

// ---------------------------------------------------------------------------
// Ubicación automática en la planilla PDF
// ---------------------------------------------------------------------------
// Lugares de la plantilla. fila = índice de fila de la grilla; lado L/R
const L = (fila, extra = {}) => ({ lado: 'L', fila, ...extra })
const R = (fila, extra = {}) => ({ lado: 'R', fila, ...extra })
const LUGARES = {
  num: Object.fromEntries(ZONAS_NUM.map((z, i) => [z, L(i)])),
  uvg: [L(27), L(28)],
  sup: [L(29), L(30)],
  refDer: [R(4, { col: 'zonas' }), R(5, { col: 'zonas' }), R(6, { col: 'zonas' })],
  qth: [R(1, { col: 'zonas' }), R(2, { col: 'zonas' })],
  refIzq: [L(31, { conZona: true })],
  zona: [L(32, { conZona: true }), L(33, { conZona: true }), L(34, { conZona: true })],
  abajo: [27, 28, 29, 30, 31].map((f) => R(f, { col: 'hs', conZona: true })),
}

/** Devuelve [{ lugar, m }] y la lista de móviles que no entraron en la plantilla */
export function ubicar(dia) {
  const usados = new Set()
  const libre = (lista) => lista.find((l) => !usados.has(l))
  const out = [], sinLugar = []
  const poner = (m, ...listas) => {
    for (const lista of listas) { const l = libre(lista); if (l) { usados.add(l); out.push({ lugar: l, m }); return } }
    sinLugar.push(m)
  }
  const moviles = [...dia.moviles].filter(movilUsado)
    .sort((a, b) => TURNOS.indexOf(a.hs) - TURNOS.indexOf(b.hs))
  const pendientes = []
  // 1° pasada: cada zona numerada a su fila (la primera que llega)
  for (const m of moviles) {
    const t = tipoZona(m.zona)
    if (t.tipo === 'num' && !usados.has(LUGARES.num[t.base])) { usados.add(LUGARES.num[t.base]); out.push({ lugar: LUGARES.num[t.base], m }) }
    else pendientes.push(m)
  }
  const resto = [LUGARES.zona, LUGARES.abajo]
  for (const m of pendientes) {
    const t = tipoZona(m.zona)
    if (t.tipo === 'uvg') poner(m, LUGARES.uvg, ...resto)
    else if (t.tipo === 'sup') poner(m, LUGARES.sup, ...resto)
    else if (t.tipo === 'ref') poner(m, LUGARES.refDer, LUGARES.refIzq, ...resto)
    else if (t.tipo === 'qth') poner(m, LUGARES.qth, ...resto)
    else poner(m, ...resto, LUGARES.refIzq) // 2° móvil en una zona, BERMUDEZ, CUADRANTE, etc.
  }
  return { ubicados: out, sinLugar }
}

// ---------------------------------------------------------------------------
// Resumen y avisos
// ---------------------------------------------------------------------------
export function resumen(dia) {
  const ms = dia.moviles.filter(movilUsado)
  const porHora = Object.fromEntries(TURNOS.map((t) => [t, ms.filter((m) => m.hs === t && m.cam).map((m) => m.cam)]))
  const cubiertas = new Set(ms.map((m) => tipoZona(m.zona)).filter((t) => t.tipo === 'num').map((t) => t.base))
  const sinAgente = ZONAS_NUM.filter((z) => !cubiertas.has(z))
  const cams = ms.map((m) => m.cam).filter(Boolean)
  const camsRepetidas = [...new Set(cams.filter((c, i) => cams.indexOf(c) !== i))]
  const ids = ms.flatMap((m) => m.agentes.map((a) => a.id).filter(Boolean))
  const agentesRepetidos = [...new Set(ids.filter((c, i) => ids.indexOf(c) !== i))]
  const sinZona = ms.filter((m) => !m.zona).map((m) => m.cam || '?')
  const { sinLugar } = ubicar(dia)
  return { enCalle: ms.length, porHora, sinAgente, camsRepetidas, agentesRepetidos, sinZona, sinLugar: sinLugar.map((m) => m.cam || '?') }
}

// ---------------------------------------------------------------------------
// Parte de WhatsApp
// ---------------------------------------------------------------------------
export function parteWhatsApp(dia, padron, hs) {
  const ag = (id) => padron.find((a) => a.id === id)
  const moviles = dia.moviles.filter((m) => m.hs === hs && movilUsado(m))
  const otros = dia.otros.filter((o) => o.hs === hs && o.agente)
  const ausentes = dia.ausentes.filter((a) => a.hs === hs && a.agente)
  const recepcion = otros.filter((o) => o.tipo === 'RECEPCIÓN')
  const afectados = otros.filter((o) => o.tipo === 'AFECTADO')

  const T = []
  T.push('_*Dirección General de Operaciones al Cuerpo de Patrulla Vicente López*_', '')
  T.push('*PARTE SALIDA DE MÓVILES*', '')
  T.push(`*SUPERVISOR:* _*${dia.supervisor.toUpperCase()}*_`)
  T.push(`*AUXILIAR:* _${dia.auxiliar.toUpperCase()}_`, '')
  T.push(`*FECHA:* ${fechaLarga(dia.fecha)}`)
  T.push('*HORARIO:* ', `${hora2(hs)} A ${finTurno(hs)} Hs`, '')

  let fp = 0
  moviles.forEach((m, i) => {
    T.push(`${pad2(i + 1)}- *Movil ${m.cam || 'S/N'}/Zona ${normZona(m.zona) || 'S/Z'}*`)
    m.agentes.filter((x) => x.id).forEach((x) => {
      const a = ag(x.id)
      if (!esAdicional(x)) fp++
      T.push(`Agente: ${nombreCompleto(a)}${x.nota ? ` (${x.nota})` : ''}`, `LP: ${a?.lp || 'S/N'}`)
    })
    T.push(`Of.Policia: ${sinPersonal(m.ppol) ? 'Sin personal' : m.ppol}`, '')
  })

  if (recepcion.length) {
    T.push('*RECEPCIÓN*')
    recepcion.forEach((o) => { const a = ag(o.agente); T.push(`Agente: ${nombreCompleto(a)}`, `LP: ${a?.lp || 'S/N'}`) })
    T.push('')
  }
  if (ausentes.length) {
    T.push('*_AUSENTES_*', '')
    ausentes.forEach((x, i) => { const a = ag(x.agente); T.push(`${i + 1}- Agente: ${nombreCompleto(a)}`, `LP: ${a?.lp || 'S/N'} (${x.motivo})`, '') })
  }
  T.push('*OBSERVACIONES:*', '')
  if (afectados.length) {
    T.push('', '*Personal afectado a otro sector:*')
    afectados.forEach((o) => { const a = ag(o.agente); T.push(`${nombreCompleto(a)} (LP: ${a?.lp || 'S/N'}) → ${o.destino}`) })
  } else T.push('')

  fp += otros.length
  const fa = ausentes.length
  const motivos = {}
  ausentes.forEach((x) => { motivos[x.motivo] = (motivos[x.motivo] || 0) + 1 })
  T.push('', '               *_PARTE DIARIO:_*', '')
  T.push(`*Dotaciones en Calle:* ${pad2(moviles.length)}`, `*Zonas Cubiertas:* ${pad2(moviles.length)}`, '')
  T.push('*SE CUMPLE ORDEN DE SERVICIO*', 'N°: ', '')
  T.push(`*F.E*: ${pad2(fp + fa)}`, `*F.P*: ${pad2(fp)}`, `*F.A*: ${pad2(fa)}`, '')
  Object.entries(motivos).forEach(([mo, n]) => T.push(`*${mo}*: ${pad2(n)}`))
  T.push(`*Total personal Policial:* ${pad2(moviles.filter((m) => !sinPersonal(m.ppol)).length)}`)
  return T.join('\n')
}

const ABREV = { 'Carpeta médica': 'C. MÉD.', 'Vacaciones': 'VAC.', 'Ausente sin aviso': 'A.S.A.', 'Suspensión': 'SUSP.', 'Licencia': 'LIC.' }
export function observacionesPdf(dia, padron) {
  const ag = (id) => padron.find((a) => a.id === id)
  const corto = (a) => a ? `${a.apellido} ${a.nombre ? a.nombre[0] + '.' : ''}`.trim() : '?'
  const lp = (id) => ag(id)?.lp || 'S/N'
  const partes = []
  const aus = dia.ausentes.filter((x) => x.agente)
  if (aus.length) partes.push('AUSENTES: ' + aus.map((x) => `${corto(ag(x.agente))} LP ${lp(x.agente)} (${ABREV[x.motivo] || x.motivo.toUpperCase()})`).join(' - '))
  const af = dia.otros.filter((o) => o.agente && o.tipo === 'AFECTADO')
  if (af.length) partes.push('AFECTADOS: ' + af.map((o) => `${corto(ag(o.agente))} LP ${lp(o.agente)} > ${o.destino.toUpperCase()}`).join(' - '))
  const rc = dia.otros.filter((o) => o.agente && o.tipo === 'RECEPCIÓN')
  if (rc.length) partes.push('RECEPCIÓN: ' + rc.map((o) => `${corto(ag(o.agente))} LP ${lp(o.agente)} (${o.hs} HS)`).join(' - '))
  const adic = dia.moviles.flatMap((m) => m.agentes.filter((x) => x.id && x.nota).map((x) => `${corto(ag(x.id))} (${x.nota.toUpperCase()}, MÓVIL ${m.cam})`))
  if (adic.length) partes.push(adic.join(' - '))
  if (dia.obs.trim()) partes.push(dia.obs.trim())
  return partes
}

// ---------------------------------------------------------------------------
// Buscador de móviles: "medina", "56", "zona 10", "movil 56", "flavia medina cam 56 zona 10"
// Todas las palabras tienen que coincidir con algo del móvil.
// ---------------------------------------------------------------------------
const CLAVE_ZONA = ['ZONA', 'Z']
const CLAVE_MOVIL = ['MOVIL', 'MOVILES', 'CAM', 'CAMIONETA', 'M']
export function coincideMovil(m, padron, q) {
  const pal = norm(q).replace(/\//g, ' ').split(' ').filter(Boolean)
  if (!pal.length) return true
  const z = normZona(m.zona)
  const zonaTokens = z.split(/[\s/]+/).filter(Boolean)
  const ags = m.agentes.map((x) => padron.find((a) => a.id === x.id)).filter(Boolean)
  const nombres = ags.flatMap((a) => norm(`${a.apellido} ${a.nombre}`).split(' '))
  const lps = ags.map((a) => a.lp).filter(Boolean)
  const textos = [...nombres, ...zonaTokens, ...norm(m.ppol).split(' ')].filter(Boolean)
  const zonaIgual = (v) => z === v || z === v.replace(/BIS$/, '') + 'BIS' && v.endsWith('BIS') || zonaTokens.includes(v)

  for (let i = 0; i < pal.length; i++) {
    const p = pal[i], sig = pal[i + 1]
    if (CLAVE_ZONA.includes(p) && sig) { // "zona 10", "zona 5 bis"
      let v = sig; if (pal[i + 2] === 'BIS') { v += 'BIS'; i++ }
      if (!zonaIgual(v)) return false
      i++; continue
    }
    if (CLAVE_MOVIL.includes(p) && sig && /^\d+$/.test(sig)) { if (m.cam !== sig) return false; i++; continue }
    if (/^\d+$/.test(p)) { // número suelto: móvil, zona o LP
      if (m.cam === p || zonaIgual(p) || (p.length >= 3 && lps.some((lp) => lp.startsWith(p)))) continue
      return false
    }
    if (p === 'BIS' && /BIS/.test(z)) continue
    if (textos.some((t) => t.startsWith(p))) continue
    return false
  }
  return true
}
