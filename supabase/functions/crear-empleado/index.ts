import { atenderAlta } from '../_shared/alta.ts';
Deno.serve((req) => atenderAlta(req, 'empleado'));
