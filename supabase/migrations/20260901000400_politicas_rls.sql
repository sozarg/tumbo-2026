-- migrations/20260901000400_politicas_rls.sql

alter table public.usuarios            enable row level security;
alter table public.dispositivos_push   enable row level security;
alter table public.mesas               enable row level security;
alter table public.productos           enable row level security;
alter table public.producto_fotos      enable row level security;
alter table public.niveles_propina     enable row level security;
alter table public.juegos              enable row level security;
alter table public.preguntas_encuesta  enable row level security;
alter table public.lista_espera        enable row level security;
alter table public.sesiones_mesa       enable row level security;
alter table public.pedidos             enable row level security;
alter table public.pedido_items        enable row level security;
alter table public.mensajes            enable row level security;
alter table public.encuestas           enable row level security;
alter table public.respuestas_encuesta enable row level security;
alter table public.partidas_juego      enable row level security;
alter table public.cuentas             enable row level security;
alter table public.notificaciones      enable row level security;

-- ── USUARIOS ────────────────────────────────────────────────
create policy usuarios_ver_propio on public.usuarios
  for select using (id = auth.uid());

create policy usuarios_staff_ve_todos on public.usuarios
  for select using (public.es_staff());

-- Alta de empleados: solo dueño o supervisor (punto 1)
-- Alta de clientes: cualquiera puede autoregistrarse (punto 5)
create policy usuarios_insertar on public.usuarios
  for insert with check (
    id = auth.uid() or public.es_gerencia()
  );

-- Solo gerencia aprueba o rechaza (puntos 7 y 8)
create policy usuarios_actualizar on public.usuarios
  for update using (id = auth.uid() or public.es_gerencia());

-- ── DISPOSITIVOS PUSH ───────────────────────────────────────
create policy dispositivos_propios on public.dispositivos_push
  for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- ── CATÁLOGO: todos leen, roles específicos escriben ────────
create policy mesas_lectura on public.mesas for select using (true);
create policy mesas_escritura on public.mesas
  for all using (public.es_gerencia()) with check (public.es_gerencia());

create policy productos_lectura on public.productos for select using (true);
-- El cocinero da de alta platos y postres (punto 2);
-- el cantinero, bebidas (punto 3)
create policy productos_alta on public.productos
  for insert with check (
    public.es_gerencia()
    or (public.perfil_actual() = 'cocinero'  and tipo in ('plato','postre'))
    or (public.perfil_actual() = 'cantinero' and tipo = 'bebida')
  );
create policy productos_modificacion on public.productos
  for update using (public.es_staff());

create policy fotos_lectura on public.producto_fotos for select using (true);
create policy fotos_escritura on public.producto_fotos
  for all using (public.es_staff()) with check (public.es_staff());

create policy propinas_lectura on public.niveles_propina for select using (true);
create policy juegos_lectura on public.juegos for select using (true);
create policy preguntas_lectura on public.preguntas_encuesta for select using (true);

-- ── LISTA DE ESPERA ─────────────────────────────────────────
create policy espera_cliente_propia on public.lista_espera
  for select using (cliente_id = auth.uid());
create policy espera_staff_ve_toda on public.lista_espera
  for select using (public.es_staff());
create policy espera_cliente_se_anota on public.lista_espera
  for insert with check (cliente_id = auth.uid());
-- El metre asigna; el cliente puede eliminarse a sí mismo (punto 9)
create policy espera_actualizar on public.lista_espera
  for update using (
    cliente_id = auth.uid()
    or public.perfil_actual() in ('metre','dueno','supervisor')
  );

-- ── SESIONES DE MESA ────────────────────────────────────────
create policy sesiones_cliente on public.sesiones_mesa
  for select using (cliente_id = auth.uid());
create policy sesiones_staff on public.sesiones_mesa
  for select using (public.es_staff());
create policy sesiones_crear on public.sesiones_mesa
  for insert with check (
    cliente_id = auth.uid() or public.perfil_actual() in ('metre','dueno','supervisor')
  );
create policy sesiones_actualizar on public.sesiones_mesa
  for update using (cliente_id = auth.uid() or public.es_staff());

-- ── PEDIDOS ─────────────────────────────────────────────────
create policy pedidos_cliente on public.pedidos
  for select using (
    exists (select 1 from public.sesiones_mesa s
             where s.id = sesion_mesa_id and s.cliente_id = auth.uid())
  );
