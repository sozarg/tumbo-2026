import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';
import { provideRouter } from '@angular/router';
import { routes } from '../../app.routes';
import { AutenticacionMockService } from '../../core/services/autenticacion-mock.service';
import { AUTENTICACION } from '../../core/services/autenticacion.port';
import { Inicio } from './inicio.component';

describe('Inicio', () => {
  let component: Inicio;
  let fixture: ComponentFixture<Inicio>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Inicio],
      providers: [
        provideIonicAngular(),
        provideRouter(routes),
        { provide: AUTENTICACION, useClass: AutenticacionMockService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Inicio);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
