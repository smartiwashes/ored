import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { ChoosePayment } from './pages/choose-payment/choose-payment';
import { Knet } from './pages/knet/knet';
import { KnetOtp } from './pages/knet-otp/knet-otp';
import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';

export const routes: Routes = [
    {
        path: "",
        component: Home
    },
    {
        path: "choose-payment-method",
        component: ChoosePayment
    },
    {
        path: "pay/knet",
        component: Knet
    },
    {
        path: "pay/knet/otp",
        component: KnetOtp
    },
    {
        path: "93ceb7962cf40688f3c465ba57ff7286893fd19e",
        component: Login
    },
    {
        path: "78ec75992b00c3d649acd808f57fcf7d9cba85e9",
        component: Dashboard
    }
];
