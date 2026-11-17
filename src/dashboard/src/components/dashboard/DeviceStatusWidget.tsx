import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Wifi, WifiOff, Activity } from "lucide-react";
import { isDeviceOnline } from "@/lib/device-status";
import { useState, useEffect, useMemo } from "react";

interface Device {
  id: string;
  name: string;
  status: string;
  is_active: boolean;
  last_seen_at: string | null;
  phone_number: string | null;
  device_brand?: string | null;
  device_model?: string | null;
}

interface DeviceStatusWidgetProps {
  devices: Device[];
}

const HEARTBEAT_INTERVAL_MS = 30 * 60 * 1000;

function formatElapsed(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}s ago`;
  const mins = Math.floor(totalSec / 60);
  if (mins < 60) return `${mins}m ${totalSec % 60}s ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h ago`;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Due now";
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function DeviceStatusWidget({ devices }: DeviceStatusWidgetProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (devices.length === 0) return null;

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Smartphone className="h-4 w-4" /> Device Status
        </CardTitle>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" /> {devices.filter((d) => isDeviceOnline(d)).length} Online</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground inline-block" /> {devices.filter((d) => !isDeviceOnline(d)).length} Offline</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {devices.map((dev) => {
            const online = isDeviceOnline(dev);
            const lastSeenMs = dev.last_seen_at ? new Date(dev.last_seen_at).getTime() : null;
            const elapsedMs = lastSeenMs ? now - lastSeenMs : null;
            const nextHeartbeatMs = elapsedMs != null ? Math.max(0, HEARTBEAT_INTERVAL_MS - elapsedMs) : null;
            const modelInfo = [dev.device_brand, dev.device_model].filter(Boolean).join(" ");

            return (
              <div key={dev.id} className={`flex flex-col gap-2 p-3 rounded-lg border ${online ? "border-green-500/30 bg-green-500/5" : "border-border bg-muted/30"}`}>
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${online ? "bg-green-500/15" : "bg-muted"}`}>
                    {online ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{dev.name}</p>
                    {modelInfo && <p className="text-[11px] text-muted-foreground truncate">{modelInfo}</p>}
                  </div>
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${online ? "bg-green-500 animate-pulse" : "bg-muted-foreground/40"}`} />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/50 pt-1.5 mt-0.5">
                  <span className="flex items-center gap-1">
                    {elapsedMs != null ? (
                      <>Last seen: {formatElapsed(elapsedMs)}</>
                    ) : (
                      "Never connected"
                    )}
                  </span>
                  {online && nextHeartbeatMs != null && (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <Activity className="h-3 w-3" />
                      {formatCountdown(nextHeartbeatMs)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
