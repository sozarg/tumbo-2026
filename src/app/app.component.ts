import { Component, inject, OnInit } from '@angular/core';
import { IonApp } from '@ionic/angular/ion-app';
import { IonRouterOutlet } from '@ionic/angular/ion-router-outlet';
import { AppAudio } from './services/app-audio.service';

@Component({
  imports: [IonApp, IonRouterOutlet],
  selector: 'tumbo-root',
  styleUrl: './app.component.scss',
  templateUrl: './app.component.html',
})
export class App implements OnInit {
  private appAudio = inject(AppAudio);

  async ngOnInit() {
    // Inicializa la precarga y dispara el sonido de apertura por única vez
    await this.appAudio.init();
  }
}
