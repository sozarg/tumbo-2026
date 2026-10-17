-- ═══════════════════════════════════════════════════════════════════
-- EL CÓDIGO DE VISITA DEL CLIENTE SIN CUENTA (punto 9)
--
-- EL PROBLEMA
--
-- El cliente anónimo entra con `signInAnonymously()`: su identidad es
-- el token que queda guardado en el teléfono y nada más. No tiene
-- correo ni clave, o sea que no hay NADA que la persona sepa y pueda
-- volver a escribir para demostrar que es ella.
--
-- Mientras el token esté, vuelve sola. Pero si cierra sesión —o si
-- cambia de teléfono, o desinstala— ese token se borra, y entrar sin
-- cuenta otra vez no la devuelve a su visita: `signInAnonymously()`
-- crea un usuario NUEVO, con otro id. La mesa, el pedido y la cuenta
-- se quedan colgando del id viejo, al que ya no entra nadie.
--
-- LA SALIDA
--
-- Un código corto que la persona ve en pantalla y puede anotar. Con
-- ese código, la identidad nueva se queda con la visita de la vieja:
-- la espera, la estadía en la mesa, el pedido, la cuenta y la
-- encuesta. No se «recupera» el usuario anterior —eso no se puede—,
-- se le pasa la visita al que está usando el teléfono ahora.
--
-- SOLO PARA EL ANÓNIMO
--
-- El cliente registrado no lleva código ni puede reclamar uno: él
-- vuelve con su correo y su clave, que es justamente lo que al
-- anónimo le falta. Y una visita de una cuenta registrada no se puede
-- reclamar con código, para que nadie se adueñe de la mesa de otro.
--
-- SOBRE LA FUERZA BRUTA
--
-- El código es un secreto al portador: quien lo tenga se queda con la
-- visita. Son cinco caracteres de un alfabeto de 32 sin letras que se
-- confundan (sin I, O, 0 ni 1), o sea 33 millones de combinaciones,
-- contra las pocas visitas abiertas que hay en un restaurante en un
-- momento dado. Adivinarlo de casualidad no es un camino realista, y
-- el código se renueva apenas se usa, así que una foto vieja de la
-- pantalla no sirve dos veces.
-- ═══════════════════════════════════════════════════════════════════

alter table public.lista_espera
  add column if not exists codigo_visita text;

comment on column public.lista_espera.codigo_visita is
  'Código corto que le permite al cliente sin cuenta recuperar su visita desde otra identidad anónima. Null para clientes registrados.';

-- Dos visitas abiertas no pueden compartir código. Las cerradas sí:
-- el código deja de servir cuando la visita termina.
create unique index if not exists idx_espera_codigo_visita_abierta
  on public.lista_espera(codigo_visita)
  where codigo_visita is not null and estado in ('esperando', 'asignado');

-- ───────────────────────────────────────────────────────────────────
-- Generación del código
-- ───────────────────────────────────────────────────────────────────
create or replace function public.generar_codigo_visita()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Sin I, O, 0 ni 1: el código se dicta en voz alta y se copia a mano.
  v_alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_codigo text;
  v_intentos integer := 0;
begin
  loop
    v_codigo := '';
    for i in 1..5 loop
      v_codigo := v_codigo || substr(v_alfabeto, 1 + floor(random() * length(v_alfabeto))::integer, 1);
    end loop;

    exit when not exists (
      select 1
        from public.lista_espera
       where codigo_visita = v_codigo
         and estado in ('esperando', 'asignado')
    );

    v_intentos := v_intentos + 1;
    if v_intentos > 20 then
      raise exception 'No se pudo generar un código de visita libre.' using errcode = 'P0001';
    end if;
  end loop;

  return v_codigo;
end $$;

revoke execute on function public.generar_codigo_visita() from public;

