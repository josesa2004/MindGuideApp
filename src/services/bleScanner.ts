import { BleManager, State } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';

// iBeacon UUID used in the database and nRF Connect emulation
export const MINDGUIDE_UUID = '550e8400-e29b-41d4-a716-446655440000';

// Service UUID prefix/suffix used by the macOS bleno emulator:
// 550e8400-e29b-41d4-XXXX-446655440000  where XXXX = beacon number (hex)
const SVC_PREFIX = '550e8400-e29b-41d4-';
const SVC_SUFFIX = '-446655440000';

export type DetectedBeacon = {
  number: number;  // iBeacon minor = beacon number
  rssi: number;
};

export type ScanStats = {
  totalDevices: number;   // unique BLE devices seen
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

// ── Parser 1: manufacturer data — UUID bytes anywhere in the payload ──────────
const UUID_NEEDLE = MINDGUIDE_UUID.replace(/-/g, '')
  .match(/.{2}/g)!
  .map((h) => parseInt(h, 16));

function parseFromManufacturerData(base64: string): { minor: number } | null {
  try {
    const b = b64ToBytes(base64);
    const len = UUID_NEEDLE.length; // 16
    for (let i = 0; i <= b.length - len - 4; i++) {
      if (UUID_NEEDLE.every((byte, j) => b[i + j] === byte)) {
        const minor = (b[i + len + 2] << 8) | b[i + len + 3];
        return { minor };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ── Parser 2: service UUIDs — macOS bleno emulator ───────────────────────────
// Service UUID format: 550e8400-e29b-41d4-XXXX-446655440000
// XXXX is the beacon number encoded as a 4-digit hex string.
function parseFromServiceUUIDs(uuids: string[] | null | undefined): { minor: number } | null {
  if (!uuids) return null;
  for (const uuid of uuids) {
    const lower = uuid.toLowerCase();
    if (lower.startsWith(SVC_PREFIX) && lower.endsWith(SVC_SUFFIX)) {
      const minorHex = lower.slice(SVC_PREFIX.length, SVC_PREFIX.length + 4);
      const minor = parseInt(minorHex, 16);
      if (!isNaN(minor) && minor > 0) return { minor };
    }
  }
  return null;
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

  // Track unique device IDs to avoid counting the same device repeatedly
  const seenIds = new Set<string>();
  let matchedBeacons = 0;

  m.startDeviceScan(null, { allowDuplicates: true }, (error, device) => {
    if (error || !device) return;

    const isNew = !seenIds.has(device.id);
    if (isNew) seenIds.add(device.id);

    const lastHex = device.manufacturerData ? toDebugHex(device.manufacturerData) : undefined;

    if (isNew) {
      onStats?.({ totalDevices: seenIds.size, matchedBeacons, lastHex });
    }

    // Try manufacturer data first (real Estimote / nRF Connect)
    let parsed: { minor: number } | null = null;
    if (device.manufacturerData) {
      parsed = parseFromManufacturerData(device.manufacturerData);
    }

    // Fallback: service UUIDs (macOS bleno emulator)
    if (!parsed) {
      parsed = parseFromServiceUUIDs(device.serviceUUIDs);
    }

    if (!parsed) return;

    if (isNew) matchedBeacons++;
    onStats?.({ totalDevices: seenIds.size, matchedBeacons, lastHex });
    onDetected({ number: parsed.minor, rssi: device.rssi ?? -100 });
  });

  return true;
}

export function stopBLEScanning() {
  _manager?.stopDeviceScan();
}
