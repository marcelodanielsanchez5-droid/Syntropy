// Servidor local de pruebas con la API mínima de Supabase que usa Syntropy:
// Auth (contraseña y refresco), REST (PostgREST) con RLS real y RPC, Storage,
// y la Edge Function send-reminders con un Resend simulado.
// Solo para desarrollo: los tokens no se firman y todo vive en memoria.
// Uso: node server.mjs  →  http://127.0.0.1:54321
//   GET  /__dev/outbox          correos «enviados» por el Resend simulado
//   GET  /__dev/outbox/<id>     HTML de un correo
//   POST /__dev/run-reminders   ejecuta la función ya (además corre sola cada 30 s)
import http from 'node:http'
import { randomUUID } from 'node:crypto'
import zlib from 'node:zlib'
import { createDatabase } from './db.mjs'
import { seed } from './seed.mjs'
import { handleRequest as handleSendReminders } from '../../supabase/functions/send-reminders/handler.ts'

const PORT = 54321
// Equivale a la clave service_role: solo la usa la función simulada.
const SERVICE_KEY = 'dev-service-role-key'
const CRON_SECRET = 'dev-cron-secret'
const REMINDERS_EVERY_MS = Number(process.env.REMINDERS_EVERY_MS ?? 30_000)
const { db } = await createDatabase()
await db.exec(`set timezone = 'UTC'`)
const accounts = await seed(db) // email → { id, password }
// Imagen PNG de ejemplo (un degradado rosa-violeta de 160×90) para probar miniaturas.
function makeSamplePng(width = 160, height = 90) {
  const raw = Buffer.alloc((width * 3 + 1) * height)

  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 3 + 1)
    raw[row] = 0

    for (let x = 0; x < width; x += 1) {
      const t = x / (width - 1)
      raw[row + 1 + x * 3] = Math.round(224 * (1 - t) + 111 * t)
      raw[row + 2 + x * 3] = Math.round(20 * (1 - t) + 7 * t + (y / height) * 30)
      raw[row + 3 + x * 3] = Math.round(98 * (1 - t) + 200 * t)
    }
  }

  const chunk = (type, data) => {
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(zlib.crc32(body))
    return Buffer.concat([length, body, crc])
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8 // bits por canal
  header[9] = 2 // RGB

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const SAMPLE_PNG = makeSamplePng()
const refreshTokens = new Map() // refresh_token → userId

// ---------------------------------------------------------------------------
// Utilidades HTTP
// ---------------------------------------------------------------------------

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization,apikey,content-type,prefer,accept,accept-profile,content-profile,x-client-info,x-supabase-api-version,range,x-cron-secret',
  'Access-Control-Expose-Headers': 'content-range',
}

