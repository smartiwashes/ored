import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-checkbox',
  standalone: true,
  imports: [],
  templateUrl: './checkbox.html',
})
export class CheckboxComponent {
  @Input() checked = false;
  @Input() label = '';
  @Input() disabled = false;
  @Output() checkedChange = new EventEmitter<boolean>();

  toggle(event: Event) {
    if (this.disabled) return;
    event.stopPropagation();
    this.checked = !this.checked;
    this.checkedChange.emit(this.checked);
  }
}
