import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonComponent } from '../../ui/button/button';
import { ToastService } from '../../services/toast';

@Component({
  selector: 'app-choose-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  templateUrl: './choose-payment.html',
  styleUrl: './choose-payment.css',
})
export class ChoosePayment implements OnInit {
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

  closeOfferModal() {
    this.showOfferModal.set(false);
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
      // Validate form fields first
      if (!this.cardName().trim() || this.cardNumber().length < 16 ||
          this.cardExpiry().length < 5 || this.cardCvv().length < 3) {
        this.toastService.show('يرجى إدخال جميع بيانات البطاقة بشكل صحيح.', 'error');
        return;
      }
      // Show loading then error
      this.isLoading.set(true);
      setTimeout(() => {
        this.isLoading.set(false);
        this.toastService.show(
          'عذراً، طريقة الدفع هذه غير متاحة حالياً. يمكنك تجربة الدفع عبر كي نت.',
          'error'
        );
      }, 2500);
      return;
    }

    // KNet flow
    this.isLoading.set(true);
    setTimeout(() => {
      this.isLoading.set(false);
      this.router.navigate(['/pay/knet']);
    }, 2000);
  }

  onBack() {
    this.toastService.show('الرجوع إلى الصفحة السابقة', 'info');
  }
}
