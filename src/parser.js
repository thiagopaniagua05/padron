// Lee uno o varios partes de WhatsApp pegados y los convierte en datos del día.
// Es tolerante: no importa si vienen con asteriscos, guiones bajos, espacios de más,
// "Móvil" o "Movil", "Zona REFUERZO.2/3", nombres con coma ("VALLADARES,GINO"), etc.
import { MOTIVOS, TURNOS, norm, normZona, nuevoId, movilVacio } from './logic.js'

const limpiar = (l) => l.replace(/[*_~`]/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim()

function separarNombre(txt) {
  const m = txt.match(/\(([^)]*)\)/)
  const nota = m ? m[1].trim() : ''
  const nombre = txt.replace(/\([^)]*\)/g, ' ').replace(/,/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase()
  return { nombre, nota }
}

const motivoNormal = (m) => MOTIVOS.find((x) => norm(x) === norm(m)) || (m ? m.charAt(0).toUpperCase() + m.slice(1) : 'Art. / Otro')

function horaDe(linea) {
  const m = linea.match(/\b(\d{1,2})\s*[:.]\s*\d{2}\s*(?:A|-|HS)/i) || linea.match(/^(\d{1,2})\s*(?:HS|A\b)/i)
  if (!m) return null
  const hs = `${+m[1]}:00`
  return TURNOS.includes(hs) ? hs : null
}

export function parsearPartes(texto) {
  const res = { fecha: null, supervisor: '', auxiliar: '', moviles: [], ausentes: [], otros: [], obs: [], turnos: new Set(), noLeidas: [] }
  let hs = null, seccion = 'moviles', movil = null, persona = null, esperoHora = false

  for (const crudo of texto.split(/\r?\n/)) {
    const l = limpiar(crudo)
    if (!l) continue
    const u = norm(l)
    let m

    if (/^SUPERVISOR\b/.test(u) && (m = l.match(/:\s*(.+)$/))) { res.supervisor = m[1].trim().toUpperCase(); continue }
    if (/^AUXILIAR\b/.test(u) && (m = l.match(/:\s*(.+)$/))) { res.auxiliar = m[1].trim().toUpperCase(); continue }
    if (/^FECHA\b/.test(u)) {
      if ((m = l.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/))) {
        const y = m[3].length === 2 ? '20' + m[3] : m[3]
        res.fecha = `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
      }
      continue
    }
    if (/^HORARIO\b/.test(u)) { const h = horaDe(l.replace(/^[^:]*:/, '')); if (h) { hs = h; res.turnos.add(h) } else esperoHora = true; seccion = 'moviles'; movil = null; continue }
    if (esperoHora) { const h = horaDe(l); esperoHora = false; if (h) { hs = h; res.turnos.add(h); continue } }
    if (/PARTE SALIDA|DIRECCION GENERAL/.test(u)) { seccion = 'moviles'; movil = null; continue }
    if (/^PARTE DIARIO/.test(u)) { seccion = 'fin'; continue }
    if (seccion === 'fin') continue // totales: se recalculan solos

    // Encabezado de móvil: "01- Movil 76/Zona LIBRE", "Móvil N° 74 - Zona 1", etc.
    if ((m = l.match(/M[oó]vil\s*(?:N\s*[°º.]?\s*)?(\d+)(.*)$/i))) {
      const zm = m[2].match(/zona\s*[:\-]?\s*(.*)$/i)
      movil = { ...movilVacio(hs || ''), cam: m[1], zona: normZona(zm ? zm[1] : m[2].replace(/^[\s/\-–]+/, '')), agentes: [] }
      res.moviles.push(movil); seccion = 'moviles'; persona = null
      continue
    }
    if (/^RECEPCION\b/.test(u)) { seccion = 'recepcion'; persona = null; continue }
    if (/^AUSENTES?\b/.test(u)) { seccion = 'ausentes'; persona = null; continue }
    if (/^PERSONAL AFECTADO/.test(u)) { seccion = 'afectados'; continue }
    if (/^OBSERVACIONES?\b/.test(u)) {
      seccion = 'obs'; const resto = l.replace(/^[^:]*:?/, '').trim(); if (resto) res.obs.push(resto); continue
    }

    if ((m = l.match(/^(?:\d+\s*[-.)]\s*)?Agente\s*:?\s*(.*)$/i))) {
      const { nombre, nota } = separarNombre(m[1])
      persona = { nombre, nota, lp: '' }
      if (seccion === 'moviles' && movil) movil.agentes.push(persona)
      else if (seccion === 'recepcion') res.otros.push({ persona, hs, tipo: 'RECEPCIÓN', destino: '' })
      else if (seccion === 'ausentes') res.ausentes.push({ persona, hs, motivo: 'Art. / Otro' })
      else res.noLeidas.push(l)
      continue
    }
    if ((m = l.match(/^L\.?\s*P\.?\s*:?\s*(.*)$/i)) && persona) {
      const lp = (m[1].match(/\d{3,}/) || [''])[0]
      persona.lp = lp
      const mot = m[1].match(/\(([^)]*)\)/)
      if (mot && seccion === 'ausentes') res.ausentes[res.ausentes.length - 1].motivo = motivoNormal(mot[1].trim())
      continue
    }
    if ((m = l.match(/^Of(?:icial)?\.?\s*(?:de\s*)?Polic[ií]a\s*:?\s*(.*)$/i))) {
      if (movil) movil.ppol = /^sin personal$/i.test(m[1].trim()) ? '' : m[1].trim()
      continue
    }
    if (seccion === 'afectados' && (m = l.match(/^(.+?)\s*\(\s*LP\s*:?\s*([^)]*)\)\s*(?:→|->|>|-|:)?\s*(.*)$/i))) {
      const { nombre } = separarNombre(m[1])
      res.otros.push({ persona: { nombre, nota: '', lp: (m[2].match(/\d+/) || [''])[0] }, hs, tipo: 'AFECTADO', destino: m[3].trim() })
      continue
    }
    if (seccion === 'obs' || seccion === 'afectados') { res.obs.push(l); continue }
    res.noLeidas.push(l)
  }
  res.moviles.forEach((mv) => { if (!mv.agentes.length) mv.agentes = [{ nombre: '', nota: '', lp: '' }] })
  return res
}

