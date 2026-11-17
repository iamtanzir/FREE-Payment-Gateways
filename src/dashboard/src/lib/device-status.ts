const PIPRAPAY_HEARTBEAT_INTERVAL_MS = 30 * 60 * 1000;
const HEARTBEAT_GRACE_MS = 10 * 60 * 1000;
const HEARTBEAT_TIMEOUT_MS = PIPRAPAY_HEARTBEAT_INTERVAL_MS + HEARTBEAT_GRACE_MS;

export function isDeviceOnline(device: { is_active: boolean; last_seen_at: string | null }): boolean {
  if (!device.is_active || !device.last_seen_at) return false;

  const lastSeen = new Date(device.last_seen_at).getTime();
  if (Number.isNaN(lastSeen)) return false;

  return Date.now() - lastSeen < HEARTBEAT_TIMEOUT_MS;
}
