-- ═══════════════════════════════════════════════════════════════════
-- supabase/seed_data/historico.sql
--
-- Cuatro semanas de actividad simulada, como pide el enunciado («una
-- base externa con interacciones simuladas de al menos cuatro
-- semanas»). Alimenta los gráficos del punto 20.
--
-- Genera, para cada uno de los últimos 28 días, entre 3 y 6 estadías ya
-- cerradas, con su pedido pagado, sus ítems, su cuenta confirmada y su
-- encuesta respondida.
--
-- CÓMO SE RECONOCE
-- Todo cuelga de ocho clientes ficticios, `historico1..8@tumbo.demo`.
-- No pueden ingresar: su clave es aleatoria y nadie la conoce.
-- `historico-borrar.sql` borra todo lo que generó este script.
--
-- SE PUEDE CORRER MÁS DE UNA VEZ
-- Si ya hay historial, no genera otro.
--
-- NO AVISA A NADIE
-- Las cuentas disparan avisos push al mozo. Este script los apaga para
-- su transacción (`tumbo.sin_avisos`): son cuentas viejas.
--
-- Se puede correr con psql o pegar solo el bloque anónimo (por ejemplo
-- en el SQL Editor): todo lo que necesita está adentro.
-- ═══════════════════════════════════════════════════════════════════
begin;

do $$
declare
  v_nombres text[] := array['Sofía','Lucas','Valentina','Tomás','Julieta','Bruno','Martina','Agustín'];
  v_apellidos text[] := array['Rossi','Fernández','López','García','Díaz','Molina','Suárez','Acosta'];
  v_comentarios text[] := array[
    'Muy rica la comida, volvemos seguro.',
    'La atención fue excelente.',
    'Tardaron un poco, pero valió la pena.',
    'Lindo lugar para venir con amigos.',
    'Me encantó el postre.'
  ];
  v_clientes uuid[] := array[]::uuid[];
  v_mesas uuid[];
  v_productos uuid[];
  v_mozo uuid;
  v_niveles public.niveles_propina[];
  v_nivel public.niveles_propina;
  v_pregunta public.preguntas_encuesta;
  v_id uuid;
  v_sesion uuid;
  v_pedido uuid;
  v_encuesta uuid;
  v_cliente uuid;
  v_apertura timestamptz;
  v_calculo record;
  v_valor jsonb;
  v_propina numeric;
  v_azar numeric;
  d int;
  s int;
  i int;
