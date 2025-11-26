import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateNoteModal } from './create-note-modal';

describe('CreateNoteModal', () => {
  let component: CreateNoteModal;
  let fixture: ComponentFixture<CreateNoteModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateNoteModal]
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
