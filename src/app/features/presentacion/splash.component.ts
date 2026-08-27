import { NgOptimizedImage } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Presentacion } from './presentacion.component';

@Component({
  imports: [NgOptimizedImage, Presentacion],
  selector: 'tumbo-splash',
  styleUrl: './splash.component.scss',
  templateUrl: './splash.component.html',
})
export class Splash {
  private readonly router = inject(Router);

  finalizarTransicion(event: AnimationEvent): void {
    if (!event.animationName.endsWith('splash-fade-out')) {
      return;
    }

    void this.router.navigate(['/presentacion'], { replaceUrl: true });
  }
}