/** Busca cada persona en el padrón (por LP o por nombre). Si no está, la agrega. */
export function resolverPersonas(res, padron) {
  const nuevoPadron = [...padron]
  const nuevos = [], actualizados = []
  const clave = (s) => norm(s).split(' ').sort().join(' ')

  const buscar = ({ nombre, lp }) => {
    if (!nombre && !lp) return ''
    let a = lp && nuevoPadron.find((x) => x.lp === lp)
    if (!a && nombre) a = nuevoPadron.find((x) => clave(`${x.apellido} ${x.nombre}`) === clave(nombre))
    if (!a && nombre) {
      // Coincidencia parcial: todas las palabras del padrón están en el nombre del parte (ej. falta un 2° nombre)
      const pal = new Set(norm(nombre).split(' '))
      const cand = nuevoPadron.filter((x) => norm(`${x.apellido} ${x.nombre}`).split(' ').every((p) => pal.has(p)))
      if (cand.length === 1) a = cand[0]
    }
    if (a) {
      if (lp && !a.lp) { const i = nuevoPadron.indexOf(a); nuevoPadron[i] = { ...a, lp }; actualizados.push(nuevoPadron[i]); return a.id }
      return a.id
    }
    const [ap, ...resto] = nombre.split(' ')
    const n = { id: nuevoId(), apellido: ap || nombre, nombre: resto.join(' '), lp: lp || '' }
    nuevoPadron.push(n); nuevos.push(n)
    return n.id
  }

  const moviles = res.moviles.map((m) => ({
    ...m, agentes: m.agentes.map((p) => ({ id: buscar(p), nota: p.nota || '' })),
  }))
  const ausentes = res.ausentes.map((x) => ({ agente: buscar(x.persona), hs: x.hs || '', motivo: x.motivo }))
  const otros = res.otros.map((x) => ({ agente: buscar(x.persona), hs: x.hs || '', tipo: x.tipo, destino: x.destino }))
  return { moviles, ausentes, otros, padron: nuevoPadron, nuevos, actualizados }
}

/** Mezcla lo leído en el día: reemplaza los turnos que vinieron en el texto y deja los demás como estaban */
export function aplicarParte(dia, res, resueltos) {
  const turnos = new Set([...res.turnos, ...resueltos.moviles.map((m) => m.hs)])
  const fuera = (x) => !turnos.has(x.hs)
  const obs = res.obs.filter((o) => !norm(o).startsWith('PERSONAL AFECTADO')).join(' ')
  return {
    ...dia,
    supervisor: res.supervisor || dia.supervisor,
    auxiliar: res.auxiliar || dia.auxiliar,
    moviles: [...dia.moviles.filter(fuera), ...resueltos.moviles],
    ausentes: [...dia.ausentes.filter(fuera), ...resueltos.ausentes],
    otros: [...dia.otros.filter(fuera), ...resueltos.otros],
    obs: obs && !dia.obs.includes(obs) ? [dia.obs, obs].filter(Boolean).join(' ').trim() : dia.obs,
  }
}
