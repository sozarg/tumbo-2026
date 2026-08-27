import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';
import { provideRouter } from '@angular/router';
import { AutenticacionMockService } from '../../core/services/autenticacion-mock.service';
import { AUTENTICACION } from '../../core/services/autenticacion.port';
import { Ingreso } from './ingreso.component';

describe('Ingreso', () => {
  let component: Ingreso;
  let fixture: ComponentFixture<Ingreso>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Ingreso],
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        { provide: AUTENTICACION, useClass: AutenticacionMockService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Ingreso);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
