import { NgOptimizedImage } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  imports: [NgOptimizedImage],
  selector: 'tumbo-fondo-decorativo',
  styleUrl: './fondo-decorativo.component.scss',
  templateUrl: './fondo-decorativo.component.html',
})
export class FondoDecorativo {
  readonly aura = input(false);
}
