import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteNoteModal } from './delete-note-modal';

describe('DeleteNoteModal', () => {
  let component: DeleteNoteModal;
  let fixture: ComponentFixture<DeleteNoteModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteNoteModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeleteNoteModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
