import { TestBed } from '@angular/core/testing';

import { DashboardWebsocket } from './dashboard-websocket';

describe('DashboardWebsocket', () => {
  let service: DashboardWebsocket;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DashboardWebsocket);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
