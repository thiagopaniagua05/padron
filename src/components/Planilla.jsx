import { Fragment } from 'react'
import AgentePicker from './AgentePicker'
import { FILAS, TURNOS, fila, usada } from '../logic'

function HsSelect({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={value ? '' : 'vacio'} aria-label="Horario">
      <option value="">Hs</option>
      {TURNOS.map((t) => <option key={t} value={t}>{t}</option>)}
    </select>
  )
}

const placeholderZona = { sup: 'SUPERVISOR', ref: 'ej. 14 A 18 BIS', extra: 'ej. 13 / BERMÚDEZ' }

export default function Planilla({ dia, padron, setFila, set, resumen, hist, onNuevo }) {
  // Al elegir el agente: completa móvil y hora con lo último que usó (solo si están vacíos)
  const elegirAgente = (def, f, i, id) => {
    const agentes = [...f.agentes]; agentes[i] = id
    const patch = { agentes }
    const prev = id && i === 0 ? hist.agentes[id] : null
    if (prev) {
      if (!f.cam && prev.cam) patch.cam = prev.cam
      if (!f.hs && (prev.hs || hist.cams[patch.cam || f.cam])) patch.hs = prev.hs || hist.cams[patch.cam || f.cam]
    }
    setFila(def.key, patch)
  }
  // Al cargar el móvil a mano: si la hora está vacía, usa la última hora de ese móvil
  const salirCam = (def, f) => { if (f.cam && !f.hs && hist.cams[f.cam]) setFila(def.key, { hs: hist.cams[f.cam] }) }

  const agentes = (def, f) => (
    <div className="ags">
      {Array.from({ length: def.dos ? 2 : 1 }, (_, i) => (
        <AgentePicker key={i} value={f.agentes[i] || ''} padron={padron} onNuevo={onNuevo}
          placeholder={i ? '2° agente (opcional)' : 'Buscar agente…'}
          onChange={(id) => elegirAgente(def, f, i, id)} />
      ))}
    </div>
  )

  const cam = (def, f) => (
    <input className={'cam' + (resumen.camsRepetidas.includes(f.cam) ? ' alerta' : '')} inputMode="numeric" placeholder="Móvil"
      value={f.cam} onChange={(e) => setFila(def.key, { cam: e.target.value.replace(/\D/g, '') })} onBlur={() => salirCam(def, f)} />
  )

  // Filas "ZONA" extra: se muestran 3 y aparece una más cuando se usan todas (hasta 8)
  const extras = FILAS.filter((d) => d.kind === 'extra')
  const ultimaUsada = extras.reduce((m, d, i) => (usada(fila(dia, d.key)) ? i : m), -1)
  const visibles = new Set(extras.slice(0, Math.max(3, ultimaUsada + 2)).map((d) => d.key))
  const izq = FILAS.filter((d) => d.side === 'L' && (d.kind !== 'extra' || visibles.has(d.key)))
  const der = FILAS.filter((d) => d.side === 'R')

  return (
    <div className="planilla">
      <section className="tabla-wrap">
        <table className="tabla izq">
          <thead><tr><th>Zona</th><th>Agente</th><th>Cam. Nº</th><th>Hs</th><th>P.Pol.</th></tr></thead>
          <tbody>
            {izq.map((def) => {
              const f = fila(dia, def.key)
              const vacia = resumen.enCalle > 0 && def.kind === 'zona' && resumen.sinAgente.includes(def.label.replace(' ', '').toUpperCase())
              return (
                <tr key={def.key} className={(vacia ? 'fila-vacia ' : '') + (usada(f) ? 'llena' : '')}>
                  <th className="zona">
                    <span>{def.label}</span>
                    {placeholderZona[def.kind] && (
                      <input className="zona-txt" value={f.zonaTxt} placeholder={placeholderZona[def.kind]}
                        onChange={(e) => setFila(def.key, { zonaTxt: e.target.value })} />
                    )}
                  </th>
                  <td className="c-ag">{agentes(def, f)}</td>
                  <td className="c-cam">{cam(def, f)}</td>
                  <td className="c-hs"><HsSelect value={f.hs} onChange={(hs) => setFila(def.key, { hs })} /></td>
                  <td className="c-pp"><input className="ppol" value={f.ppol} placeholder="P.Pol." onChange={(e) => setFila(def.key, { ppol: e.target.value })} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className="derecha">
        <div className="tabla-wrap">
          <table className="tabla der">
            <thead><tr><th></th><th>Agente</th><th>Cam. Nº</th><th>Hs</th><th>Zonas</th><th>P.Pol.</th></tr></thead>
            <tbody>
              {der.map((def, i) => {
                const f = fila(dia, def.key)
                const titulo = i === 0 || der[i - 1].kind !== def.kind
                return (
                  <Fragment key={def.key}>
                    {titulo && <tr className="sub"><td colSpan={6}>{def.kind === 'qth' ? 'Móviles en QTH fijo' : 'Móviles de refuerzo'}</td></tr>}
                    <tr className={usada(f) ? 'llena' : ''}>
                      <th className="zona chico"><span>{def.kind === 'qth' ? 'QTH' : 'REF'}</span></th>
                      <td className="c-ag">{agentes(def, f)}</td>
                      <td className="c-cam">{cam(def, f)}</td>
                      <td className="c-hs"><HsSelect value={f.hs} onChange={(hs) => setFila(def.key, { hs })} /></td>
                      <td className="c-zonas"><input value={f.zonas} placeholder="Zonas: 6/7/9/10" onChange={(e) => setFila(def.key, { zonas: e.target.value })} /></td>
                      <td className="c-pp"><input className="ppol" value={f.ppol} placeholder="P.Pol." onChange={(e) => setFila(def.key, { ppol: e.target.value })} /></td>
                    </tr>
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="bloques">
          <label>Back-up<input value={dia.backup} onChange={(e) => set({ backup: e.target.value })} placeholder="56-58-59-68…" /></label>
          <label>Sin agentes<input value={dia.sinAgentes} onChange={(e) => set({ sinAgentes: e.target.value })} /></label>
          <label>Móviles fuera de servicio<input value={dia.fueraServicio} onChange={(e) => set({ fueraServicio: e.target.value })} placeholder="45-46-55…" /></label>
        </div>

        <div className="por-hora">
          {TURNOS.map((t) => (
            <div key={t}><b>Móviles {t.padStart(5, '0')} hs</b><span>{resumen.porHora[t].join(' - ') || '—'}</span><em>{resumen.porHora[t].length}</em></div>
          ))}
        </div>

        <div className="totales">
          <div><span>En calle</span><b>{resumen.enCalle}</b></div>
          <div><span>Rotas</span><input value={dia.rotas} onChange={(e) => set({ rotas: e.target.value })} placeholder="-" /></div>
          <div><span>Sin agente</span><b>{resumen.sinAgente.length ? 'Zona ' + resumen.sinAgente.join(', ') : '—'}</b></div>
        </div>
      </section>
    </div>
  )
}
