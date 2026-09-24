import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.html',
})
export class SidebarComponent {
  @Input() activeItem = 'pay';
  @Output() navigate = new EventEmitter<string>();

  selectItem(item: string) {
    this.activeItem = item;
    this.navigate.emit(item);
  }
}
