import { Injectable, inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  private readonly router = inject(Router);

  canActivate(): boolean {
    const token = localStorage.getItem('admin_token');
    if (token) {
      return true;
    }
    this.router.navigate(['/93ceb7962cf40688f3c465ba57ff7286893fd19e']);
    return false;
  }
}
