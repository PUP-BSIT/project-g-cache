import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerifyComponent } from './verify.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';

describe('VerifyComponent', () => {
  let component: VerifyComponent;
  let fixture: ComponentFixture<VerifyComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => key === 'token' ? 'test-token' : null
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VerifyComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have null success initially', () => {
    expect(component.success).toBeNull();
  });

  it('should have empty message initially', () => {
    expect(component.message).toBe('');
  });

  it('should verify email on init with token', () => {
    fixture.detectChanges();
    
    const req = httpMock.expectOne(req => req.url.includes('token=test-token'));
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: 'Email verified!' });
    
    expect(component.success).toBeTrue();
    expect(component.message).toBe('Email verified!');
  });

  it('should handle verification failure', () => {
    fixture.detectChanges();
    
    const req = httpMock.expectOne(req => req.url.includes('token=test-token'));
    req.flush({ success: false, message: 'Invalid token' }, { status: 400, statusText: 'Bad Request' });
    
    expect(component.success).toBeFalse();
  });
});
