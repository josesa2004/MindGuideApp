import { BleManager, State } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';

// iBeacon UUID used in the database and nRF Connect emulation
export const MINDGUIDE_UUID = '550e8400-e29b-41d4-a716-446655440000';

export type DetectedBeacon = {
  number: number;  // iBeacon minor = beacon number
  rssi: number;
};

export type ScanStats = {
  totalDevices: number;   // all BLE devices seen (for debugging)
  matchedBeacons: number; // devices that matched our UUID
  lastHex?: string;       // first 8 bytes of last manufacturer data — debug
};

let _manager: BleManager | null = null;
function mgr() {
  if (!_manager) _manager = new BleManager();
  return _manager;
}

// ── Safe base64 → byte array (no atob — unreliable in Hermes new arch) ───────
function b64ToBytes(b64: string): number[] {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const tbl: Record<string, number> = {};
  for (let i = 0; i < chars.length; i++) tbl[chars[i]] = i;

  const out: number[] = [];
  let buf = 0, bits = 0;
  for (const c of b64) {
    if (!(c in tbl)) continue;
    buf = (buf << 6) | tbl[c];
    bits += 6;
    if (bits >= 8) { bits -= 8; out.push((buf >> bits) & 0xff); }
  }
  return out;
}

// ── Hex helper for debug display ──────────────────────────────────────────────
function toDebugHex(b64: string): string {
  try {
    return b64ToBytes(b64)
      .slice(0, 8)
      .map((x) => x.toString(16).padStart(2, '0'))
      .join(' ');
  } catch {
    return '??';
  }
}

// ── UUID-byte search parser ───────────────────────────────────────────────────
// Searches for the 16 UUID bytes anywhere in manufacturer data, then reads
// the 4 bytes that follow (Major 2 + Minor 2). Works regardless of how
// nRF Connect formats the surrounding AD structure (company ID, type byte, etc.)
const UUID_NEEDLE = MINDGUIDE_UUID.replace(/-/g, '')
  .match(/.{2}/g)!
  .map((h) => parseInt(h, 16));

function parseBeacon(base64: string): { minor: number } | null {
  try {
    const b = b64ToBytes(base64);
    const len = UUID_NEEDLE.length; // 16

    for (let i = 0; i <= b.length - len - 4; i++) {
      if (UUID_NEEDLE.every((byte, j) => b[i + j] === byte)) {
        // UUID found at i → Major at i+16/i+17, Minor at i+18/i+19
        const minor = (b[i + len + 2] << 8) | b[i + len + 3];
        return { minor };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ── Permissions ───────────────────────────────────────────────────────────────
async function requestPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  if ((Platform.Version as number) < 31) return true;
  const r = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
  ]);
  return (
    r['android.permission.BLUETOOTH_SCAN'] === 'granted' &&
    r['android.permission.BLUETOOTH_CONNECT'] === 'granted'
  );
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function startBLEScanning(
  onDetected: (beacon: DetectedBeacon) => void,
  onStats?: (stats: ScanStats) => void,
): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const granted = await requestPermissions();
  if (!granted) return false;

  const m = mgr();

  const ready = await new Promise<boolean>((resolve) => {
    const t = setTimeout(() => resolve(false), 5000);
    const sub = m.onStateChange((state) => {
      if (state === State.PoweredOn) {
        clearTimeout(t); sub.remove(); resolve(true);
      } else if ([State.PoweredOff, State.Unsupported, State.Unauthorized].includes(state)) {
        clearTimeout(t); sub.remove(); resolve(false);
      }
    }, true);
  });

  if (!ready) return false;

  let totalDevices = 0;
  let matchedBeacons = 0;

  m.startDeviceScan(null, { allowDuplicates: true }, (error, device) => {
    if (error || !device) return;

    totalDevices++;
    const lastHex = device.manufacturerData ? toDebugHex(device.manufacturerData) : undefined;
    onStats?.({ totalDevices, matchedBeacons, lastHex });

    if (!device.manufacturerData) return;

    const parsed = parseBeacon(device.manufacturerData);
    if (!parsed) return;

    matchedBeacons++;
    onStats?.({ totalDevices, matchedBeacons, lastHex });
    onDetected({ number: parsed.minor, rssi: device.rssi ?? -100 });
  });

  return true;
}

export function stopBLEScanning() {
  _manager?.stopDeviceScan();
}
