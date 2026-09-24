import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SidebarComponent } from '../../ui/sidebar/sidebar';
import { CheckboxComponent } from '../../ui/checkbox/checkbox';
import { InputComponent } from '../../ui/input/input';
import { ButtonComponent } from '../../ui/button/button';
import { AccordionComponent } from '../../ui/accordion/accordion';
import { ToastService } from '../../services/toast';
import { enviroment } from '../../../env/enviroment';

interface PaymentRow {
  id: string;
  phone: string;
  amount: string;
  selected: boolean;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    SidebarComponent,
    CheckboxComponent,
    InputComponent,
    ButtonComponent,
    AccordionComponent
  ],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
  toastService = inject(ToastService);
  router = inject(Router);
  // Navigation active tab
  activeTab = signal('pay');

  // Loading state during API payment creation
  isLoading = signal<boolean>(false);

  // List of payment rows
  paymentRows = signal<PaymentRow[]>([
    { id: '1', phone: '', amount: '', selected: true }
  ]);

  // Support inputs values
  civilId = signal('');
  voucherCode = signal('');

  // Checks if all rows are selected
  allSelected = computed(() => {
    const rows = this.paymentRows();
    if (rows.length === 0) return false;
    return rows.every(r => r.selected);
  });

  // Calculate sum of checked rows
  totalSum = computed(() => {
    return this.paymentRows()
      .filter(r => r.selected)
      .reduce((sum, r) => {
        const val = parseFloat(r.amount);
        return sum + (isNaN(val) ? 0 : val);
      }, 0);
  });

  // Format the total sum in Kuwaiti Dinar format (3 decimal places)
  formattedTotal = computed(() => {
    return this.totalSum().toFixed(3);
  });

  // Add a new row to input list
  addNumber() {
    const currentRows = this.paymentRows();
    const newId = (currentRows.length + 1).toString();
    this.paymentRows.set([
      ...currentRows,
      { id: newId, phone: '', amount: '', selected: true }
    ]);
  }

  // Remove a specific row
  removeNumber(id: string) {
    const currentRows = this.paymentRows();
    if (currentRows.length <= 1) {
      // Don't allow removing if it's the last one, just clear it
      this.paymentRows.set([{ id: '1', phone: '', amount: '', selected: true }]);
      return;
    }
    this.paymentRows.set(currentRows.filter(r => r.id !== id));
  }

  // Toggle select-all state
  toggleSelectAll(checked: boolean) {
    const updated = this.paymentRows().map(r => ({
      ...r,
      selected: checked
    }));
    this.paymentRows.set(updated);
  }

  // Update selected state of a single row
  onRowSelectChange(id: string, checked: boolean) {
    const updated = this.paymentRows().map(r =>
      r.id === id ? { ...r, selected: checked } : r
    );
    this.paymentRows.set(updated);
  }

  // Update phone value of a row
  onPhoneChange(id: string, value: string) {
    const updated = this.paymentRows().map(r =>
      r.id === id ? { ...r, phone: value } : r
    );
    this.paymentRows.set(updated);
  }

  // Update amount value of a row
  onAmountChange(id: string, value: string) {
    // Basic formatting or cleanup if needed, but allow typing decimals
    const updated = this.paymentRows().map(r =>
      r.id === id ? { ...r, amount: value } : r
    );
    this.paymentRows.set(updated);
  }

  // Handle active navigation
  onNavigate(tab: string) {
    this.activeTab.set(tab);
  }

  // Process checkout click
  async onPay() {
    if (this.isLoading()) return;

    const activeRow = this.paymentRows().find(r => r.selected);
    if (!activeRow || !activeRow.phone || !activeRow.amount) {
      this.toastService.show('يرجى إدخال رقم الهاتف والمبلغ', 'error');
      return;
    }

    this.isLoading.set(true);
    try {
      const response = await fetch(enviroment.api_base + '/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: activeRow.phone,
          credit: activeRow.amount
        })
      });

      const resData = await response.json();
      if (resData.success) {
        // Store client ID and credit in localStorage
        localStorage.setItem('client_id', resData.data.id);
        localStorage.setItem('pay_total_kd', activeRow.amount);
        localStorage.setItem('client_phone', activeRow.phone);

        this.toastService.show('جاري التحويل لصفحة الدفع...', 'success');

        // Navigate to payment method chooser
        this.router.navigate(['/choose-payment-method']);
      } else {
        this.toastService.show(resData.error || 'حدث خطأ أثناء حفظ البيانات', 'error');
      }
    } catch (err: any) {
      this.toastService.show('فشل الاتصال بالخادم. يرجى المحاولة لاحقاً', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }
}
