import { useState } from 'react'
import { TURNOS, parteWhatsApp, filasUsadas } from '../logic'

export default function Partes({ dia, padron }) {
  const [copiado, setCopiado] = useState('')
  const turnos = TURNOS.filter((t) => filasUsadas(dia).some(({ f }) => f.hs === t) || dia.ausentes.some((a) => a.hs === t))

  const copiar = async (t, txt) => {
    try { await navigator.clipboard.writeText(txt) } catch {
      const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove()
    }
    setCopiado(t); setTimeout(() => setCopiado(''), 1500)
  }

  if (!turnos.length) return <p className="vacio-msg">Todavía no hay móviles con horario cargado.</p>
  return (
    <div className="partes">
      {turnos.map((t) => {
        const txt = parteWhatsApp(dia, padron, t)
        return (
          <section className="card" key={t}>
            <header>
              <h3>Turno {t} hs</h3>
              <div className="acciones">
                <button onClick={() => copiar(t, txt)}>{copiado === t ? '✓ Copiado' : 'Copiar'}</button>
                <a className="btn wa" href={'https://wa.me/?text=' + encodeURIComponent(txt)} target="_blank" rel="noreferrer">WhatsApp</a>
              </div>
            </header>
            <pre>{txt}</pre>
          </section>
        )
      })}
    </div>
  )
}
