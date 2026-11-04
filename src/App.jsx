import { useEffect, useMemo, useState } from 'react'
import Planilla from './components/Planilla'
import Extras from './components/Extras'
import Partes from './components/Partes'
import Padron from './components/Padron'
import { diaVacio, resumen as calcResumen, nombreCompleto } from './logic'
import { cargarPadron, guardarPadron, cargarDia, guardarDia, fechasGuardadas, nuevoId, historial } from './storage'

const hoy = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10) }
const TABS = [['planilla', 'Planilla', 'Planilla'], ['extras', 'Ausentes y otros', 'Ausentes'], ['partes', 'Partes WhatsApp', 'WhatsApp'], ['padron', 'Padrón', 'Padrón']]

export default function App() {
  const [padron, setPadronState] = useState(cargarPadron)
  const [fecha, setFecha] = useState(hoy)
  const [dia, setDiaState] = useState(() => cargarDia(hoy()) || diaVacio(hoy()))
  const [tab, setTab] = useState('planilla')
  const [generando, setGenerando] = useState(false)

  useEffect(() => { setDiaState(cargarDia(fecha) || diaVacio(fecha)) }, [fecha])

  const setPadron = (p) => { setPadronState(p); guardarPadron(p) }
  const setDia = (fn) => setDiaState((d) => { const n = fn(d); guardarDia(n); return n })
  const set = (patch) => setDia((d) => ({ ...d, ...patch }))
  const setFila = (key, patch) => setDia((d) => ({ ...d, filas: { ...d.filas, [key]: { ...(d.filas[key] || {}), ...patch } } }))

  const resumen = useMemo(() => calcResumen(dia), [dia])
  const hist = useMemo(() => historial(fecha), [fecha])

  // Alta rápida desde cualquier selector: "PEREZ JUAN" → pide el LP
  const onNuevo = (txt, elegir) => {
    const partes = txt.trim().toUpperCase().split(/\s+/)
    const lp = prompt(`LP de ${partes.join(' ')} (vacío si no tiene):`)
    if (lp === null) return
    const a = { id: nuevoId(), apellido: partes[0], nombre: partes.slice(1).join(' '), lp: lp.trim() }
    setPadron([...padron, a]); elegir(a.id)
  }

  const anterior = fechasGuardadas().filter((f) => f < fecha).pop()
  const copiarAnterior = () => {
    const prev = cargarDia(anterior)
    const ocupado = Object.keys(dia.filas).length
    if (ocupado && !confirm('Esto reemplaza lo cargado en la planilla de hoy. ¿Seguir?')) return
    set({
      filas: prev.filas, supervisor: prev.supervisor, auxiliar: prev.auxiliar,
      backup: prev.backup, fueraServicio: prev.fueraServicio,
      otros: prev.otros.filter((o) => o.tipo === 'RECEPCIÓN'),
    })
  }

  const limpiar = () => confirm('¿Borrar todo lo cargado en este día?') && setDia(() => diaVacio(fecha))

  const generar = async () => {
    setGenerando(true)
    try { const { descargarPdf } = await import('./pdf'); await descargarPdf(dia, padron) } catch (e) { alert('No se pudo generar el PDF: ' + e.message) }
    setGenerando(false)
  }

  const avisos = [
    resumen.camsRepetidas.length && `Móvil repetido: ${resumen.camsRepetidas.join(', ')}`,
    resumen.agentesRepetidos.length && `Agente en dos móviles: ${resumen.agentesRepetidos.map((id) => nombreCompleto(padron.find((a) => a.id === id))).join(', ')}`,
    resumen.sinHora.length && `Sin horario: ${resumen.sinHora.join(', ')}`,
    resumen.enCalle > 0 && resumen.sinAgente.length && (resumen.sinAgente.length > 6 ? `${resumen.sinAgente.length} zonas sin cubrir` : `Zonas sin cubrir: ${resumen.sinAgente.join(', ')}`),
  ].filter(Boolean)

  return (
    <div className="app">
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
          {anterior && <button onClick={copiarAnterior} title={`Copia móviles y zonas del ${anterior}`}>Copiar día anterior</button>}
          <button onClick={limpiar} className="secundario">Limpiar</button>
          <a className="btn secundario" href="/logout" title="Cerrar sesión">Salir</a>
          <button className="primario" onClick={generar} disabled={generando}>{generando ? 'Generando…' : 'Generar PDF'}</button>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map(([k, l, corto]) => (
          <button key={k} className={tab === k ? 'activo' : ''} onClick={() => setTab(k)}>
            <span className="largo">{l}</span><span className="corto">{corto}</span>{k === 'extras' && dia.ausentes.length + dia.otros.length ? ` (${dia.ausentes.length + dia.otros.length})` : ''}
          </button>
        ))}
        <span className="contador">{resumen.enCalle} en calle</span>
      </nav>

      {avisos.length > 0 && tab !== 'padron' && (
        <div className="avisos">{avisos.map((a) => <span key={a}>⚠ {a}</span>)}</div>
      )}

      <main>
        {tab === 'planilla' && <Planilla dia={dia} padron={padron} set={set} setFila={setFila} resumen={resumen} hist={hist} onNuevo={onNuevo} />}
        {tab === 'extras' && <Extras dia={dia} set={set} padron={padron} onNuevo={onNuevo} />}
        {tab === 'partes' && <Partes dia={dia} padron={padron} />}
        {tab === 'padron' && <Padron padron={padron} setPadron={setPadron} onImportado={() => { setPadronState(cargarPadron()); setDiaState(cargarDia(fecha) || diaVacio(fecha)) }} />}
      </main>
    </div>
  )
}
