-- Solo las nuevas funciones de trigger: no son endpoints de la Data API.
revoke execute on function public.proteger_alta_empleado() from public,anon,authenticated;
revoke execute on function public.proteger_disponibilidad() from public,anon,authenticated;
revoke execute on function public.coordinar_estadia_mesa() from public,anon,authenticated;
