import { TestBed } from '@angular/core/testing';
import { AppAudio } from './app-audio.service';

describe('AppAudio', () => {
  let service: AppAudio;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AppAudio);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
