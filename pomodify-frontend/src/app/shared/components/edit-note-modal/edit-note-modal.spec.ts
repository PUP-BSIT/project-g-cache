import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditNoteModal } from './edit-note-modal';

describe('EditNoteModal', () => {
  let component: EditNoteModal;
  let fixture: ComponentFixture<EditNoteModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditNoteModal]
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
