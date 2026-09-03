import { Component, OnInit, inject } from '@angular/core';
import { IonApp } from '@ionic/angular/ion-app';
import { IonRouterOutlet } from '@ionic/angular/ion-router-outlet';
import { SonidosService } from './core/services/sonidos.service';

@Component({
  imports: [IonApp, IonRouterOutlet],
  selector: 'tumbo-root',
  styleUrl: './app.component.scss',
  templateUrl: './app.component.html',
})
export class App implements OnInit {
  private readonly sonidos = inject(SonidosService);

  ngOnInit(): void {
    this.sonidos.preparar();

    /**
     * R11: el sonido de cierre.
     *
     * Se escucha `visibilitychange` y no el evento `pause` de Capacitor
     * a propósito: funciona igual dentro de la webview y también en el
     * navegador, sin agregar otro plugin. Se dispara cuando la
     * aplicación se va a segundo plano, que es el momento en que Android
     * la considera cerrada.
     */
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.sonidos.sonarCierre();
      }
    });
  }
}
