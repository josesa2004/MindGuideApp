import { BleManager, State } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';

// Estimote default iBeacon UUID
export const MINDGUIDE_UUID = 'b9407f30-f5f8-466e-aff9-25556b57fe6d';

export type DetectedBeacon = {
  number: number;  // iBeacon minor = beacon number
  rssi: number;
};

export type ScanStats = {
  totalDevices: number;   // all BLE devices seen (for debugging)
  matchedBeacons: number; // devices that matched our UUID
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

// ── iBeacon parser ────────────────────────────────────────────────────────────
// Full manufacturer data layout (as returned by react-native-ble-plx):
//   [0-1]  Company ID 0x004C little-endian → 4C 00
//   [2]    Type   0x02
//   [3]    Length 0x15
//   [4-19] UUID   16 bytes
//   [20-21] Major  big-endian
//   [22-23] Minor  big-endian  ← beacon number
//   [24]   TX Power
function parseIBeacon(base64: string): { uuid: string; minor: number } | null {
  try {
    const b = b64ToBytes(base64);
    if (b.length < 25) return null;
    if (b[0] !== 0x4c || b[1] !== 0x00) return null; // not Apple
    if (b[2] !== 0x02 || b[3] !== 0x15) return null; // not iBeacon

    const h = (i: number) => b[i].toString(16).padStart(2, '0');
    const uuid = [
      h(4)+h(5)+h(6)+h(7),
      h(8)+h(9),
      h(10)+h(11),
      h(12)+h(13),
      h(14)+h(15)+h(16)+h(17)+h(18)+h(19),
    ].join('-');

    const minor = (b[22] << 8) | b[23];
    return { uuid, minor };
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
    onStats?.({ totalDevices, matchedBeacons });

    if (!device.manufacturerData) return;

    const parsed = parseIBeacon(device.manufacturerData);
    if (!parsed) return;
    if (parsed.uuid.toLowerCase() !== MINDGUIDE_UUID) return;

    matchedBeacons++;
    onStats?.({ totalDevices, matchedBeacons });
    onDetected({ number: parsed.minor, rssi: device.rssi ?? -100 });
  });

  return true;
}

export function stopBLEScanning() {
  _manager?.stopDeviceScan();
}
