import { useRef, useState } from 'react'
import { nuevoId, exportarTodo, importarTodo } from '../storage'

export default function Padron({ padron, setPadron, onImportado }) {
  const [filtro, setFiltro] = useState('')
  const [pegar, setPegar] = useState(false)
  const [texto, setTexto] = useState('')
  const [copiado, setCopiado] = useState(false)
  const archivo = useRef()
  const upd = (id, patch) => setPadron(padron.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  const lista = padron
    .filter((a) => `${a.apellido} ${a.nombre} ${a.lp}`.toUpperCase().includes(filtro.toUpperCase()))
    .sort((a, b) => a.apellido.localeCompare(b.apellido))

  const exportar = () => {
    const blob = new Blob([JSON.stringify(exportarTodo(), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `backup-salida-moviles-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }
  const importar = async (e) => {
    const f = e.target.files[0]; if (!f) return
    try { importarTodo(JSON.parse(await f.text())); onImportado() } catch { alert('El archivo no es un backup válido.') }
    e.target.value = ''
  }

  // Backup como texto: para mandarlo por WhatsApp como mensaje (el celular no abre archivos .json)
  const copiarTexto = async () => {
    const txt = JSON.stringify(exportarTodo())
    try { await navigator.clipboard.writeText(txt) } catch {
      const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove()
    }
    setCopiado(true); setTimeout(() => setCopiado(false), 2000)
  }
  const importarTexto = () => {
    const t = texto.trim()
    const ini = t.search(/[[{]/), fin = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'))
    try {
      importarTodo(JSON.parse(t.slice(ini, fin + 1)))
      onImportado(); setTexto(''); setPegar(false); alert('Backup importado.')
    } catch { alert('El texto pegado no es un backup válido. Fijate de copiar el mensaje completo.') }
  }

  return (
    <div className="padron">
      <section className="card">
        <header>
          <h3>Padrón de agentes ({padron.length})</h3>
          <div className="acciones">
            <button onClick={() => setPadron([{ id: nuevoId(), apellido: '', nombre: '', lp: '' }, ...padron])}>+ Agente</button>
            <button onClick={copiarTexto}>{copiado ? '✓ Copiado' : 'Copiar backup (texto)'}</button>
            <button onClick={() => setPegar(!pegar)}>Pegar backup</button>
            <button onClick={exportar}>Exportar archivo</button>
            <button onClick={() => archivo.current.click()}>Importar archivo</button>
            <input ref={archivo} type="file" accept=".json,application/json,text/plain,*/*" hidden onChange={importar} />
          </div>
        </header>
        <p className="ayuda">Los datos quedan guardados en este navegador. Para pasarlos a otro celular: <b>Copiar backup</b>, mandalo como mensaje de WhatsApp, y en el otro celular copiá el mensaje y usá <b>Pegar backup</b>.</p>
        {pegar && (
          <div className="pegar">
            <textarea rows={5} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Pegá acá el mensaje con el backup…" autoFocus />
            <div className="acciones">
              <button className="primario" disabled={!texto.trim()} onClick={importarTexto}>Importar</button>
              <button onClick={() => { setPegar(false); setTexto('') }}>Cancelar</button>
            </div>
          </div>
        )}
        <input className="buscar" placeholder="Buscar por apellido o LP…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        <table className="tabla">
          <thead><tr><th>Apellido</th><th>Nombre</th><th>LP</th><th></th></tr></thead>
          <tbody>
            {lista.map((a) => (
              <tr key={a.id}>
                <td><input value={a.apellido} onChange={(e) => upd(a.id, { apellido: e.target.value.toUpperCase() })} /></td>
                <td><input value={a.nombre} onChange={(e) => upd(a.id, { nombre: e.target.value.toUpperCase() })} /></td>
                <td><input className="cam" inputMode="numeric" value={a.lp} onChange={(e) => upd(a.id, { lp: e.target.value.trim() })} /></td>
                <td><button className="borrar" onClick={() => confirm(`¿Borrar a ${a.apellido}?`) && setPadron(padron.filter((x) => x.id !== a.id))}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
