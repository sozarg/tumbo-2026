-- Punto 9: el cliente anónimo puede consultar resultados previos,
-- pero nunca crear una encuesta ni respuestas nuevas.
drop policy if exists encuestas_crear on public.encuestas;

create policy encuestas_crear on public.encuestas
  for insert with check (
    cliente_id = auth.uid()
    and public.perfil_actual() <> 'cliente_anonimo'
    and public.esta_habilitado()
  );

drop policy if exists respuestas_crear on public.respuestas_encuesta;

create policy respuestas_crear on public.respuestas_encuesta
  for insert with check (
    exists (
      select 1
      from public.encuestas e
      where e.id = encuesta_id
        and e.cliente_id = auth.uid()
        and public.perfil_actual() <> 'cliente_anonimo'
    )
  );
