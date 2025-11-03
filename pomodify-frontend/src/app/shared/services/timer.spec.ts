import { TestBed } from '@angular/core/testing';

import { Timer } from './timer';

describe('Timer', () => {
  let service: Timer;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Timer);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
