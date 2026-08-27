import { provideIonicAngular } from '@ionic/angular';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app.component';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideIonicAngular(), provideRouter([])],
    }).compileComponents();
  });

  it('crea la aplicación TUMBO', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renderiza el contenedor Ionic principal', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.nativeElement.querySelector('ion-app')).toBeTruthy();
  });
});
