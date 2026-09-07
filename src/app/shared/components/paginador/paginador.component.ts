import { Component, computed, effect, input, model } from '@angular/core';

@Component({
  selector: 'tumbo-paginador',
  template: `
    @if (total() > 1) {
      <nav aria-label="Páginas del listado">
        <button
          type="button"
          aria-label="Elementos anteriores"
          [disabled]="actual() === 0"
          (click)="pagina.set(actual() - 1)"
        >
          ‹
        </button>
        <span aria-live="polite">{{ actual() + 1 }} de {{ total() }}</span>
        <button
          type="button"
          aria-label="Elementos siguientes"
          [disabled]="actual() >= total() - 1"
          (click)="pagina.set(actual() + 1)"
        >
          ›
        </button>
      </nav>
    }
  `,
  styles: `
    nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    button {
      min-height: 48px;
      min-width: 48px;
      border: 1px solid #003592;
      border-radius: 14px;
      background: #fbf1d5;
      color: #003592;
      font: inherit;
      font-size: 28px;
      cursor: pointer;
    }
    button:focus-visible {
      outline: 3px solid #003592;
      outline-offset: 2px;
    }
    button:disabled {
      opacity: 0.45;
      cursor: default;
    }
    span {
      color: #003592;
      font-size: 12px;
    }
  `,
})
export class Paginador {
  readonly total = input.required<number>();
  readonly pagina = model(0);
  protected readonly actual = computed(() =>
    Math.max(0, Math.min(this.pagina(), this.total() - 1)),
  );

  constructor() {
    effect(() => {
      if (this.pagina() !== this.actual()) this.pagina.set(this.actual());
    });
  }
}
