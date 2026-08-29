-- supabase/seed_data/historico.sql
--
-- Genera ~28 días de estadías cerradas y pagadas, con pedidos, ítems,
-- cuentas confirmadas y encuestas respondidas, para que los gráficos
-- estadísticos del punto 20 tengan datos reales para mostrar
-- (ver riesgo R6 en CONTEXTO-PROYECTO.md).
--
-- Se apoya en un pool chico de "clientes históricos" sintéticos:
-- las restricciones de unicidad de sesiones activas (idx_sesion_activa_*)
-- solo aplican a estados activos, así que reutilizar clientes en
-- sesiones ya 'cerrada' no viola ningún constraint.

-- ─────────────────────────────────────────────────────────────
-- Clientes históricos (auth.users + public.usuarios)
-- ─────────────────────────────────────────────────────────────
do $$
declare
  v_clave text := crypt('Tumbo2026', gen_salt('bf'));
  v_instance uuid := '00000000-0000-0000-0000-000000000000';
  v_nombres text[] := array['Sofía','Lucas','Valentina','Tomás','Julieta','Bruno','Martina','Agustín'];
  v_apellidos text[] := array['Rossi','Fernández','López','García','Díaz','Molina','Suárez','Acosta'];
  v_id uuid;
  i int;
begin
  for i in 1..8 loop
    v_id := ('66666666-6666-6666-6666-66666666600' || i)::uuid;

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) values (
      v_instance, v_id, 'authenticated', 'authenticated',
      'historico' || i || '@tumbo.demo', v_clave, now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('perfil', case when i % 4 = 0 then 'cliente_anonimo' else 'cliente_registrado' end,
                          'nombres', v_nombres[i], 'apellidos', v_apellidos[i]),
      now(), now(), '', '', '', ''
    ) on conflict (id) do nothing;

    insert into public.usuarios (id, apellidos, nombres, dni, correo, perfil, estado)
    values (
      v_id, v_apellidos[i], v_nombres[i], (20000000 + i)::text,
      'historico' || i || '@tumbo.demo',
      case when i % 4 = 0 then 'cliente_anonimo' else 'cliente_registrado' end,
      'aprobado'
    ) on conflict (id) do nothing;
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 28 días de estadías, pedidos, cuentas y encuestas
-- ─────────────────────────────────────────────────────────────
do $$
declare
  v_mesas uuid[];
  v_clientes uuid[];
  v_productos uuid[];
  v_preguntas uuid[];
  v_dia date;
  v_sesiones_por_dia int;
  v_sesion_id uuid;
  v_pedido_id uuid;
  v_encuesta_id uuid;
  v_cuenta_calculo record;
  v_mesa uuid;
  v_cliente uuid;
  v_items_por_pedido int;
  v_producto uuid;
  v_cantidad int;
  v_hora_apertura timestamptz;
  v_niveles text[] := array['excelente','muy_bueno','bueno','regular','malo'];
  v_pct numeric[] := array[20,15,10,5,0];
  v_indice_nivel int;
  d int;
  s int;
  it int;
  p int;
