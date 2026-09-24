import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './button.html',
})
export class ButtonComponent {
  @Input() variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'payment-inactive' = 'primary';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() disabled = false;
  @Input() fullWidth = false;
  @Input() loading = false;
  @Output() click = new EventEmitter<MouseEvent>();

  onClick(event: MouseEvent) {
    event.stopPropagation();
    if (this.disabled || this.loading) {
      event.preventDefault();
      return;
    }
    this.click.emit(event);
  }
}
