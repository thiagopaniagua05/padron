// Protección por contraseña única (Vercel Routing Middleware).
// La contraseña NO está en el código: se configura en Vercel como variable de entorno APP_PASSWORD.
// Se valida en el servidor, así que sin la contraseña no se descarga ni el HTML ni el JS de la app.
import { next } from '@vercel/functions'

export const config = { matcher: '/(.*)' }

const COOKIE = 'sm_auth'
const DIAS = 30

async function token(pass) {
  const data = new TextEncoder().encode('salida-moviles:' + pass)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const leerCookie = (req, nombre) =>
  (req.headers.get('cookie') || '').split(';').map((c) => c.trim().split('=')).find(([k]) => k === nombre)?.[1]

const pagina = (error = '') => new Response(`<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Salida de Móviles</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#1e293b;font:15px system-ui,sans-serif;color:#0f172a}
form{background:#fff;padding:28px;border-radius:12px;width:min(320px,calc(100vw - 32px));box-shadow:0 10px 30px #0005}
h1{margin:0 0 4px;font-size:20px;color:#1d4ed8}p{margin:0 0 18px;color:#64748b;font-size:13px}
input{width:100%;box-sizing:border-box;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font:inherit}
button{margin-top:12px;width:100%;padding:10px;border:0;border-radius:8px;background:#1d4ed8;color:#fff;font:inherit;font-weight:600;cursor:pointer}
.e{color:#dc2626;font-size:13px;margin-top:10px}
</style></head><body>
<form method="POST" action="/login">
<h1>Salida de Móviles</h1><p>Cuerpo de Patrulla · Vicente López</p>
<input type="password" name="password" placeholder="Contraseña" autofocus required>
<button>Entrar</button>${error ? `<div class="e">${error}</div>` : ''}
</form></body></html>`, { status: 401, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })

export default async function middleware(req) {
  const PASS = process.env.APP_PASSWORD
  if (!PASS) return new Response('Falta configurar APP_PASSWORD en Vercel.', { status: 500 })
  const url = new URL(req.url)
  const esperado = await token(PASS)

  if (url.pathname === '/login' && req.method === 'POST') {
    const form = await req.formData()
    if (form.get('password') !== PASS) return pagina('Contraseña incorrecta.')
    return new Response(null, {
      status: 303,
      headers: { location: '/', 'set-cookie': `${COOKIE}=${esperado}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${DIAS * 86400}` },
    })
  }

  if (url.pathname === '/logout') {
    return new Response(null, { status: 303, headers: { location: '/', 'set-cookie': `${COOKIE}=; Path=/; Max-Age=0` } })
  }

  if (leerCookie(req, COOKIE) === esperado) return next()
  return pagina()
}