function send(res, status, body) {
  if (body === undefined) {
    res.writeHead(status, CORS)
    res.end()
    return
  }

  res.writeHead(status, { ...CORS, 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

async function readBody(req) {
  const chunks = []

  for await (const chunk of req) {
    chunks.push(chunk)
  }

  const text = Buffer.concat(chunks).toString('utf8')
  return text ? JSON.parse(text) : null
}

const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')

function makeToken(user) {
  const now = Math.floor(Date.now() / 1000)
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({
    sub: user.id,
    email: user.email,
    role: 'authenticated',
    aud: 'authenticated',
    iat: now,
    exp: now + 3600,
  })}.local`
}

function userIdFrom(req) {
  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const [, payload] = token.split('.')

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return claims.role === 'authenticated' && claims.exp * 1000 > Date.now() ? claims.sub : null
  } catch {
    return null
  }
}

async function userObject(userId) {
  const { rows } = await db.query(
    `select id, email, raw_user_meta_data, created_at from auth.users where id = $1`,
    [userId],
  )
  const row = rows[0]

  if (!row) {
    return null
  }

  return {
    id: row.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: row.email,
    email_confirmed_at: row.created_at,
    confirmed_at: row.created_at,
    user_metadata: row.raw_user_meta_data,
    app_metadata: { provider: 'email', providers: ['email'] },
    identities: [],
    created_at: row.created_at,
    updated_at: row.created_at,
  }
}

async function session(userId) {
  const user = await userObject(userId)
  const refreshToken = randomUUID()
  refreshTokens.set(refreshToken, userId)

  return {
    access_token: makeToken(user),
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: refreshToken,
    user,
  }
}

function authError(res, status, code, message) {
  send(res, status, { code: status, error_code: code, msg: message })
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

async function handleAuth(req, res, url) {
  const path = url.pathname.replace('/auth/v1', '')

  if (path === '/token' && req.method === 'POST') {
    const body = (await readBody(req)) ?? {}
    const grant = url.searchParams.get('grant_type')

    if (grant === 'password') {
      const account = accounts.get(String(body.email ?? '').toLowerCase())

      if (!account || account.password !== body.password) {
        return authError(res, 400, 'invalid_credentials', 'Invalid login credentials')
      }

      return send(res, 200, await session(account.id))
    }

    if (grant === 'refresh_token') {
      const userId = refreshTokens.get(body.refresh_token)

      if (!userId) {
        return authError(res, 400, 'refresh_token_not_found', 'Invalid Refresh Token')
      }

      refreshTokens.delete(body.refresh_token)
      return send(res, 200, await session(userId))
    }

    return authError(res, 400, 'unsupported_grant_type', 'Unsupported grant type')
  }

  if (path === '/user') {
    const userId = userIdFrom(req)

    if (!userId) {
      return authError(res, 401, 'bad_jwt', 'Invalid JWT')
    }

    if (req.method === 'PUT') {
      const body = (await readBody(req)) ?? {}

      if (body.password) {
        for (const account of accounts.values()) {
          if (account.id === userId) {
            account.password = body.password
          }
        }
      }
    }

    return send(res, 200, await userObject(userId))
  }

  if (path === '/logout') {
    return send(res, 204)
  }

  if (path === '/recover' || path === '/resend') {
    return send(res, 200, {})
  }

  if (path === '/signup' && req.method === 'POST') {
    const body = (await readBody(req)) ?? {}
    const email = String(body.email ?? '').toLowerCase()

    if (accounts.has(email)) {
      return authError(res, 422, 'user_already_exists', 'User already registered')
    }

    const { rows } = await db.query(
      `insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id`,
      [email, JSON.stringify(body.data ?? {})],
    )
    accounts.set(email, { id: rows[0].id, password: body.password })
    return send(res, 200, await session(rows[0].id))
  }

  return authError(res, 404, 'not_found', 'Not found')
}

// ---------------------------------------------------------------------------
// REST (subconjunto de PostgREST)
// ---------------------------------------------------------------------------

const IDENT = /^[a-z_][a-z0-9_]*$/

function ident(name) {
  if (!IDENT.test(name)) {
    throw Object.assign(new Error(`Nombre no permitido: ${name}`), { code: '42601' })
  }

  return `"${name}"`
}

/** Valor de un parámetro para PostgreSQL: los arreglos como literal y los objetos como JSON. */
function toParam(value) {
  if (value === null || value === undefined) {
    return null
  }

  if (Array.isArray(value)) {
    return `{${value.map((item) => `"${String(item).replace(/["\\]/g, '\\$&')}"`).join(',')}}`
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'columns', 'on_conflict'])
const OPERATORS = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=' }

function buildWhere(searchParams, params) {
  const clauses = []

  for (const [column, raw] of searchParams) {
    if (RESERVED.has(column)) {
      continue
    }

    const dot = raw.indexOf('.')
    const op = raw.slice(0, dot)
    const value = raw.slice(dot + 1)

    if (OPERATORS[op]) {
      params.push(value)
      clauses.push(`${ident(column)} ${OPERATORS[op]} $${params.length}`)
    } else if (op === 'in') {
      const items = value
        .replace(/^\(|\)$/g, '')
        .split(',')
        .filter(Boolean)
        .map((item) => item.replace(/^"|"$/g, ''))

      if (items.length === 0) {
        clauses.push('false')
      } else {
        const placeholders = items.map((item) => {
          params.push(item)
          return `$${params.length}`
        })
        clauses.push(`${ident(column)} in (${placeholders.join(', ')})`)
      }
    } else if (op === 'is') {
      const map = { null: 'null', true: 'true', false: 'false' }
      clauses.push(`${ident(column)} is ${map[value] ?? 'null'}`)
    } else {
      throw Object.assign(new Error(`Operador no soportado: ${op}`), { code: 'PGRST100' })
    }
  }

  return clauses.length ? `where ${clauses.join(' and ')}` : ''
}

function buildSelect(searchParams) {
  const select = searchParams.get('select') ?? '*'
  return select === '*' ? '*' : select.split(',').map((column) => ident(column.trim())).join(', ')
}

function buildOrder(searchParams) {
  const order = searchParams.get('order')

  if (!order) {
    return ''
  }

  const parts = order.split(',').map((part) => {
    const [column, ...modifiers] = part.split('.')
    const direction = modifiers.includes('desc') ? 'desc' : 'asc'
    const nulls = modifiers.includes('nullsfirst')
      ? ' nulls first'
      : modifiers.includes('nullslast')
        ? ' nulls last'
        : ''
    return `${ident(column)} ${direction}${nulls}`
  })

  return `order by ${parts.join(', ')}`
}

function pgError(error) {
  const status = {
    '42501': 403,
    '23505': 409,
    '23503': 409,
    '23514': 400,
    '22P02': 400,
    P0002: 404,
    PGRST116: 406,
  }[error.code] ?? 400

  return {
    status,
    body: {
      code: error.code ?? 'PGRST000',
      message: error.message,
      details: error.detail ?? null,
      hint: error.hint ?? null,
    },
  }
}

function isServiceRequest(req) {
  return req.headers.apikey === SERVICE_KEY || req.headers.authorization === `Bearer ${SERVICE_KEY}`
}

/** `userId` es el usuario del token; 'service' es la clave de servicio. */
async function asRole(userId, fn) {
  const role = userId === 'service' ? 'service_role' : userId ? 'authenticated' : 'anon'
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${role}`)
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [
      role === 'authenticated' ? userId : '',
    ])
    await tx.query(`select set_config('request.jwt.claim.role', $1, true)`, [role])
    return fn(tx)
  })
}

