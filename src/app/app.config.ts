import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/provide';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { AutenticacionMockService } from './core/services/autenticacion-mock.service';
import { AutenticacionSupabaseService } from './core/services/autenticacion-supabase.service';
import { AUTENTICACION } from './core/services/autenticacion.port';
import { AppAudio } from './services/app-audio.service'; // Asegúrate de ajustar la ruta según dónde tengas el servicio

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideIonicAngular(),
    provideRouter(routes),
    {
      provide: AUTENTICACION,
      useFactory: () => {
        const mock = inject(AutenticacionMockService);
        const supabase = inject(AutenticacionSupabaseService);
        return environment.supabaseUrl && environment.supabaseAnonKey ? supabase : mock;
      },
    },
    {
      // Inicializa el servicio de audio nativo apenas arranca la aplicación
      provide: 'APP_INITIALIZER',
      useFactory: () => {
        const audioService = inject(AppAudio);
        return () => audioService.init();
      },
      multi: true
    }
  ],
};