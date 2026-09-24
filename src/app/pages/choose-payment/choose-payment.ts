import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SidebarComponent } from '../../ui/sidebar/sidebar';
import { ButtonComponent } from '../../ui/button/button';
import { ToastService } from '../../services/toast';

@Component({
  selector: 'app-choose-payment',
  standalone: true,
  imports: [CommonModule, SidebarComponent, ButtonComponent],
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

  ngOnInit() {
    const stored = localStorage.getItem('pay_total_kd');
    if (stored) {
      const num = parseFloat(stored.replace(',', '.'));
      this.totalAmount.set(isNaN(num) ? '0.000' : num.toFixed(3));
    }
  }

  selectMethod(method: string) {
    this.selectedMethod.set(method);
    if (method === 'google-pay' || method === 'credit-card') {
      this.toastService.show('عذراً، هناك مشكلة في طريقة الدفع هذه حالياً وجاري العمل على حلها.', 'error');
    }
  }

  onNavigate(tab: string) {
    this.activeTab = tab;
  }

  onContinue() {
    const method = this.selectedMethod();
    if (method === 'google-pay' || method === 'credit-card') {
      this.toastService.show('عذراً، هناك مشكلة في طريقة الدفع هذه حالياً وجاري العمل على حلها.', 'error');
      return;
    }
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
