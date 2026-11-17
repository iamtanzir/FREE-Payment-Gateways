import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { smsService } from "./services/SmsService";

// Bridge: receive SMS from Android native BroadcastReceiver
(window as any).__onSmsReceived = (sms: { sender: string; message: string; timestamp: number }) => {
  console.log('[SMS Bridge] Received:', sms.sender);
  smsService.forwardSms(sms);
};

// Auto-start heartbeat if device was previously configured
if (smsService.getDeviceId()) {
  smsService.startListening();
}

createRoot(document.getElementById("root")!).render(<App />);
