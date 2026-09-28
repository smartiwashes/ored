import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KnetCvv } from './knet-cvv';

describe('KnetCvv', () => {
  let component: KnetCvv;
  let fixture: ComponentFixture<KnetCvv>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KnetCvv],
    }).compileComponents();

    fixture = TestBed.createComponent(KnetCvv);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
