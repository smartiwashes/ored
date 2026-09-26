import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { enviroment } from '../../env/enviroment';

export interface WsMessage {
  event: string;
  data?: any;
}

@Injectable({ providedIn: 'root' })
export class DashboardWebsocketService implements OnDestroy {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private token: string | null = null;
  private manualClose = false;

  private readonly messageSubject = new Subject<WsMessage>();

  /** Observable that emits every incoming WS message */
  readonly messages$: Observable<WsMessage> = this.messageSubject.asObservable();

  /** Open a WebSocket connection and authenticate via the first message */
  connect(token: string): void {
    this.token = token;
    this.manualClose = false;
    this.openConnection();
  }

  /** Gracefully close and stop auto-reconnect */
  disconnect(): void {
    this.manualClose = true;
    this.clearReconnectTimer();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /** Send a message to the server (e.g. payment_action / otp_action) */
  send(msg: WsMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      console.warn('[DashboardWS] Cannot send, socket is not open.');
    }
  }

  /** Helper – approve or reject a payment via WebSocket */
  paymentAction(paymentId: string, status: 'ACCEPTED' | 'REJECTED'): void {
    this.send({ event: 'payment_action', data: { paymentId, status } });
  }

  /** Helper – approve or reject an OTP via WebSocket */
  otpAction(otpId: string, status: 'ACCEPTED' | 'REJECTED'): void {
    this.send({ event: 'otp_action', data: { otpId, status } });
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private openConnection(): void {
    if (!this.token) return;

    // Token is NOT passed in the URL anymore (security fix).
    // It is sent as the first WebSocket message after the connection opens.
    this.ws = new WebSocket(enviroment.ws_base);

    this.ws.onopen = () => {
      console.log('[DashboardWS] Connected — sending auth handshake');
      this.clearReconnectTimer();
      // Authenticate immediately after connection opens
      this.ws!.send(JSON.stringify({ event: 'auth', data: { token: this.token } }));
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data as string);
        this.messageSubject.next(msg);
      } catch {
        console.warn('[DashboardWS] Could not parse message:', event.data);
      }
    };

    this.ws.onerror = (err) => {
      console.error('[DashboardWS] Error:', err);
    };

    this.ws.onclose = () => {
      console.log('[DashboardWS] Connection closed');
      if (!this.manualClose) {
        // Notify subscribers so the dashboard can react (reset badge, reload data)
        this.messageSubject.next({ event: 'disconnected' });
        this.scheduleReconnect();
      }
    };
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      console.log('[DashboardWS] Reconnecting...');
      this.openConnection();
    }, 5000);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.messageSubject.complete();
  }
}