create policy pedidos_staff on public.pedidos
  for select using (public.es_staff());
create policy pedidos_cliente_crea on public.pedidos
  for insert with check (
    exists (select 1 from public.sesiones_mesa s
             where s.id = sesion_mesa_id and s.cliente_id = auth.uid())
  );
-- El cliente modifica su borrador o su pedido rechazado (punto 13);
-- el mozo confirma o rechaza (puntos 13 y 14)
create policy pedidos_actualizar on public.pedidos
  for update using (
    (exists (select 1 from public.sesiones_mesa s
              where s.id = sesion_mesa_id and s.cliente_id = auth.uid())
      and estado in ('borrador','rechazado'))
    or public.es_staff()
  );

-- ── ÍTEMS ───────────────────────────────────────────────────
create policy items_ver on public.pedido_items
  for select using (
    public.es_staff()
    or exists (select 1 from public.pedidos p
                 join public.sesiones_mesa s on s.id = p.sesion_mesa_id
                where p.id = pedido_id and s.cliente_id = auth.uid())
  );
create policy items_cliente_edita on public.pedido_items
  for all using (
    exists (select 1 from public.pedidos p
              join public.sesiones_mesa s on s.id = p.sesion_mesa_id
             where p.id = pedido_id and s.cliente_id = auth.uid()
               and p.estado in ('borrador','rechazado'))
  ) with check (
    exists (select 1 from public.pedidos p
              join public.sesiones_mesa s on s.id = p.sesion_mesa_id
             where p.id = pedido_id and s.cliente_id = auth.uid()
               and p.estado in ('borrador','rechazado'))
  );
-- Cocina y bar marcan listos SOLO los ítems de su sector
create policy items_sector_actualiza on public.pedido_items
  for update using (
    (public.perfil_actual() = 'cocinero'  and sector = 'cocina')
    or (public.perfil_actual() = 'cantinero' and sector = 'bar')
    or public.perfil_actual() in ('mozo','dueno','supervisor')
  );

-- ── MENSAJES: el cliente de la sesión y TODOS los mozos ─────
create policy mensajes_ver on public.mensajes
  for select using (
    public.perfil_actual() in ('mozo','dueno','supervisor')
    or exists (select 1 from public.sesiones_mesa s
                where s.id = sesion_mesa_id and s.cliente_id = auth.uid())
  );
create policy mensajes_escribir on public.mensajes
  for insert with check (
    autor_id = auth.uid() and (
      public.perfil_actual() = 'mozo'
      or exists (select 1 from public.sesiones_mesa s
                  where s.id = sesion_mesa_id and s.cliente_id = auth.uid())
    )
  );

-- ── ENCUESTAS: cualquiera lee los resultados (puntos 9 y 22) ─
create policy encuestas_lectura on public.encuestas for select using (true);
create policy respuestas_lectura on public.respuestas_encuesta for select using (true);
create policy encuestas_crear on public.encuestas
  for insert with check (cliente_id = auth.uid());
create policy respuestas_crear on public.respuestas_encuesta
  for insert with check (
    exists (select 1 from public.encuestas e
             where e.id = encuesta_id and e.cliente_id = auth.uid())
  );

-- ── JUEGOS: solo el cliente REGISTRADO puede jugar (punto 14) ─
create policy partidas_ver on public.partidas_juego
  for select using (cliente_id = auth.uid() or public.es_staff());
create policy partidas_crear on public.partidas_juego
  for insert with check (
    cliente_id = auth.uid() and public.perfil_actual() = 'cliente_registrado'
  );

-- ── CUENTAS ─────────────────────────────────────────────────
create policy cuentas_ver on public.cuentas
  for select using (
    public.es_staff()
    or exists (select 1 from public.sesiones_mesa s
                where s.id = sesion_mesa_id and s.cliente_id = auth.uid())
  );
create policy cuentas_cliente_solicita on public.cuentas
  for insert with check (
    exists (select 1 from public.sesiones_mesa s
             where s.id = sesion_mesa_id and s.cliente_id = auth.uid())
  );
create policy cuentas_actualizar on public.cuentas
  for update using (
    public.es_staff()
    or exists (select 1 from public.sesiones_mesa s
                where s.id = sesion_mesa_id and s.cliente_id = auth.uid())
  );

-- ── NOTIFICACIONES ──────────────────────────────────────────
create policy notificaciones_propias on public.notificaciones
  for select using (usuario_id = auth.uid());
