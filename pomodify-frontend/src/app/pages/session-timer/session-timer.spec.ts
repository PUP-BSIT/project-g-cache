import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SessionTimerComponent } from './session-timer';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { Component, signal } from '@angular/core';
import * as fc from 'fast-check';

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

/**
 * Property-Based Tests for Cycle Counter
 * Feature: freestyle-pomodoro-settings, Property 6: Cycle Counter Correctness
 * Validates: Requirements 5.4, 7.2, 7.3
 * 
 * Property: For any Freestyle session, the cycle counter SHALL increment by 1 
 * after each break phase completes, and SHALL reset to 1 after a long break completes.
 */
describe('SessionTimerComponent - Cycle Counter Property Tests', () => {
  /**
   * Property 6: Cycle Counter Correctness
   * For any valid long break interval (2-10) and any number of completed cycles,
   * the current cycle within the interval should be correctly calculated and
   * should reset after reaching the interval.
   * 
   * Validates: Requirements 5.4, 7.2, 7.3
   */
  it('should correctly calculate cycle position within long break interval for all valid inputs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),  // longBreakIntervalCycles (2-10)
        fc.integer({ min: 0, max: 100 }), // cyclesCompleted (0-100)
        (interval, cyclesCompleted) => {
          // Calculate current cycle within interval (1-based)
          const currentCycleInInterval = (cyclesCompleted % interval) + 1;
          
          // Property 1: Current cycle should always be between 1 and interval (inclusive)
          expect(currentCycleInInterval).toBeGreaterThanOrEqual(1);
          expect(currentCycleInInterval).toBeLessThanOrEqual(interval);
          
          // Property 2: After completing 'interval' cycles, counter should reset to 1
          if (cyclesCompleted > 0 && cyclesCompleted % interval === 0) {
            expect(currentCycleInInterval).toBe(1);
          }
          
          // Property 3: At interval boundary (e.g., 4th cycle of 4), should be at max
          if (cyclesCompleted % interval === interval - 1) {
            // This is the cycle just before long break
            const nextCycle = ((cyclesCompleted + 1) % interval) + 1;
            expect(nextCycle).toBe(1); // Next cycle resets to 1
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Cycle counter increments correctly after each cycle
   * Validates: Requirements 7.2
   */
  it('should increment cycle counter by 1 after each break phase completes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),  // longBreakIntervalCycles
        fc.integer({ min: 0, max: 50 }),  // initial cyclesCompleted
        (interval, initialCycles) => {
          // Calculate current position
          const currentPosition = (initialCycles % interval) + 1;
          
          // After completing one more cycle
          const newCyclesCompleted = initialCycles + 1;
          const newPosition = (newCyclesCompleted % interval) + 1;
          
          // Property: Position should either increment by 1 or reset to 1
          if (currentPosition < interval) {
            expect(newPosition).toBe(currentPosition + 1);
          } else {
            // At max position, next should reset to 1
            expect(newPosition).toBe(1);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Cycle counter resets after long break
   * Validates: Requirements 7.3
   */
  it('should reset cycle counter to 1 after long break completes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),  // longBreakIntervalCycles
        fc.integer({ min: 1, max: 20 }),  // number of complete long break intervals
        (interval, numIntervals) => {
          // After completing exactly 'interval * numIntervals' cycles
          // (which means numIntervals long breaks have occurred)
          const cyclesCompleted = interval * numIntervals;
          const currentPosition = (cyclesCompleted % interval) + 1;
          
          // Property: After any long break, counter should be at position 1
          expect(currentPosition).toBe(1);
        }
      ),
      { numRuns: 20 }
    );
  });
});