async function handleRest(req, res, url) {
  const userId = isServiceRequest(req) ? 'service' : userIdFrom(req)
  const rest = url.pathname.replace('/rest/v1/', '')
  const wantsObject = (req.headers.accept ?? '').includes('vnd.pgrst.object')
  const representation = (req.headers.prefer ?? '').includes('return=representation')

  if (rest.startsWith('rpc/')) {
    const fn = rest.slice(4)
    const body = (await readBody(req)) ?? {}
    const names = Object.keys(body)
    const args = names.map((name, index) => `${ident(name)} => $${index + 1}`).join(', ')
    const params = names.map((name) => toParam(body[name]))
    const call = `public.${ident(fn)}(${args})`
    const { rows: [meta] = [] } = await db.query(
      `select p.proretset as set, t.typname as type
         from pg_proc p
         join pg_type t on t.oid = p.prorettype
         join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = $1
        limit 1`,
      [fn],
    )

    // Como PostgREST: void → 204, conjunto → arreglo, escalar → valor.
    if (!meta || meta.type === 'void') {
      await asRole(userId, (tx) => tx.query(`select ${call}`, params))
      return send(res, 204)
    }

    if (meta.set || meta.type === 'record') {
      const { rows } = await asRole(userId, (tx) => tx.query(`select * from ${call}`, params))
      return send(res, 200, rows)
    }

    const { rows } = await asRole(userId, (tx) => tx.query(`select ${call} as value`, params))
    return send(res, 200, rows[0]?.value ?? null)
  }

  const table = `public.${ident(rest)}`
  const params = []
  let sql

  if (req.method === 'GET') {
    const limit = url.searchParams.get('limit')
    const offset = url.searchParams.get('offset')
    sql = [
      `select ${buildSelect(url.searchParams)} from ${table}`,
      buildWhere(url.searchParams, params),
      buildOrder(url.searchParams),
      limit ? `limit ${Number(limit)}` : '',
      offset ? `offset ${Number(offset)}` : '',
    ].join(' ')
  } else if (req.method === 'POST') {
    const body = await readBody(req)
    const rows = Array.isArray(body) ? body : [body]
    const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))]
    const values = rows.map(
      (row) =>
        `(${columns
          .map((column) => {
            if (!(column in row)) {
              return 'default'
            }

            params.push(toParam(row[column]))
            return `$${params.length}`
          })
          .join(', ')})`,
    )
    sql = `insert into ${table} (${columns.map(ident).join(', ')}) values ${values.join(', ')} returning ${buildSelect(url.searchParams)}`
  } else if (req.method === 'PATCH') {
    const body = (await readBody(req)) ?? {}
    const sets = Object.entries(body).map(([column, value]) => {
      params.push(toParam(value))
      return `${ident(column)} = $${params.length}`
    })
    sql = `update ${table} set ${sets.join(', ')} ${buildWhere(url.searchParams, params)} returning ${buildSelect(url.searchParams)}`
  } else if (req.method === 'DELETE') {
    sql = `delete from ${table} ${buildWhere(url.searchParams, params)} returning ${buildSelect(url.searchParams)}`
  } else {
    return send(res, 405, { message: 'Método no soportado' })
  }

  const { rows } = await asRole(userId, (tx) => tx.query(sql, params))

  if (wantsObject) {
    if (rows.length !== 1) {
      const { status, body } = pgError({
        code: 'PGRST116',
        message: 'JSON object requested, multiple (or no) rows returned',
        detail: `The result contains ${rows.length} rows`,
      })
      return send(res, status, body)
    }

    return send(res, 200, rows[0])
  }

  if (req.method !== 'GET' && !representation) {
    return send(res, 204)
  }

  return send(res, req.method === 'POST' ? 201 : 200, rows)
}

