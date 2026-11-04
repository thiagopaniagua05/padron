import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { nombreCompleto } from '../logic'

export const etiqueta = (a) => `${nombreCompleto(a)} · ${a.lp || 'S/N'}`
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()

/** Busca agentes donde cada palabra escrita coincide con el apellido, nombre o LP (en cualquier orden). */
export function buscarAgentes(padron, q, max = 7) {
  const palabras = norm(q).split(/\s+/).filter(Boolean)
  if (!palabras.length) return []
  const puntaje = (a) => {
    const tokens = norm(`${a.apellido} ${a.nombre} ${a.lp}`).split(/\s+/)
    let total = 0
    for (const p of palabras) {
      if (tokens.some((t) => t === p)) total += 3
      else if (tokens.some((t) => t.startsWith(p))) total += 2
      else if (tokens.some((t) => t.includes(p))) total += 1
      else return 0
    }
    return total + (norm(a.apellido).startsWith(palabras[0]) ? 2 : 0)
  }
  return padron.map((a) => [a, puntaje(a)]).filter(([, s]) => s > 0)
    .sort((x, y) => y[1] - x[1] || x[0].apellido.localeCompare(y[0].apellido))
    .slice(0, max).map(([a]) => a)
}

/** Campo con mini buscador de agentes del padrón. */
export default function AgentePicker({ value, padron, onChange, onNuevo, placeholder = 'Buscar agente…' }) {
  const actual = padron.find((a) => a.id === value)
  const [txt, setTxt] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)
  const [pos, setPos] = useState(null)
  const input = useRef()

  const mostrado = abierto ? txt : actual ? etiqueta(actual) : ''
  const resultados = abierto ? buscarAgentes(padron, txt) : []
  const opciones = [...resultados.map((a) => ({ a })), ...(abierto && txt.trim() && onNuevo ? [{ nuevo: true }] : [])]

  // La lista se dibuja con position: fixed para que no la corte el scroll de la tabla.
  // Si no hay lugar abajo (ej. teclado del celular abierto), se abre hacia arriba.
  const ubicar = () => {
    const r = input.current?.getBoundingClientRect(); if (!r) return
    const alto = window.visualViewport?.height || window.innerHeight
    const abajo = alto - r.bottom
    const arriba = abajo < 230 && r.top > abajo
    setPos({ left: r.left, width: Math.max(r.width, 260), top: arriba ? undefined : r.bottom + 2, bottom: arriba ? alto - r.top + 2 : undefined })
  }
  useLayoutEffect(() => { if (abierto) ubicar() }, [abierto, txt])
  useEffect(() => {
    if (!abierto) return
    const f = () => ubicar()
    window.addEventListener('scroll', f, true); window.addEventListener('resize', f); window.visualViewport?.addEventListener('resize', f)
    return () => { window.removeEventListener('scroll', f, true); window.removeEventListener('resize', f); window.visualViewport?.removeEventListener('resize', f) }
  }, [abierto])

  const elegir = (op) => {
    if (!op) return
    if (op.nuevo) onNuevo(txt, (id) => onChange(id))
    else onChange(op.a.id)
    setAbierto(false); input.current?.blur()
  }

  const tecla = (e) => {
    if (!abierto) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActivo((i) => Math.min(i + 1, opciones.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); elegir(opciones[activo]) }
    else if (e.key === 'Escape') { setAbierto(false); input.current.blur() }
  }

  return (
    <span className="picker">
      <input ref={input} value={mostrado} placeholder={placeholder} autoComplete="off" autoCorrect="off" spellCheck={false}
        className={actual ? 'elegido' : ''}
        onFocus={(e) => { setTxt(''); setActivo(0); setAbierto(true); setTimeout(() => e.target.scrollIntoView?.({ block: 'center', behavior: 'smooth' }), 250) }}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        onChange={(e) => { setTxt(e.target.value); setActivo(0) }}
        onKeyDown={tecla} />
      {actual && !abierto && (
        <button type="button" className="limpiar" tabIndex={-1} title="Quitar" onClick={() => onChange('')}>✕</button>
      )}
      {abierto && txt.trim() && pos && (
        <ul className="sugerencias" style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom }}
          onMouseDown={(e) => e.preventDefault()}>
          {opciones.map((op, i) => (
            <li key={op.nuevo ? 'nuevo' : op.a.id} className={i === activo ? 'activo' : ''}
              onMouseEnter={() => setActivo(i)} onClick={() => elegir(op)}>
              {op.nuevo
                ? <span className="nuevo">+ Agregar “{txt.trim().toUpperCase()}” al padrón</span>
                : <><b>{op.a.apellido}</b> {op.a.nombre}<small>LP {op.a.lp || 'S/N'}</small></>}
            </li>
          ))}
          {!resultados.length && !onNuevo && <li className="nada">Sin coincidencias</li>}
        </ul>
      )}
    </span>
  )
}
