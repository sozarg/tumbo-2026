import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/provide';
import { provideRouter, withPreloading } from '@angular/router';
import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { AutenticacionMockService } from './core/services/autenticacion-mock.service';
import { AutenticacionSupabaseService } from './core/services/autenticacion-supabase.service';
import { AUTENTICACION } from './core/services/autenticacion.port';
import { provideCargadorDeIlustraciones } from './core/imagenes/cargador-de-ilustraciones';
import { PrecargaDiferida } from './core/rutas/precarga-diferida';
import { ManejadorErrores } from './core/services/manejador-errores';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // R9: hasta los errores que nadie atrapó tienen que vibrar.
    { provide: ErrorHandler, useClass: ManejadorErrores },
    provideIonicAngular(),
    /**
     * Deja que el navegador elija qué tamaño de ilustración bajar.
     *
     * Sin esto, `ngSrcset` no sirve: NgOptimizedImage necesita alguien
     * que traduzca "esta imagen a 480 píxeles" en una URL, y por defecto
     * devuelve siempre la misma. Ver `cargador-de-ilustraciones.ts`.
     */
    provideCargadorDeIlustraciones(),
    /**
     * Las rutas se precargan en segundo plano, pero RECIÉN CUANDO LA
     * SPLASH TERMINÓ. Con `PreloadAllModules` la precarga arrancaba
     * encima de la animación y le comía cuadros; el porqué y los
     * números están en `core/rutas/precarga-diferida.ts`.
     */
    provideRouter(routes, withPreloading(PrecargaDiferida)),
    {
      provide: AUTENTICACION,
      useFactory: () => {
        const mock = inject(AutenticacionMockService);
        const supabase = inject(AutenticacionSupabaseService);
        return environment.supabaseUrl && environment.supabaseAnonKey ? supabase : mock;
      },
    },
  ],
};