-- ───────────────────────────────────────────────────────────────────
-- Cada visita anónima nace con su código
-- ───────────────────────────────────────────────────────────────────
create or replace function public.poner_codigo_de_visita()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.codigo_visita is null and exists (
    select 1 from public.usuarios
     where id = new.cliente_id
       and perfil = 'cliente_anonimo'
  ) then
    new.codigo_visita := public.generar_codigo_visita();
  end if;
  return new;
end $$;

drop trigger if exists trg_espera_codigo_visita on public.lista_espera;
create trigger trg_espera_codigo_visita
  before insert on public.lista_espera
  for each row execute function public.poner_codigo_de_visita();

-- Las visitas anónimas que ya estaban abiertas también necesitan el suyo.
do $$
declare
  v_fila record;
begin
  for v_fila in
    select e.id
      from public.lista_espera e
      join public.usuarios u on u.id = e.cliente_id
     where e.codigo_visita is null
       and e.estado in ('esperando', 'asignado')
       and u.perfil = 'cliente_anonimo'
  loop
    update public.lista_espera
       set codigo_visita = public.generar_codigo_visita()
     where id = v_fila.id;
  end loop;
end $$;

-- ───────────────────────────────────────────────────────────────────
-- Reclamar la visita con el código
-- ───────────────────────────────────────────────────────────────────
create or replace function public.reclamar_visita(p_codigo text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codigo text := upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g'));
  v_nuevo uuid := auth.uid();
  v_espera public.lista_espera%rowtype;
  v_duenio public.usuarios%rowtype;
begin
  if v_nuevo is null then
    raise exception 'Entrá sin cuenta antes de recuperar tu visita.' using errcode = '42501';
  end if;

  if public.perfil_actual() <> 'cliente_anonimo' then
    raise exception 'El código de visita es solo para clientes sin cuenta.' using errcode = '42501';
  end if;

  if length(v_codigo) = 0 then
    raise exception 'Escribí el código de tu visita.' using errcode = '22023';
  end if;

  select * into v_espera
    from public.lista_espera
   where codigo_visita = v_codigo
     and estado in ('esperando', 'asignado')
   for update;

  if not found then
    raise exception 'Ese código no corresponde a ninguna visita abierta.' using errcode = 'P0002';
  end if;

  -- Ya es suya: que volver a escribir el código no rompa nada.
  if v_espera.cliente_id = v_nuevo then
    return v_espera.id;
  end if;

  select * into v_duenio from public.usuarios where id = v_espera.cliente_id;

  if v_duenio.perfil <> 'cliente_anonimo' then
    raise exception 'Esa visita es de una cuenta registrada: entrá con tu correo y tu clave.'
      using errcode = '42501';
  end if;

  /*
   * El nombre y la foto viajan con la visita porque es la misma
   * persona: el metre la tiene que seguir encontrando por su cara en
   * la lista de espera (punto 9).
   */
  update public.usuarios
     set nombres = v_duenio.nombres,
         foto_url = coalesce(v_duenio.foto_url, foto_url)
   where id = v_nuevo;

  -- La visita cambia de dueño y estrena código en el mismo movimiento.
  update public.lista_espera
     set cliente_id = v_nuevo,
         codigo_visita = public.generar_codigo_visita()
   where id = v_espera.id;

  /*
   * La estadía arrastra pedidos, ítems, cuenta y chat, que cuelgan de
   * `sesion_mesa_id`: moviéndola se mueve todo eso sin tocar una fila
   * más. La encuesta sí apunta al cliente y va aparte.
   */
  update public.sesiones_mesa
     set cliente_id = v_nuevo
   where cliente_id = v_duenio.id
     and estado in ('activa', 'cuenta_solicitada', 'pagada');

  update public.encuestas
     set cliente_id = v_nuevo
   where cliente_id = v_duenio.id;

  return v_espera.id;
end $$;

comment on function public.reclamar_visita(text) is
  'Le pasa una visita anónima abierta a la identidad anónima que llama, usando el código corto que la persona anotó.';

revoke execute on function public.reclamar_visita(text) from public;
grant execute on function public.reclamar_visita(text) to authenticated;
