import { useRef, useState } from 'react'
import { nuevoId, exportarTodo, importarTodo } from '../storage'

export default function Padron({ padron, setPadron, onImportado }) {
  const [filtro, setFiltro] = useState('')
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

  return (
    <div className="padron">
      <section className="card">
        <header>
          <h3>Padrón de agentes ({padron.length})</h3>
          <div className="acciones">
            <button onClick={() => setPadron([{ id: nuevoId(), apellido: '', nombre: '', lp: '' }, ...padron])}>+ Agente</button>
            <button onClick={exportar}>Exportar backup</button>
            <button onClick={() => archivo.current.click()}>Importar</button>
            <input ref={archivo} type="file" accept=".json,application/json,text/plain,*/*" hidden onChange={importar} />
          </div>
        </header>
        <p className="ayuda">Los datos quedan guardados en este navegador. Para pasarlos a otro dispositivo (o a Luna), exportá el backup y que lo importe.</p>
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