begin
  -- Dentro del bloque y no antes: así vale aunque quien lo ejecute corra
  -- cada sentencia en su propia transacción. Sin esto, cada cuenta
  -- histórica le mandaría una push al mozo.
  perform set_config('tumbo.sin_avisos', 'si', true);

  if exists (
    select 1 from public.sesiones_mesa s
      join public.usuarios u on u.id = s.cliente_id
     where u.correo like 'historico%@tumbo.demo'
  ) then
    raise notice 'Ya hay historial cargado: no se genera otro.';
    return;
  end if;

  -- Clientes históricos. El trigger de auth.users arma su perfil; los
  -- datos tienen que pasar las mismas validaciones que cualquier alta.
  for i in 1..8 loop
    v_id := ('66666666-6666-4666-8666-66666666660' || i)::uuid;
    if not exists (select 1 from auth.users where id = v_id) then
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
        'historico' || i || '@tumbo.demo',
        extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"],"perfil":"cliente_registrado","estado":"aprobado"}',
        jsonb_build_object('nombres', v_nombres[i], 'apellidos', v_apellidos[i], 'dni', (40000000 + i)::text),
        now() - interval '40 days', now() - interval '40 days', '', '', '', ''
      );
    end if;
    v_clientes := v_clientes || v_id;
  end loop;

  select array_agg(id) into v_mesas from public.mesas;
  -- Los productos de la carta: activos y con sus tres fotos.
  select array_agg(p.id) into v_productos
    from public.productos p
   where p.activo
     and (select count(*) from public.producto_fotos f where f.producto_id = p.id) = 3;
  if v_productos is null then
    select array_agg(id) into v_productos from public.productos where activo;
  end if;
  select id into v_mozo from public.usuarios
   where perfil = 'mozo' and estado = 'aprobado' order by creado_en limit 1;
  select array_agg(n order by n.porcentaje desc) into v_niveles from public.niveles_propina n;

  if v_mesas is null or v_productos is null or v_niveles is null then
    raise exception 'Faltan mesas, productos o niveles de propina para generar el historial.';
  end if;

  for d in 0..27 loop
    for s in 1..(3 + floor(random() * 4)::int) loop
      v_cliente := v_clientes[1 + floor(random() * array_length(v_clientes, 1))::int];
      v_apertura := (current_date - (28 - d)) + time '12:00' + random() * interval '9 hours';

      insert into public.sesiones_mesa (mesa_id, cliente_id, estado, comensales, abierta_en, cerrada_en)
      values (
        v_mesas[1 + floor(random() * array_length(v_mesas, 1))::int], v_cliente, 'cerrada',
        1 + floor(random() * 4)::int, v_apertura, v_apertura + interval '70 minutes'
      )
      returning id into v_sesion;

      insert into public.pedidos (
        sesion_mesa_id, estado, mozo_id, creado_en, enviado_en, confirmado_en,
        listo_en, entregado_en, recibido_en
      ) values (
        v_sesion, 'pagado', v_mozo, v_apertura + interval '5 minutes',
        v_apertura + interval '6 minutes', v_apertura + interval '8 minutes',
        v_apertura + interval '28 minutes', v_apertura + interval '32 minutes',
        v_apertura + interval '33 minutes'
      )
      returning id into v_pedido;

      for i in 1..(1 + floor(random() * 4)::int) loop
        insert into public.pedido_items (pedido_id, producto_id, cantidad, estado, listo_en)
        values (
          v_pedido, v_productos[1 + floor(random() * array_length(v_productos, 1))::int],
          1 + floor(random() * 3)::int, 'listo', v_apertura + interval '28 minutes'
        )
        on conflict (pedido_id, producto_id) do nothing;
      end loop;

      -- La propina sigue a la experiencia: casi siempre buena.
      v_azar := random();
      v_nivel := v_niveles[case when v_azar < 0.35 then 1 when v_azar < 0.65 then 2
                                when v_azar < 0.85 then 3 when v_azar < 0.95 then 4 else 5 end];
      select * into v_calculo from public.calcular_cuenta(v_sesion);
      v_propina := round(v_calculo.base * v_nivel.porcentaje / 100, 2);

      insert into public.cuentas (
        sesion_mesa_id, subtotal, descuento_pct, descuento_monto, nivel_propina, propina_pct,
        propina_monto, total, estado, mozo_id, solicitada_en, pagada_en, confirmada_en
      ) values (
        v_sesion, v_calculo.subtotal, v_calculo.descuento_pct, v_calculo.descuento_monto,
        v_nivel.nivel, v_nivel.porcentaje, v_propina, v_calculo.base + v_propina,
        'confirmada', v_mozo, v_apertura + interval '55 minutes',
        v_apertura + interval '60 minutes', v_apertura + interval '65 minutes'
      );

      insert into public.encuestas (sesion_mesa_id, cliente_id, creado_en)
      values (v_sesion, v_cliente, v_apertura + interval '50 minutes')
      returning id into v_encuesta;

      for v_pregunta in select * from public.preguntas_encuesta where activa order by orden loop
        v_azar := random();
        v_valor := case v_pregunta.tipo
          when 'estrellas' then to_jsonb(case when v_azar < 0.45 then 5 when v_azar < 0.80 then 4
                                              when v_azar < 0.93 then 3 when v_azar < 0.98 then 2 else 1 end
                                         -- La atención mejora un poco semana a semana.
                                         + case when d >= 21 and v_azar >= 0.80 and v_azar < 0.93 then 1 else 0 end)
          when 'rango' then to_jsonb(6 + floor(random() * 5)::int)
          when 'radio' then to_jsonb(v_pregunta.opciones ->> (
                              case when v_azar < 0.15 then 0 when v_azar < 0.50 then 1
                                   when v_azar < 0.85 then 2 when v_azar < 0.96 then 3 else 4 end))
          when 'select' then to_jsonb(v_pregunta.opciones ->> floor(random() * jsonb_array_length(v_pregunta.opciones))::int)
          when 'checkbox' then (
            select jsonb_agg(o) from (
              select o from jsonb_array_elements_text(v_pregunta.opciones) o
               order by random() limit 1 + floor(random() * 3)::int
            ) elegidas)
          when 'interruptor' then to_jsonb(v_azar > 0.12)
          when 'texto_largo' then case when v_azar < 0.4
                                       then to_jsonb(v_comentarios[1 + floor(random() * 5)::int])
                                  end
        end;

        if v_valor is not null then
          insert into public.respuestas_encuesta (encuesta_id, pregunta_id, valor)
          values (v_encuesta, v_pregunta.id, v_valor);
        end if;
      end loop;
    end loop;
  end loop;
end $$;

commit;
