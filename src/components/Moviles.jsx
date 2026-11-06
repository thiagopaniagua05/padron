import { useState } from 'react'
import AgentePicker from './AgentePicker'
import { TURNOS, ZONAS_OPC, CON_DETALLE, tipoZona, normZona, movilVacio, movilUsado } from '../logic'

const finTurno = (t) => String((+t.split(':')[0] + 12) % 24).padStart(2, '0') + ':00'
const hora = (t) => t.padStart(5, '0')

function ZonaSelect({ value, onChange }) {
  const [otra, setOtra] = useState(false)
  const t = tipoZona(value)
  const base = otra && !value ? 'OTRA' : t.base
  const elegir = (b) => {
    if (b === 'REFUERZO' || b === 'QTH FIJO') onChange(b + (t.det && (t.tipo === 'ref' || t.tipo === 'qth') ? ' ' + t.det : ''))
    else if (b === 'OTRA') { setOtra(true); onChange('') }
    else { setOtra(false); onChange(b) }
  }
  const detalle = CON_DETALLE[base]
  return (
    <>
      <select value={base} onChange={(e) => elegir(e.target.value)} className={base ? '' : 'vacio'}>
        <option value="">Elegir…</option>
        {ZONAS_OPC.map((z) => <option key={z} value={z}>{/^\d/.test(z) ? 'Zona ' + z.replace('BIS', ' BIS') : z === 'OTRA' ? 'Otra…' : z}</option>)}
      </select>
      {detalle && (
        <input className="detalle" placeholder={detalle} value={base === 'OTRA' ? t.det : t.det}
          onChange={(e) => onChange(base === 'OTRA' ? e.target.value.toUpperCase() : `${base} ${e.target.value.toUpperCase()}`)}
          onBlur={() => onChange(normZona(value))} />
      )}
    </>
  )
}

function Tarjeta({ m, padron, onNuevo, cambiar, borrar, hist, repetida, n }) {
  const set = (patch) => cambiar(m.id, patch)
  const setAgente = (i, patch) => {
    const agentes = m.agentes.map((a, j) => (j === i ? { ...a, ...patch } : a))
    const extra = {}
    // Al elegir el primer agente: completa móvil y zona con lo último que usó (si están vacíos)
    if (i === 0 && patch.id && hist.agentes[patch.id]) {
      const prev = hist.agentes[patch.id]
      if (!m.cam && prev.cam) extra.cam = prev.cam
      if (!m.zona && prev.zona) extra.zona = prev.zona
    }
    set({ agentes, ...extra })
  }
  return (
    <article className={'movil' + (movilUsado(m) ? ' lleno' : '')}>
      <div className="movil-top">
        <span className="num">{n}</span>
        <label className="f-cam">Móvil
          <input inputMode="numeric" className={repetida ? 'alerta' : ''} value={m.cam} placeholder="Nº"
            onChange={(e) => set({ cam: e.target.value.replace(/\D/g, '') })}
            onBlur={() => { if (m.cam && !m.zona && hist.cams[m.cam]) set({ zona: hist.cams[m.cam] }) }} />
        </label>
        <label className="f-zona">Zona<ZonaSelect value={m.zona} onChange={(zona) => set({ zona })} /></label>
        <label className="f-hs">Hora
          <select value={m.hs} onChange={(e) => set({ hs: e.target.value })}>
            {TURNOS.map((t) => <option key={t} value={t}>{hora(t)}</option>)}
          </select>
        </label>
        <button className="borrar grande" title="Quitar móvil" onClick={() => borrar(m.id)}>🗑</button>
      </div>
      <div className="movil-ags">
        {m.agentes.map((a, i) => (
          <div className="ag-fila" key={i}>
            <label>{i === 0 ? 'Agente' : `Agente ${i + 1}`}
              <AgentePicker value={a.id} padron={padron} onNuevo={onNuevo} onChange={(id) => setAgente(i, { id })} />
            </label>
            {i > 0 && (
              <div className="ag-extra">
                <label className="check"><input type="checkbox" checked={/adicional/i.test(a.nota)}
                  onChange={(e) => setAgente(i, { nota: e.target.checked ? 'Adicional' : '' })} /> Adicional</label>
                <button className="link" onClick={() => set({ agentes: m.agentes.filter((_, j) => j !== i) })}>Quitar</button>
              </div>
            )}
          </div>
        ))}
        {m.agentes.length < 3 && (
          <button className="link mas" onClick={() => set({ agentes: [...m.agentes, { id: '', nota: '' }] })}>+ Agregar otro agente a este móvil</button>
        )}
      </div>
      <label className="f-pp">Oficial de policía
        <input value={m.ppol} placeholder="Sin personal" onChange={(e) => set({ ppol: e.target.value })} />
      </label>
    </article>
  )
}

export default function Moviles({ dia, setDia, padron, onNuevo, hist, resumen }) {
  const [cerrados, setCerrados] = useState({})
  const cambiar = (id, patch) => setDia((d) => ({ ...d, moviles: d.moviles.map((m) => (m.id === id ? { ...m, ...patch } : m)) }))
  const borrar = (id) => {
    const m = dia.moviles.find((x) => x.id === id)
    if (movilUsado(m) && !confirm(`¿Quitar el móvil ${m.cam || ''}?`)) return
    setDia((d) => ({ ...d, moviles: d.moviles.filter((x) => x.id !== id) }))
  }
  const agregar = (hs) => {
    const nuevo = movilVacio(hs)
    setDia((d) => ({ ...d, moviles: [...d.moviles, nuevo] }))
    setTimeout(() => document.getElementById('m-' + nuevo.id)?.querySelector('input')?.focus(), 50)
  }

  return (
    <div className="turnos">
      {TURNOS.map((t) => {
        const ms = dia.moviles.filter((m) => m.hs === t)
        const cerrado = cerrados[t]
        return (
          <section className="turno" key={t}>
            <button className="turno-head" onClick={() => setCerrados({ ...cerrados, [t]: !cerrado })}>
              <span className="flecha">{cerrado ? '▸' : '▾'}</span>
              <b>Turno {hora(t)} a {finTurno(t)}</b>
              <span className="cuenta">{ms.filter(movilUsado).length} móviles</span>
            </button>
            {!cerrado && (
              <>
                <div className="lista-moviles">
                  {ms.map((m, i) => (
                    <div id={'m-' + m.id} key={m.id}>
                      <Tarjeta m={m} n={i + 1} padron={padron} onNuevo={onNuevo} hist={hist}
                        cambiar={cambiar} borrar={borrar} repetida={resumen.camsRepetidas.includes(m.cam)} />
                    </div>
                  ))}
                </div>
                <button className="agregar" onClick={() => agregar(t)}>+ Agregar móvil a las {hora(t)}</button>
              </>
            )}
          </section>
        )
      })}
    </div>
  )
}
