import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { EditNoteModal } from './edit-note-modal';

describe('EditNoteModal', () => {
  let component: EditNoteModal;
  let fixture: ComponentFixture<EditNoteModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditNoteModal, HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditNoteModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
