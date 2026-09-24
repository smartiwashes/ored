import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-accordion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './accordion.html',
})
export class AccordionComponent {
  @Input() title = '';
  @Input() iconType: 'civil-id' | 'voucher' = 'civil-id';
  @Input() open = false;

  toggle() {
    this.open = !this.open;
  }
}
