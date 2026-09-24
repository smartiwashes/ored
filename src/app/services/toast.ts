import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toast = signal<ToastMessage | null>(null);

  show(message: string, type: 'success' | 'error' | 'info' = 'success', duration = 3000) {
    this.toast.set({ message, type, duration });
    
    setTimeout(() => {
      this.hide();
    }, duration);
  }

  hide() {
    this.toast.set(null);
  }
}
