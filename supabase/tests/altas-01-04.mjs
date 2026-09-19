import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
create table auth.users(id uuid primary key,email text,raw_app_meta_data jsonb,raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
grant usage on schema public,auth,storage to anon,authenticated,service_role;`);
for (const f of readdirSync('supabase/migrations').sort()) {
  if (f.includes('cierre_altas'))
    await db.exec(`grant all on all tables in schema public,storage to authenticated,service_role;grant select on all tables in schema public to anon;
 insert into productos(id,tipo,nombre,descripcion,tiempo_elaboracion_min,precio,sector) values('90000000-0000-4000-8000-000000000001','plato','Histórico incompleto','Registro anterior a la migración',20,200,'cocina');
 insert into producto_fotos(producto_id,orden,url) values('90000000-0000-4000-8000-000000000001',1,'https://fixture.invalid/historica.jpg');
 insert into mesas(numero,cantidad_comensales,tipo) values(998,4,'vip');`);
  await db.exec(
    readFileSync('supabase/migrations/' + f, 'utf8').replace(
      'create extension if not exists pgcrypto;',
      '',
    ),
  );
}
const uid = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function cuil(dni) {
  const n = '20' + dni;
  const sum = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2].reduce((s, p, i) => s + p * Number(n[i]), 0);
  const d = (11 - (sum % 11)) % 11;
  return d < 10 ? n + d : null;
}
for (const [i, perfil] of [
  [1, 'dueno'],
  [2, 'supervisor'],
  [3, 'cocinero'],
  [4, 'cantinero'],
  [5, 'cliente_registrado'],
]) {
  let dni = String(30000000 + i);
  while (!cuil(dni)) dni = String(+dni + 10);
  await db.query('insert into auth.users values($1,$2,$3,$4)', [
    uid(i),
    `fixture${i}@example.invalid`,
    { perfil, estado: 'aprobado' },
    { nombres: 'Persona', apellidos: 'Prueba', dni, cuil: cuil(dni) },
  ]);
}
let cantidad = 0;
assert.equal(
  (await db.query("select nombre from productos where id='90000000-0000-4000-8000-000000000001'"))
    .rows[0].nombre,
  'Histórico incompleto',
);
assert.equal(
  (await db.query('select foto_url from mesas where numero=998')).rows[0].foto_url,
  null,
);
console.log('OK actualización conserva registros históricos sin inventar fotografías');
cantidad++;
async function caso(nombre, rol, actor, sql, falla = false) {
  await db.exec('begin');
  try {
    await db.exec(
      `set local role ${rol};select set_config('request.jwt.claim.sub','${actor ? uid(actor) : ''}',true)`,
    );
    let error;
    try {
      await db.exec(sql);
    } catch (e) {
      error = e;
    }
    assert.equal(Boolean(error), falla, `${nombre}: ${error?.message ?? 'fue aceptado'}`);
    cantidad++;
    console.log('OK', nombre);
  } finally {
    await db.exec('rollback');
  }
}
await db.exec(`insert into mesas(id,numero,cantidad_comensales,tipo)values('${uid(11)}',1,4,'estandar'),('${uid(12)}',2,4,'vip');
insert into sesiones_mesa(mesa_id,cliente_id)values('${uid(11)}','${uid(5)}');`);
await caso(
  'gerencia no libera estadía activa',
  'authenticated',
  1,
  `update mesas set estado='libre' where id='${uid(11)}'`,
  true,
);
await caso(
  'gerencia bloquea y desbloquea mesa libre',
  'authenticated',
  1,
  `update mesas set estado='ocupada' where id='${uid(12)}';update mesas set estado='libre' where id='${uid(12)}'`,
);
await caso(
  'supervisor no cambia QR',
  'authenticated',
  2,
  `update mesas set qr_token='otro' where id='${uid(12)}'`,
  true,
);
await caso(
  'cocinero no crea mesa directa',
  'authenticated',
  3,
  `insert into mesas(numero,cantidad_comensales,tipo)values(3,2,'vip')`,
  true,
);
await caso(
  'cocinero no publica producto directo',
  'authenticated',
  3,
  `insert into productos(tipo,nombre,descripcion,tiempo_elaboracion_min,precio,sector)values('plato','Prueba','Descripción válida',1,20,'cocina')`,
  true,
);
await caso(
  'cliente no invoca finalización',
  'authenticated',
  5,
  `select finalizar_alta('${uid(20)}','{}','[]')`,
  true,
);
await caso(
  'gerencia no eleva roles',
  'authenticated',
  1,
  `update usuarios set perfil='dueno' where id='${uid(5)}'`,
  true,
);
await caso(
  'CUIL inválido se rechaza en servidor',
  'service_role',
  null,
  `update usuarios set cuil='20123456789' where id='${uid(3)}'`,
  true,
);
await caso(
  'rango mesa',
  'service_role',
  null,
  `insert into mesas(numero,cantidad_comensales,tipo)values(0,2,'vip')`,
  true,
);
await caso(
  'bloqueo administrativo protege inserción estadía',
  'service_role',
  null,
  `update mesas set estado='ocupada' where id='${uid(12)}';update sesiones_mesa set estado='cerrada' where cliente_id='${uid(5)}';insert into sesiones_mesa(mesa_id,cliente_id)values('${uid(12)}','${uid(5)}')`,
  true,
);
for (const [actor, tipo] of [
  [3, 'plato'],
  [4, 'bebida'],
])
  for (const numeroFotos of [0, 1, 2, 3, 4]) {
    const id = uid(100 + actor * 10 + numeroFotos);
    const datos = {
      tipo,
      nombre: 'Producto controlado',
      descripcion: 'Descripción completa de prueba',
      minutos: 10,
      precio: 10,
    };
    const fotos = Array.from({ length: numeroFotos }, (_, i) => ({
      orden: i + 1,
      ruta: `fixture/${i}`,
      url: `https://fixture.invalid/${i}.jpg`,
    }));
    const sql = `select reservar_alta('${id}','${uid(actor)}','producto');insert into storage.objects(bucket_id,name)select 'fotos-productos','fixture/'||x from generate_series(0,3)x;select finalizar_alta('${id}','${JSON.stringify(datos)}','${JSON.stringify(fotos)}');select finalizar_alta('${id}','${JSON.stringify(datos)}','${JSON.stringify(fotos)}');`;
    await caso(
      `${tipo}: ${numeroFotos} fotos y reintento`,
      'service_role',
      null,
      sql,
      numeroFotos !== 3,
    );
  }
await db.close();
console.log(`${cantidad} pruebas SQL aprobadas; migraciones reproducidas desde cero.`);
