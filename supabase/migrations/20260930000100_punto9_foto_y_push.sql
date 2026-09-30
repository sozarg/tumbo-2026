-- Punto 9: un cliente anónimo no puede entrar a la espera sin nombre y foto.
-- La foto se sube primero al bucket y recién después se crea la entrada.
drop policy if exists espera_cliente_se_anota on public.lista_espera;

create policy espera_cliente_se_anota on public.lista_espera
  for insert with check (
    cliente_id = auth.uid()
    and public.esta_habilitado()
    and (
      public.perfil_actual() <> 'cliente_anonimo'
      or exists (
        select 1 from public.usuarios u
        where u.id = auth.uid()
          and nullif(trim(u.nombres), '') is not null
          and nullif(trim(u.foto_url), '') is not null
      )
    )
  );

comment on policy espera_cliente_se_anota on public.lista_espera is
  'Los clientes anónimos deben tener nombre y foto antes de ingresar a la lista.';