begin
  select array_agg(id) into v_mesas from public.mesas;
  select array_agg(id) into v_clientes from public.usuarios
   where perfil in ('cliente_registrado','cliente_anonimo');
  select array_agg(id) into v_productos from public.productos;
  select array_agg(id) into v_preguntas from public.preguntas_encuesta;

  for d in 0..27 loop
    v_dia := (current_date - (27 - d));
    v_sesiones_por_dia := 3 + floor(random() * 4)::int; -- entre 3 y 6 por día

    for s in 1..v_sesiones_por_dia loop
      v_mesa := v_mesas[1 + floor(random() * array_length(v_mesas, 1))::int];
      v_cliente := v_clientes[1 + floor(random() * array_length(v_clientes, 1))::int];
      v_hora_apertura := v_dia + (time '12:00' + (random() * interval '9 hours'));
      v_sesion_id := gen_random_uuid();

      insert into public.sesiones_mesa
        (id, mesa_id, cliente_id, estado, comensales, abierta_en, cerrada_en)
      values
        (v_sesion_id, v_mesa, v_cliente, 'cerrada', 1 + floor(random() * 4)::int,
         v_hora_apertura, v_hora_apertura + interval '50 minutes');

      -- Pedido pagado con 1 a 4 ítems
      v_pedido_id := gen_random_uuid();
      insert into public.pedidos
        (id, sesion_mesa_id, estado, mozo_id, creado_en, confirmado_en, listo_en, entregado_en)
      values
        (v_pedido_id, v_sesion_id, 'pagado', '11111111-1111-1111-1111-111111111104',
         v_hora_apertura + interval '5 minutes', v_hora_apertura + interval '8 minutes',
         v_hora_apertura + interval '25 minutes', v_hora_apertura + interval '30 minutes');

      v_items_por_pedido := 1 + floor(random() * 4)::int;
      for it in 1..v_items_por_pedido loop
        v_producto := v_productos[1 + floor(random() * array_length(v_productos, 1))::int];
        v_cantidad := 1 + floor(random() * 3)::int;

        insert into public.pedido_items (pedido_id, producto_id, cantidad, sector, estado, listo_en)
        select v_pedido_id, v_producto, v_cantidad, p.sector, 'listo', v_hora_apertura + interval '25 minutes'
        from public.productos p where p.id = v_producto
        on conflict (pedido_id, producto_id) do nothing;
      end loop;

      -- Encuesta con respuesta a cada pregunta (controles variados)
      v_encuesta_id := gen_random_uuid();
      insert into public.encuestas (id, sesion_mesa_id, cliente_id, creado_en)
      values (v_encuesta_id, v_sesion_id, v_cliente, v_hora_apertura + interval '55 minutes');

      for p in 1..array_length(v_preguntas, 1) loop
        insert into public.respuestas_encuesta (encuesta_id, pregunta_id, valor)
        select v_encuesta_id, v_preguntas[p],
          case pe.tipo
            when 'estrellas' then to_jsonb(1 + floor(random() * 5)::int)
            when 'rango' then to_jsonb(1 + floor(random() * 10)::int)
            when 'radio' then to_jsonb((pe.opciones->>(floor(random() * jsonb_array_length(pe.opciones))::int)))
            when 'select' then to_jsonb((pe.opciones->>(floor(random() * jsonb_array_length(pe.opciones))::int)))
            when 'checkbox' then (
              select jsonb_agg(op) from (
                select op from jsonb_array_elements_text(pe.opciones) op
                order by random() limit 1 + floor(random() * 3)::int
              ) sub
            )
            when 'interruptor' then to_jsonb(random() > 0.3)
            else to_jsonb('Muy buena experiencia, repetiría sin dudas.'::text)
          end
        from public.preguntas_encuesta pe where pe.id = v_preguntas[p]
        on conflict (encuesta_id, pregunta_id) do nothing;
      end loop;

      -- Cuenta confirmada, con propina obligatoria (punto 21)
      select * into v_cuenta_calculo from public.calcular_cuenta(v_sesion_id);
      v_indice_nivel := 1 + floor(random() * 5)::int;

      insert into public.cuentas (
        sesion_mesa_id, subtotal, descuento_pct, descuento_monto,
        nivel_propina, propina_pct, propina_monto, total, estado,
        mozo_id, solicitada_en, pagada_en, confirmada_en
      ) values (
        v_sesion_id, v_cuenta_calculo.subtotal, v_cuenta_calculo.descuento_pct, v_cuenta_calculo.descuento_monto,
        v_niveles[v_indice_nivel]::nivel_satisfaccion, v_pct[v_indice_nivel],
        round(v_cuenta_calculo.base * v_pct[v_indice_nivel] / 100, 2),
        v_cuenta_calculo.base + round(v_cuenta_calculo.base * v_pct[v_indice_nivel] / 100, 2),
        'confirmada', '11111111-1111-1111-1111-111111111104',
        v_hora_apertura + interval '45 minutes', v_hora_apertura + interval '48 minutes',
        v_hora_apertura + interval '50 minutes'
      );
    end loop;
  end loop;
end $$;