// ---------------------------------------------------------------------------
// Storage en memoria: subir, listar, firmar, descargar y borrar. Como las
// políticas reales, la primera carpeta de la ruta tiene que ser el usuario.
// ---------------------------------------------------------------------------

const files = new Map() // `${bucket}/${path}` → { body, contentType }

// Archivos que corresponden a las fuentes de ejemplo de seed.mjs.
{
  const { rows } = await db.query(`select storage_path, thumbnail_path, mime_type from public.sources where storage_path is not null`)

  for (const row of rows) {
    const isImage = row.mime_type?.startsWith('image/')
    files.set(`academic-files/${row.storage_path}`, {
      body: isImage ? SAMPLE_PNG : Buffer.from('%PDF-1.4 archivo de ejemplo de Syntropy'),
      contentType: row.mime_type ?? 'application/octet-stream',
    })

    if (row.thumbnail_path) {
      files.set(`academic-files/${row.thumbnail_path}`, { body: SAMPLE_PNG, contentType: 'image/png' })
    }
  }
}

async function readRaw(req) {
  const chunks = []

  for await (const chunk of req) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks)
}

/** Saca el archivo de un cuerpo multipart (lo que envía supabase-js con un File). */
function extractFile(raw, contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/.exec(contentType ?? '')

  if (!match) {
    return { body: raw, contentType }
  }

  const boundary = Buffer.from(`--${match[1] ?? match[2]}`)
  let position = raw.indexOf(boundary)

  while (position !== -1) {
    const next = raw.indexOf(boundary, position + boundary.length)

    if (next === -1) {
      break
    }

    const part = raw.subarray(position + boundary.length + 2, next - 2)
    const headerEnd = part.indexOf('\r\n\r\n')
    const headers = part.subarray(0, headerEnd).toString('utf8')

    if (/filename=|name=""/.test(headers)) {
      const type = /content-type:\s*([^\r\n]+)/i.exec(headers)?.[1]
      return { body: part.subarray(headerEnd + 4), contentType: type ?? 'application/octet-stream' }
    }

    position = next
  }

  return { body: raw, contentType }
}

function ownsPath(userId, path) {
  return Boolean(userId) && path.split('/')[0] === userId
}

function storageDenied(res) {
  send(res, 400, {
    statusCode: '403',
    error: 'Unauthorized',
    message: 'new row violates row-level security policy',
  })
}

