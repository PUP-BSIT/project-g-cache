import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SessionTimerComponent } from './session-timer';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { Component, signal } from '@angular/core';

describe('SessionTimerComponent', () => {
  let component: SessionTimerComponent;
  let fixture: ComponentFixture<SessionTimerComponent>;
  let mockDialog: jasmine.SpyObj<MatDialog>;

  beforeEach(async () => {
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockDialog.open.and.returnValue({ afterClosed: () => of(null) } as any);

    await TestBed.configureTestingModule({
      imports: [SessionTimerComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MatDialog, useValue: mockDialog }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SessionTimerComponent);
    component = fixture.componentInstance;
    
    // Set required inputs
    fixture.componentRef.setInput('sessionId', 1);
    fixture.componentRef.setInput('activityTitle', 'Test Activity');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have required inputs', () => {
    expect(component.sessionId()).toBe(1);
    expect(component.activityTitle()).toBe('Test Activity');
  });

  it('should start with loading state', () => {
    expect((component as any).loading()).toBe(true);
  });

  it('should have null session initially', () => {
    expect((component as any).session()).toBeNull();
  });

  it('should have empty notes initially', () => {
    expect(component.notes).toBe('');
  });

  it('should have empty todos initially', () => {
    expect((component as any).todos().length).toBe(0);
  });

  it('should compute timer display', () => {
    expect((component as any).timerDisplay()).toBeDefined();
  });

  it('should compute focus time display', () => {
    expect((component as any).focusTimeDisplay()).toBe('00:00');
  });

  it('should compute break time display', () => {
    expect((component as any).breakTimeDisplay()).toBe('00:00');
  });

  it('should compute cycle display', () => {
    expect((component as any).cycleDisplay()).toBe('0/0');
  });

  it('should add todo item', () => {
    (component as any).addTodo();
    expect((component as any).todos().length).toBe(1);
  });

  it('should remove todo item', () => {
    (component as any).addTodo();
    const todoId = (component as any).todos()[0].id;
    (component as any).removeTodo(todoId);
    expect((component as any).todos().length).toBe(0);
  });

  it('should toggle todo done state', () => {
    (component as any).addTodo();
    const todoId = (component as any).todos()[0].id;
    expect((component as any).todos()[0].done).toBe(false);
    (component as any).toggleTodo(todoId);
    expect((component as any).todos()[0].done).toBe(true);
  });
});
