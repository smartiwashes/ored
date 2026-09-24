import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChoosePayment } from './choose-payment';

describe('ChoosePayment', () => {
  let component: ChoosePayment;
  let fixture: ComponentFixture<ChoosePayment>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChoosePayment],
    }).compileComponents();

    fixture = TestBed.createComponent(ChoosePayment);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
