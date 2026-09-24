import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastService } from '../../services/toast';
import { enviroment } from '../../../env/enviroment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  toastService = inject(ToastService);
  router = inject(Router);

  email = signal<string>('');
  password = signal<string>('');
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  async onSubmit(event: Event) {
    event.preventDefault();
    this.errorMessage.set('');

    const emailVal = this.email();
    const passVal = this.password();

    if (!emailVal || !passVal) {
      this.toastService.show('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    this.isLoading.set(true);

    try {
      const response = await fetch(enviroment.api_base + '/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal, password: passVal })
      });

      const resData = await response.json();
      this.isLoading.set(false);

      if (resData.success) {
        localStorage.setItem('admin_token', resData.token);
        localStorage.setItem('admin_email', resData.user.email);
        this.toastService.show('تم تسجيل الدخول بنجاح', 'success');
        this.router.navigate(['/78ec75992b00c3d649acd808f57fcf7d9cba85e9']);
      } else {
        this.errorMessage.set(resData.error || 'بريد الكتروني أو كلمة مرور غير صحيحة');
        this.toastService.show(this.errorMessage(), 'error');
      }
    } catch (error) {
      this.isLoading.set(false);
      this.errorMessage.set('حدث خطأ في الاتصال بالخادم. يرجى المحاولة لاحقاً');
      this.toastService.show(this.errorMessage(), 'error');
    }
  }
}
