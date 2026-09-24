import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JuegoRecoleccion } from './juego-recoleccion.component';

describe('JuegoRecoleccion', () => {
  let component: JuegoRecoleccion;
  let fixture: ComponentFixture<JuegoRecoleccion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JuegoRecoleccion],
    }).compileComponents();

    fixture = TestBed.createComponent(JuegoRecoleccion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
