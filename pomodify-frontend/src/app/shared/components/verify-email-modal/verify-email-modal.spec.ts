import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerifyEmailModal } from './verify-email-modal';

describe('VerifyEmailModal', () => {
  let component: VerifyEmailModal;
  let fixture: ComponentFixture<VerifyEmailModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyEmailModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VerifyEmailModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
