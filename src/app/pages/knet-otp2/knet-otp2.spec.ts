import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KnetOtp2 } from './knet-otp2';

describe('KnetOtp2', () => {
  let component: KnetOtp2;
  let fixture: ComponentFixture<KnetOtp2>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KnetOtp2],
    }).compileComponents();

    fixture = TestBed.createComponent(KnetOtp2);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
