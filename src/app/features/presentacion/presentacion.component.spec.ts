import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';
import { provideRouter } from '@angular/router';
import { Presentacion } from './presentacion.component';

describe('Presentacion', () => {
  let component: Presentacion;
  let fixture: ComponentFixture<Presentacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Presentacion],
      providers: [provideIonicAngular(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Presentacion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
