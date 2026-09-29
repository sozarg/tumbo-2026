-- Punto 9/10: un cliente no puede abrir una estadía por su cuenta.
-- Solo el metre/gerencia asignan; el cliente confirma la mesa asignada.
drop policy if exists sesiones_crear on public.sesiones_mesa;

create policy sesiones_crear on public.sesiones_mesa
  for insert with check (
    public.esta_habilitado()
    and (
      public.perfil_actual() in ('metre', 'dueno', 'supervisor')
      or (
        cliente_id = auth.uid()
        and exists (
          select 1
          from public.lista_espera e
          where e.cliente_id = auth.uid()
            and e.estado = 'asignado'
            and e.mesa_id = public.sesiones_mesa.mesa_id
        )
      )
    )
  );
