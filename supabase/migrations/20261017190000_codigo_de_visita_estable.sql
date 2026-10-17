-- ═══════════════════════════════════════════════════════════════════
-- EL CÓDIGO DE VISITA NO CAMBIA DURANTE LA VISITA
--
-- QUÉ SE CORRIGE
--
-- `reclamar_visita` renovaba el código cada vez que alguien lo usaba.
-- La idea era que una foto vieja de la pantalla no sirviera dos veces,
-- pero el precio es peor que el riesgo: la persona anotó ese código en
-- una servilleta, y si se queda sin batería por segunda vez lo que
-- tiene anotado ya no sirve. Justo en el caso para el que existe.
--
-- El riesgo que cubría es chico: el código solo vale mientras la visita
-- está abierta y muere con ella. Así que el código ahora es uno solo
-- por visita, de principio a fin.
--
-- El resto de la función queda igual: valida, mueve la espera, la
-- estadía y la encuesta, y copia el nombre y la foto.
-- ═══════════════════════════════════════════════════════════════════

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

  -- La visita cambia de dueño y CONSERVA su código: es el que la
  -- persona tiene anotado y puede necesitar de nuevo.
  update public.lista_espera
     set cliente_id = v_nuevo
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
  'Le pasa una visita anónima abierta a la identidad anónima que llama, con el código corto que la persona anotó. El código no cambia mientras la visita siga abierta.';
