import { Component } from '@angular/core';
import { IonApp } from '@ionic/angular/ion-app';
import { IonRouterOutlet } from '@ionic/angular/ion-router-outlet';

@Component({
  imports: [IonApp, IonRouterOutlet],
  selector: 'tumbo-root',
  styleUrl: './app.component.scss',
  templateUrl: './app.component.html',
})
export class App {}
