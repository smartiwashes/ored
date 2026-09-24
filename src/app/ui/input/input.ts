import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [],
  templateUrl: './input.html',
})
export class InputComponent {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() type = 'text';
  @Input() value: any = '';
  @Input() required = false;
  @Input() suffix = '';
  @Input() id = '';
  @Input() disabled = false;
  @Input() textAlign: 'left' | 'right' | 'center' = 'right';
  @Input() onlyNumbers = false;
  @Input() onlyDecimals = false;
  @Output() valueChange = new EventEmitter<any>();

  onInput(event: Event) {
    const target = event.target as HTMLInputElement;
    if (this.onlyDecimals) {
      let sanitized = target.value.replace(/[^0-9.]/g, '');
      const parts = sanitized.split('.');
      if (parts.length > 2) {
        sanitized = parts[0] + '.' + parts.slice(1).join('');
      }
      if (target.value !== sanitized) {
        target.value = sanitized;
      }
      this.value = sanitized;
    } else if (this.onlyNumbers) {
      const sanitized = target.value.replace(/\D/g, '');
      if (target.value !== sanitized) {
        target.value = sanitized;
      }
      this.value = sanitized;
    } else {
      this.value = target.value;
    }
    this.valueChange.emit(this.value);
  }
}
