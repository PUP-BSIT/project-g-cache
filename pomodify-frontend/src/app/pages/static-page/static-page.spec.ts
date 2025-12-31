import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StaticPage } from './static-page';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

describe('StaticPage', () => {
  let component: StaticPage;
  let fixture: ComponentFixture<StaticPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaticPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              routeConfig: { path: 'about' }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StaticPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have empty content initially', () => {
    expect(component.contentHtml).toBe('');
  });
});
