import { migrar } from './logic.js'

// Guardado local en el navegador. Para compartir entre dispositivos: Exportar / Importar backup.
const K = { padron: 'sm:padron', dia: (f) => 'sm:dia:' + f }

const leer = (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def } catch { return def } }
const escribir = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* sin espacio / bloqueado */ } }

export const cargarPadron = () => leer(K.padron, [])
export const guardarPadron = (p) => escribir(K.padron, p)
export const cargarDia = (fecha) => migrar(leer(K.dia(fecha), null))
export const guardarDia = (d) => escribir(K.dia(d.fecha), d)

export function fechasGuardadas() {
  const out = []
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('sm:dia:')) out.push(k.slice(7)) } } catch { /* nada */ }
  return out.sort()
}

export function exportarTodo() {
  const dias = Object.fromEntries(fechasGuardadas().map((f) => [f, cargarDia(f)]))
  return { version: 1, exportado: new Date().toISOString(), padron: cargarPadron(), dias }
}

export function importarTodo(data) {
  if (Array.isArray(data)) { guardarPadron(data); return } // archivo con solo el padrón
  if (data.padron) guardarPadron(data.padron)
  Object.values(data.dias || {}).forEach((d) => d?.fecha && guardarDia(d))
}

export { nuevoId } from './logic.js'

/** Última asignación conocida (días anteriores a `fecha`): agente → {cam, zona} y móvil → zona */
export function historial(fecha) {
  const agentes = {}, cams = {}
  for (const f of fechasGuardadas().filter((x) => x < fecha)) {
    const d = cargarDia(f); if (!d) continue
    for (const m of d.moviles || []) {
      if (m.cam && m.zona) cams[m.cam] = m.zona
      m.agentes.forEach((a, i) => { if (a.id && i === 0) agentes[a.id] = { cam: m.cam || '', zona: m.zona || '' } })
    }
  }
  return { agentes, cams }
}
