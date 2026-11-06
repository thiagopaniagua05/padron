import AgentePicker from './AgentePicker'
import { TURNOS, MOTIVOS } from '../logic'

function Lista({ titulo, items, onChange, nuevo, columnas, ayuda }) {
  const upd = (i, patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  return (
    <section className="card">
      <header><h3>{titulo}</h3><button onClick={() => onChange([...items, nuevo()])}>+ Agregar</button></header>
      {ayuda && <p className="ayuda">{ayuda}</p>}
      {!items.length && <p className="vacio-msg">Nada cargado.</p>}
      {items.map((x, i) => (
        <div className="fila-extra" key={i}>
          {columnas(x, (patch) => upd(i, patch))}
          <button className="borrar" title="Quitar" onClick={() => onChange(items.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
    </section>
  )
}

const Hs = ({ value, onChange }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)}>
    {TURNOS.map((t) => <option key={t} value={t}>{t} hs</option>)}
  </select>
)

export default function Extras({ dia, set, padron, onNuevo }) {
  return (
    <div className="extras">
      <Lista titulo="Ausentes" items={dia.ausentes} onChange={(ausentes) => set({ ausentes })}
        nuevo={() => ({ agente: '', hs: '6:00', motivo: MOTIVOS[0] })}
        columnas={(x, u) => (<>
          <AgentePicker value={x.agente} padron={padron} onNuevo={onNuevo} onChange={(agente) => u({ agente })} />
          <Hs value={x.hs} onChange={(hs) => u({ hs })} />
          <select value={x.motivo} onChange={(e) => u({ motivo: e.target.value })}>
            {[...new Set([...MOTIVOS, x.motivo])].map((m) => <option key={m}>{m}</option>)}
          </select>
          <span />
        </>)} />

      <Lista titulo="Recepción / personal afectado a otro sector" items={dia.otros} onChange={(otros) => set({ otros })}
        ayuda="Cuentan como F.P en el parte del turno, pero no como dotación en calle."
        nuevo={() => ({ agente: '', hs: '7:00', tipo: 'RECEPCIÓN', destino: '' })}
        columnas={(x, u) => (<>
          <AgentePicker value={x.agente} padron={padron} onNuevo={onNuevo} onChange={(agente) => u({ agente })} />
          <Hs value={x.hs} onChange={(hs) => u({ hs })} />
          <select value={x.tipo} onChange={(e) => u({ tipo: e.target.value })}>
            <option value="RECEPCIÓN">Recepción</option>
            <option value="AFECTADO">Afectado a otro sector</option>
          </select>
          {x.tipo === 'AFECTADO' && <input value={x.destino} placeholder="Destino, ej. Destacamentos (La Paz)" onChange={(e) => u({ destino: e.target.value })} />}
          {x.tipo !== 'AFECTADO' && <span />}
        </>)} />

      <section className="card">
        <header><h3>Otros datos de la planilla</h3></header>
        <div className="bloques sin-borde">
          <label>Back-up<input value={dia.backup} onChange={(e) => set({ backup: e.target.value })} placeholder="ej. 56-58-59-68" /></label>
          <label>Sin agentes<input value={dia.sinAgentes} onChange={(e) => set({ sinAgentes: e.target.value })} /></label>
          <label>Móviles fuera de servicio<input value={dia.fueraServicio} onChange={(e) => set({ fueraServicio: e.target.value })} placeholder="ej. 45-46-55" /></label>
          <label>Rotas<input value={dia.rotas} onChange={(e) => set({ rotas: e.target.value })} placeholder="-" /></label>
        </div>
      </section>

      <section className="card">
        <header><h3>Observaciones</h3></header>
        <textarea rows={3} value={dia.obs} onChange={(e) => set({ obs: e.target.value })}
          placeholder="Texto libre. Ausentes, afectados y recepción se agregan solos a la planilla." />
      </section>
    </div>
  )
}
