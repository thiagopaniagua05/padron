import { useEffect, useState } from 'react'
import { nombreCompleto } from '../logic'

export const etiqueta = (a) => `${nombreCompleto(a)} · ${a.lp || 'S/N'}`

// Lista única compartida por todos los selectores (un solo <datalist> en la página)
export function ListaAgentes({ padron }) {
  return (
    <datalist id="lista-agentes">
      {padron.map((a) => <option key={a.id} value={etiqueta(a)} />)}
    </datalist>
  )
}

/** Campo para elegir un agente del padrón escribiendo apellido o LP. */
export default function AgentePicker({ value, padron, onChange, onNuevo, placeholder = 'Agente…' }) {
  const actual = padron.find((a) => a.id === value)
  const [txt, setTxt] = useState(actual ? etiqueta(actual) : '')
  useEffect(() => { setTxt(actual ? etiqueta(actual) : '') }, [value, actual?.apellido, actual?.nombre, actual?.lp])

  const buscar = (t) => {
    const q = t.trim().toUpperCase()
    if (!q) return null
    return padron.find((a) => etiqueta(a).toUpperCase() === q) ||
      padron.find((a) => a.lp && a.lp === q) ||
      padron.find((a) => nombreCompleto(a).toUpperCase() === q) || null
  }

  const cambiar = (t) => {
    setTxt(t)
    const a = buscar(t)
    if (a) onChange(a.id)
    else if (!t.trim()) onChange('')
  }

  const sinMatch = txt.trim() && !buscar(txt)
  return (
    <span className="picker">
      <input list="lista-agentes" value={txt} placeholder={placeholder}
        className={sinMatch ? 'sin-match' : ''}
        onChange={(e) => cambiar(e.target.value)}
        onBlur={() => { if (!buscar(txt) && !sinMatch) setTxt(actual ? etiqueta(actual) : '') }} />
      {sinMatch && onNuevo && (
        <button type="button" className="mini" title="Agregar al padrón" onClick={() => onNuevo(txt, (id) => onChange(id))}>+</button>
      )}
    </span>
  )
}