async function handleStorage(req, res, url) {
  const userId = userIdFrom(req)
  const rest = decodeURIComponent(url.pathname.replace('/storage/v1/object/', ''))

  // Descarga con enlace firmado (no lleva token de usuario).
  if (req.method === 'GET' && rest.startsWith('sign/')) {
    const key = rest.slice(5)
    const file = files.get(key)

    if (!file) {
      return send(res, 404, { statusCode: '404', error: 'not_found', message: 'Object not found' })
    }

    res.writeHead(200, { ...CORS, 'Content-Type': file.contentType })
    return res.end(file.body)
  }

  if (req.method === 'POST' && rest.startsWith('sign/') && !rest.slice(5).includes('/')) {
    const bucket = rest.slice(5)
    const body = JSON.parse((await readRaw(req)).toString('utf8') || '{}')
    const signed = (body.paths ?? []).map((path) => {
      if (!ownsPath(userId, path) || !files.has(`${bucket}/${path}`)) {
        return { path, signedURL: null, error: 'Either the object does not exist or you do not have access to it' }
      }

      const token = Buffer.from(`${path}:${Date.now()}`).toString('base64url')
      return { path, signedURL: `/object/sign/${bucket}/${path}?token=${token}`, error: null }
    })
    return send(res, 200, signed)
  }

  if (req.method === 'POST' && rest.startsWith('sign/')) {
    const [bucket, ...pathParts] = rest.slice(5).split('/')
    const path = pathParts.join('/')

    if (!ownsPath(userId, path) || !files.has(`${bucket}/${path}`)) {
      return storageDenied(res)
    }

    const token = Buffer.from(`${path}:${Date.now()}`).toString('base64url')
    return send(res, 200, { signedURL: `/object/sign/${bucket}/${encodeURI(path)}?token=${token}` })
  }

  if (req.method === 'POST' && rest.startsWith('list/')) {
    const bucket = rest.slice(5)
    const body = JSON.parse((await readRaw(req)).toString('utf8') || '{}')
    const prefix = String(body.prefix ?? '').replace(/\/$/, '')

    if (!ownsPath(userId, prefix)) {
      return send(res, 200, [])
    }

    const children = new Map()

    for (const key of files.keys()) {
      const path = key.slice(bucket.length + 1)

      if (key.startsWith(`${bucket}/`) && path.startsWith(`${prefix}/`)) {
        const [name, ...more] = path.slice(prefix.length + 1).split('/')
        children.set(name, more.length === 0 ? key : null)
      }
    }

    const offset = Number(body.offset ?? 0)
    const limit = Number(body.limit ?? 100)
    const entries = Array.from(children, ([name, key]) => ({ name, id: key ? key : null }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(offset, offset + limit)

    return send(res, 200, entries)
  }

  if (req.method === 'DELETE') {
    const bucket = rest
    const body = JSON.parse((await readRaw(req)).toString('utf8') || '{}')
    const removed = []

    for (const path of body.prefixes ?? []) {
      if (ownsPath(userId, path) && files.delete(`${bucket}/${path}`)) {
        removed.push({ name: path })
      }
    }

    return send(res, 200, removed)
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const [bucket, ...pathParts] = rest.split('/')
    const path = pathParts.join('/')

    if (!ownsPath(userId, path)) {
      return storageDenied(res)
    }

    const upsert = req.headers['x-upsert'] === 'true'

    if (files.has(`${bucket}/${path}`) && !upsert && req.method === 'POST') {
      return send(res, 400, { statusCode: '409', error: 'Duplicate', message: 'The resource already exists' })
    }

    const file = extractFile(await readRaw(req), req.headers['content-type'])
    files.set(`${bucket}/${path}`, file)
    return send(res, 200, { Key: `${bucket}/${path}`, Id: randomUUID() })
  }

  return send(res, 400, { statusCode: '400', error: 'NotSupported', message: 'Operación de Storage no soportada' })
}

// ---------------------------------------------------------------------------
// Edge Function send-reminders con Resend simulado. Usa el mismo handler.ts que
// se despliega en Supabase; solo cambia el `fetch` hacia Resend.
// ---------------------------------------------------------------------------

const outbox = [] // correos «enviados»

async function fakeResendFetch(input, init = {}) {
  const url = typeof input === 'string' ? input : input.url

  if (url !== 'https://api.resend.com/emails') {
    return fetch(input, init)
  }

  const payload = JSON.parse(init.body)
  const key = init.headers?.['Idempotency-Key']
  const repeated = outbox.find((email) => email.idempotencyKey === key)

  if (repeated) {
    return new Response(JSON.stringify({ id: repeated.id }), { status: 200 })
  }

  // Para probar errores definitivos: un destinatario con «rebota» falla como en Resend.
  if (payload.to.some((address) => address.includes('rebota'))) {
    return new Response(JSON.stringify({ name: 'validation_error', message: 'Invalid `to` field.' }), {
      status: 422,
    })
  }

  const id = `dev_${randomUUID()}`
  outbox.push({ id, idempotencyKey: key, at: new Date().toISOString(), ...payload })
  return new Response(JSON.stringify({ id }), { status: 200 })
}

const functionConfig = {
  supabaseUrl: `http://127.0.0.1:${PORT}`,
  serviceKey: SERVICE_KEY,
  resendApiKey: 're_dev_simulada',
  fromEmail: 'Syntropy <recordatorios@syntropy.test>',
  cronSecret: CRON_SECRET,
  appUrl: 'http://localhost:5173',
  fetch: fakeResendFetch,
  pauseMs: 0,
  log: (message) => console.log(`[send-reminders] ${message}`),
}

async function runSendReminders(secret = CRON_SECRET) {
  const response = await handleSendReminders(
    new Request('http://127.0.0.1/functions/v1/send-reminders', {
      method: 'POST',
      headers: { 'x-cron-secret': secret },
      body: '{}',
    }),
    functionConfig,
  )
  return { status: response.status, body: await response.json() }
}

async function handleDev(req, res, url) {
  if (url.pathname === '/functions/v1/send-reminders') {
    const result = await runSendReminders(req.headers['x-cron-secret'] ?? '')
    return send(res, result.status, result.body)
  }

  if (url.pathname === '/__dev/run-reminders' && req.method === 'POST') {
    const result = await runSendReminders()
    return send(res, result.status, result.body)
  }

  if (url.pathname === '/__dev/outbox') {
    return send(
      res,
      200,
      outbox.map(({ id, at, from, to, subject, text, tags }) => ({ id, at, from, to, subject, tags, text })),
    )
  }

  const match = url.pathname.match(/^\/__dev\/outbox\/([\w-]+)$/)

  if (match) {
    const email = outbox.find((item) => item.id === match[1])

    if (!email) {
      return send(res, 404, { message: 'No existe ese correo' })
    }

    res.writeHead(200, { ...CORS, 'Content-Type': 'text/html; charset=utf-8' })
    return res.end(email.html)
  }

  return send(res, 404, { message: 'Ruta de desarrollo desconocida' })
}

// Como pg_cron: la función corre sola cada tanto.
setInterval(() => {
  runSendReminders().catch((error) => console.error('[send-reminders]', error.message))
}, REMINDERS_EVERY_MS).unref()

// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)

  if (req.method === 'OPTIONS') {
    // Se aceptan las cabeceras que pida el cliente (Storage usa x-upsert, cache-control…).
    res.writeHead(204, {
      ...CORS,
      'Access-Control-Allow-Headers': req.headers['access-control-request-headers'] ?? CORS['Access-Control-Allow-Headers'],
    })
    return res.end()
  }

  try {
    if (url.pathname.startsWith('/auth/v1')) {
      return await handleAuth(req, res, url)
    }

    if (url.pathname.startsWith('/rest/v1/')) {
      return await handleRest(req, res, url)
    }

    if (url.pathname.startsWith('/storage/v1/')) {
      return await handleStorage(req, res, url)
    }

    if (url.pathname.startsWith('/functions/v1/') || url.pathname.startsWith('/__dev/')) {
      return await handleDev(req, res, url)
    }

    res.writeHead(200, { ...CORS, 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Backend local de pruebas de Syntropy: Auth, REST y RPC sobre PGlite.\n')
  } catch (error) {
    const { status, body } = pgError(error)
    console.error(`${req.method} ${url.pathname}${url.search} → ${status} ${body.code}: ${body.message}`)
    send(res, status, body)
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Backend local listo en http://127.0.0.1:${PORT}`)
})
