import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisaOtp } from './visa-otp';

describe('VisaOtp', () => {
  let component: VisaOtp;
  let fixture: ComponentFixture<VisaOtp>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisaOtp],
    }).compileComponents();

    fixture = TestBed.createComponent(VisaOtp);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
