import { useState } from 'react'

export default function Pegar({ onLeer, resultado, irAMoviles }) {
  const [texto, setTexto] = useState('')

  const pegarPortapapeles = async () => {
    try { const t = await navigator.clipboard.readText(); if (t) setTexto(t) }
    catch { alert('El celular no dejó leer el portapapeles. Mantené apretado el cuadro de texto y elegí "Pegar".') }
  }

  return (
    <div className="pegar-parte">
      <section className="card">
        <h3>Cargar desde el parte de WhatsApp</h3>
        <ol className="pasos">
          <li>En WhatsApp, mantené apretado el mensaje del parte y tocá <b>Copiar</b>.</li>
          <li>Volvé acá y tocá <b>Pegar parte</b> (o mantené apretado el cuadro y elegí Pegar).</li>
          <li>Tocá <b>Cargar</b>. Podés pegar los 4 turnos juntos o de a uno.</li>
        </ol>
        <textarea rows={8} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Pegá acá el parte…" />
        <div className="botones-grandes">
          <button onClick={pegarPortapapeles}>📋 Pegar parte</button>
          <button className="primario" disabled={!texto.trim()} onClick={() => { if (onLeer(texto)) setTexto('') }}>Cargar</button>
        </div>
      </section>

      {resultado && (
        <section className={'card resultado ' + (resultado.ok ? 'ok' : 'mal')}>
          <h3>{resultado.ok ? '✓ Parte cargado' : 'No se pudo leer el parte'}</h3>
          <ul>{resultado.lineas.map((l, i) => <li key={i}>{l}</li>)}</ul>
          {resultado.ok && <button className="primario" onClick={irAMoviles}>Revisar los móviles</button>}
        </section>
      )}
    </div>
  )
}
