/**
 * SMS Listener Service for Capacitor Android App
 * 
 * This service listens for incoming SMS messages from MFS providers
 * (bKash, Nagad, Rocket, mCash) and forwards them to the webhook-sms
 * edge function for automatic transaction matching and approval.
 */

import { supabase } from '@/integrations/supabase/client';

// Known MFS SMS senders
const MFS_SENDERS = [
  'bkash', '16247', 'bKash',
  'nagad', '16267', 'Nagad',
  'rocket', '16216', 'Rocket',
  'mcash', 'mCash',
];

interface SmsMessage {
  sender: string;
  message: string;
  timestamp: number;
}

class SmsService {
  private deviceId: string | null = null;
  private isListening = false;

  /**
   * Set the device ID (from Dashboard > Devices page)
   */
  setDeviceId(id: string) {
    this.deviceId = id;
    localStorage.setItem('sms_device_id', id);
  }

  getDeviceId(): string | null {
    if (!this.deviceId) {
      this.deviceId = localStorage.getItem('sms_device_id');
    }
    return this.deviceId;
  }

  /**
   * Check if SMS is from a known MFS provider
   */
  isMfsSms(sender: string): boolean {
    return MFS_SENDERS.some(
      (s) => sender.toLowerCase().includes(s.toLowerCase())
    );
  }

  /**
   * Forward SMS to webhook-sms edge function
   */
  async forwardSms(sms: SmsMessage): Promise<{ success: boolean; error?: string }> {
    const deviceId = this.getDeviceId();
    if (!deviceId) {
      return { success: false, error: 'Device ID not configured' };
    }

    if (!this.isMfsSms(sms.sender)) {
      return { success: false, error: 'Not an MFS SMS' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('webhook-sms', {
        body: {
          sender: sms.sender,
          message: sms.message,
          device_id: deviceId,
          timestamp: sms.timestamp,
        },
      });

      if (error) {
        console.error('Webhook SMS error:', error);
        return { success: false, error: error.message };
      }

      console.log('SMS forwarded successfully:', data);
      return { success: true };
    } catch (err) {
      console.error('Failed to forward SMS:', err);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * Send heartbeat ping to keep device "online" status
   * Should be called every 2-3 minutes from the Android app
   */
  async sendHeartbeat(): Promise<boolean> {
    const deviceId = this.getDeviceId();
    if (!deviceId) return false;

    try {
      const { error } = await supabase.functions.invoke('webhook-sms', {
        body: { device_id: deviceId, type: 'heartbeat' },
      });
      return !error;
    } catch {
      return false;
    }
  }

  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Start listening for SMS and sending heartbeats
   */
  async startListening() {
    if (this.isListening) return;
    this.isListening = true;

    // Send initial heartbeat
    await this.sendHeartbeat();

    // Send heartbeat every 2 minutes
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 2 * 60 * 1000);

    console.log('SMS listener service started with heartbeat');
  }

  stopListening() {
    this.isListening = false;
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    console.log('SMS listener service stopped');
  }
}

export const smsService = new SmsService();
