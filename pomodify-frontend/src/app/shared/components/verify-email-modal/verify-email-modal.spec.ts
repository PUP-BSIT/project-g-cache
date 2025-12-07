import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { VerifyEmailModal } from './verify-email-modal';

describe('VerifyEmailModal', () => {
  let component: VerifyEmailModal;
  let fixture: ComponentFixture<VerifyEmailModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyEmailModal, HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} }
      ],
      schemas: [NO_ERRORS_SCHEMA]
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
