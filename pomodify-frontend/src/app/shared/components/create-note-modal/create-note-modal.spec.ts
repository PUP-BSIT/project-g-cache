import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { CreateNoteModal } from './create-note-modal';

describe('CreateNoteModal', () => {
  let component: CreateNoteModal;
  let fixture: ComponentFixture<CreateNoteModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateNoteModal, HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateNoteModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
