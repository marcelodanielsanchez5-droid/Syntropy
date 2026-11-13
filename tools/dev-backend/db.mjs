// Base PostgreSQL embebida (PGlite) con el entorno mínimo de Supabase y las
// migraciones reales del repositorio. Se usa para validar las migraciones y
// como base del servidor local de pruebas.
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { PGlite, types } from '@electric-sql/pglite'
import { citext } from '@electric-sql/pglite/contrib/citext'

const here = path.dirname(fileURLToPath(import.meta.url))
export const MIGRATIONS_DIR = path.resolve(here, '../../supabase/migrations')

// Lo que Supabase ya trae y las migraciones dan por hecho: roles del cliente,
// esquemas auth y storage, y privilegios por defecto sobre el esquema public.
const SUPABASE_SHIM = `
create schema if not exists extensions;
create schema if not exists auth;
create schema if not exists storage;

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create or replace function auth.role() returns text
language sql stable
as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;

create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null,
  owner uuid,
  created_at timestamptz not null default now()
);

alter table storage.objects enable row level security;

create or replace function storage.foldername(name text) returns text[]
language sql immutable
as $$
  select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)]
$$;

grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to authenticated;

-- Supabase otorga todo sobre las tablas nuevas de public a los tres roles.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
`

export async function listMigrations() {
  const files = (await readdir(MIGRATIONS_DIR)).filter((name) => name.endsWith('.sql')).sort()
  return files
}

/**
 * Crea una base nueva en memoria y aplica las migraciones en orden.
 * `upTo` permite detenerse en una migración para comparar el antes y el después.
 */
export async function createDatabase({ upTo } = {}) {
  const db = await PGlite.create({
    extensions: { citext },
    // Como PostgREST: fechas como `YYYY-MM-DD` y `numeric` como número.
    parsers: {
      [types.DATE]: (value) => value,
      [types.NUMERIC]: (value) => Number(value),
    },
  })
  await db.exec(SUPABASE_SHIM)

  const applied = []

  for (const file of await listMigrations()) {
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8')
    await db.exec(sql)
    applied.push(file)

    if (upTo && file.startsWith(upTo)) {
      break
    }
  }

  return { db, applied }
}

/** Ejecuta `fn` como el rol del cliente, con la identidad del usuario dado. */
export async function asUser(db, userId, fn) {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${userId ? 'authenticated' : 'anon'}`)
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? ''])
    await tx.query(`select set_config('request.jwt.claim.role', $1, true)`, [
      userId ? 'authenticated' : 'anon',
    ])
    return fn(tx)
  })
}

/** Alta de usuario como lo hace Supabase Auth: dispara el trigger de perfil. */
export async function createAuthUser(db, { email, metadata = {} }) {
  const result = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id`,
    [email, JSON.stringify(metadata)],
  )
  return result.rows[0].id
}
