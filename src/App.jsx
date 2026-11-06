import { useEffect, useMemo, useState } from 'react'
import Pegar from './components/Pegar'
import Moviles from './components/Moviles'
import Extras from './components/Extras'
import Partes from './components/Partes'
import Padron from './components/Padron'
import { diaVacio, resumen as calcResumen, nombreCompleto, fechaLarga, nuevoId, movilUsado } from './logic'
import { parsearPartes, resolverPersonas, aplicarParte } from './parser'
import { cargarPadron, guardarPadron, cargarDia, guardarDia, fechasGuardadas, historial } from './storage'

const hoy = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10) }
const TABS = [
  ['pegar', 'Pegar parte', 'Pegar'],
  ['moviles', 'Móviles', 'Móviles'],
  ['otros', 'Ausentes y otros', 'Otros'],
  ['partes', 'Partes WhatsApp', 'Partes'],
  ['padron', 'Padrón', 'Padrón'],
]

export default function App() {
  const [padron, setPadronState] = useState(cargarPadron)
  const [fecha, setFecha] = useState(hoy)
  const [dia, setDiaState] = useState(() => cargarDia(hoy()) || diaVacio(hoy()))
  const [tab, setTab] = useState(() => ((cargarDia(hoy())?.moviles || []).length ? 'moviles' : 'pegar'))
  const [generando, setGenerando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [escribiendo, setEscribiendo] = useState(false)

  useEffect(() => { setDiaState(cargarDia(fecha) || diaVacio(fecha)) }, [fecha])

  // Mientras se escribe (teclado abierto en el celular) se oculta el botón fijo de abajo para que no tape nada
  useEffect(() => {
    const campo = (e) => e.target.matches?.('input:not([type=checkbox]):not([type=date]), textarea')
    const on = (e) => campo(e) && setEscribiendo(true)
    const off = (e) => campo(e) && setTimeout(() => {
      if (!document.activeElement?.matches?.('input:not([type=checkbox]):not([type=date]), textarea')) setEscribiendo(false)
    }, 100)
    document.addEventListener('focusin', on); document.addEventListener('focusout', off)
    return () => { document.removeEventListener('focusin', on); document.removeEventListener('focusout', off) }
  }, [])

  const setPadron = (p) => { setPadronState(p); guardarPadron(p) }
  const setDia = (fn) => setDiaState((d) => { const n = fn(d); guardarDia(n); return n })
  const set = (patch) => setDia((d) => ({ ...d, ...patch }))

  const resumen = useMemo(() => calcResumen(dia), [dia])
  const hist = useMemo(() => historial(fecha), [fecha])

  // Alta rápida desde cualquier buscador: "PEREZ JUAN" → pide el LP
  const onNuevo = (txt, elegir) => {
    const partes = txt.trim().toUpperCase().split(/\s+/)
    const lp = prompt(`LP de ${partes.join(' ')} (dejalo vacío si no tiene):`)
    if (lp === null) return
    const a = { id: nuevoId(), apellido: partes[0], nombre: partes.slice(1).join(' '), lp: lp.trim() }
    setPadron([...cargarPadron(), a]); elegir(a.id)
  }

  // Cargar desde el texto del parte de WhatsApp
  const leerParte = (texto) => {
    const res = parsearPartes(texto)
    if (!res.moviles.length && !res.ausentes.length) {
      setResultado({ ok: false, lineas: ['No encontré ningún móvil en el texto. Fijate de copiar el parte completo, desde "PARTE SALIDA DE MÓVILES".'] })
      return false
    }
    let destino = fecha
    if (res.fecha && res.fecha !== fecha) {
      if (confirm(`El parte es del ${fechaLarga(res.fecha)} y en la app estás en el ${fechaLarga(fecha)}.\n\n¿Cargarlo en el ${fechaLarga(res.fecha)}?`)) destino = res.fecha
    }
    const r = resolverPersonas(res, cargarPadron())
    const base = destino === fecha ? dia : (cargarDia(destino) || diaVacio(destino))
    const nuevoDia = aplicarParte({ ...base, fecha: destino }, res, r)
    setPadron(r.padron)
    guardarDia(nuevoDia)
    if (destino !== fecha) setFecha(destino)
    setDiaState(nuevoDia)

    const turnos = [...res.turnos].map((t) => t.padStart(5, '0')).join(', ')
    const lineas = [
      `${r.moviles.length} móviles cargados${turnos ? ` (turnos ${turnos})` : ''} para el ${fechaLarga(destino)}.`,
      r.ausentes.length && `${r.ausentes.length} ausentes.`,
      r.otros.length && `${r.otros.length} en recepción / otro sector.`,
      r.nuevos.length && `Agentes nuevos agregados al padrón: ${r.nuevos.map((a) => nombreCompleto(a) + (a.lp ? '' : ' (sin LP)')).join(', ')}.`,
      r.actualizados.length && `Se completó el LP de: ${r.actualizados.map(nombreCompleto).join(', ')}.`,
      res.moviles.some((m) => !m.hs) && '⚠ Algún móvil vino sin horario: revisalo en Móviles.',
      res.noLeidas.length && `⚠ Estas líneas no las entendí (revisalas a mano): ${res.noLeidas.slice(0, 5).join(' / ')}`,
      'Si volvés a pegar un turno, reemplaza lo que había cargado de ese turno.',
    ].filter(Boolean)
    setResultado({ ok: true, lineas })
    return true
  }

  const anterior = fechasGuardadas().filter((f) => f < fecha).pop()
  const copiarAnterior = () => {
    const prev = cargarDia(anterior)
    if (dia.moviles.some(movilUsado) && !confirm('Esto reemplaza los móviles cargados hoy. ¿Seguir?')) return
    set({
      moviles: prev.moviles.map((m) => ({ ...m, id: nuevoId() })), supervisor: prev.supervisor, auxiliar: prev.auxiliar,
      backup: prev.backup, fueraServicio: prev.fueraServicio,
      otros: prev.otros.filter((o) => o.tipo === 'RECEPCIÓN'),
    })
    setTab('moviles')
  }

  const limpiar = () => confirm('¿Borrar todo lo cargado en este día?') && setDia(() => diaVacio(fecha))

  const generar = async () => {
    if (resumen.sinLugar.length && !confirm(`Los móviles ${resumen.sinLugar.join(', ')} no entran en la planilla (no quedan filas libres). ¿Generar igual?`)) return
    setGenerando(true)
    try { const { descargarPdf } = await import('./pdf'); await descargarPdf(dia, padron) } catch (e) { alert('No se pudo generar el PDF: ' + e.message) }
    setGenerando(false)
  }

  const avisos = [
    resumen.camsRepetidas.length && `Móvil repetido: ${resumen.camsRepetidas.join(', ')}`,
    resumen.agentesRepetidos.length && `Agente en dos móviles: ${resumen.agentesRepetidos.map((id) => nombreCompleto(padron.find((a) => a.id === id))).join(', ')}`,
    resumen.sinZona.length && `Móvil sin zona: ${resumen.sinZona.join(', ')}`,
    resumen.sinLugar.length && `No entran en la planilla: ${resumen.sinLugar.join(', ')}`,
    resumen.enCalle > 0 && resumen.sinAgente.length && (resumen.sinAgente.length > 6 ? `${resumen.sinAgente.length} zonas sin cubrir` : `Zonas sin cubrir: ${resumen.sinAgente.join(', ')}`),
  ].filter(Boolean)

  return (
    <div className={`app tab-${tab}` + (escribiendo ? ' escribiendo' : '')}>
      <header className="top">
        <div className="marca">
          <h1>Salida de Móviles</h1>
          <span>Cuerpo de Patrulla · Vicente López</span>
        </div>
        <div className="datos">
          <label>Fecha<input type="date" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} /></label>
          <label>Supervisor<input list="lista-nombres" value={dia.supervisor} onChange={(e) => set({ supervisor: e.target.value.toUpperCase() })} /></label>
          <label>Auxiliar<input list="lista-nombres" value={dia.auxiliar} onChange={(e) => set({ auxiliar: e.target.value.toUpperCase() })} /></label>
          <datalist id="lista-nombres">{padron.map((a) => <option key={a.id} value={nombreCompleto(a)} />)}</datalist>
        </div>
        <div className="acciones">
          {anterior && <button onClick={copiarAnterior} title={`Copia los móviles del ${anterior}`}>Copiar día anterior</button>}
          <button onClick={limpiar} className="secundario">Borrar día</button>
          <a className="btn secundario" href="/logout" title="Cerrar sesión">Salir</a>
          <button className="primario generar" onClick={generar} disabled={generando}>{generando ? 'Generando…' : '📄 Generar planilla PDF'}</button>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map(([k, l, corto]) => (
          <button key={k} className={tab === k ? 'activo' : ''} onClick={() => setTab(k)}>
            <span className="largo">{l}</span><span className="corto">{corto}</span>
            {k === 'moviles' && resumen.enCalle ? <em className="badge">{resumen.enCalle}</em> : null}
          </button>
        ))}
      </nav>

      {avisos.length > 0 && (tab === 'moviles' || tab === 'pegar') && (
        <div className="avisos">{avisos.map((a) => <span key={a}>⚠ {a}</span>)}</div>
      )}

      <main>
        {tab === 'pegar' && <Pegar onLeer={leerParte} resultado={resultado} irAMoviles={() => setTab('moviles')} />}
        {tab === 'moviles' && <Moviles dia={dia} setDia={setDia} padron={padron} onNuevo={onNuevo} hist={hist} resumen={resumen} />}
        {tab === 'otros' && <Extras dia={dia} set={set} padron={padron} onNuevo={onNuevo} />}
        {tab === 'partes' && <Partes dia={dia} padron={padron} />}
        {tab === 'padron' && <Padron padron={padron} setPadron={setPadron} onImportado={() => { setPadronState(cargarPadron()); setDiaState(cargarDia(fecha) || diaVacio(fecha)) }} />}
      </main>
    </div>
  )
}
