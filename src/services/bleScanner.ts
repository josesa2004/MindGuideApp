import { BleManager, State } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';

// UUID shared by all MindGuide beacons — must match SeedRunner.BeaconUuid
export const MINDGUIDE_UUID = '550e8400-e29b-41d4-a716-446655440000';

export type DetectedBeacon = {
  number: number;  // iBeacon minor = beacon number in our system
  rssi: number;    // signal strength — higher (less negative) = closer
};

let _manager: BleManager | null = null;
function mgr() {
  if (!_manager) _manager = new BleManager();
  return _manager;
}

// ── iBeacon parser ────────────────────────────────────────────────────────────
// Manufacturer data layout:
//   [0-1]  Company ID  0x004C (Apple) — stored little-endian as 4C 00
//   [2]    Type        0x02 (iBeacon)
//   [3]    Length      0x15 (21 bytes follow)
//   [4-19] UUID        16 bytes big-endian
//   [20-21] Major      2 bytes big-endian
//   [22-23] Minor      2 bytes big-endian  ← beacon number
//   [24]   TX Power    1 byte
function parseIBeacon(base64: string): { uuid: string; minor: number } | null {
  try {
    const bin = atob(base64);
    if (bin.length < 25) return null;

    const b = (i: number) => bin.charCodeAt(i);

    if (b(0) !== 0x4c || b(1) !== 0x00) return null; // not Apple
    if (b(2) !== 0x02 || b(3) !== 0x15) return null; // not iBeacon

    const h = (i: number) => b(i).toString(16).padStart(2, '0');
    const uuid = [
      h(4)+h(5)+h(6)+h(7),
      h(8)+h(9),
      h(10)+h(11),
      h(12)+h(13),
      h(14)+h(15)+h(16)+h(17)+h(18)+h(19),
    ].join('-');

    const minor = (b(22) << 8) | b(23);
    return { uuid, minor };
  } catch {
    return null;
  }
}

// ── Permissions ───────────────────────────────────────────────────────────────
async function requestPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  if ((Platform.Version as number) < 31) return true; // pre-Android 12

  const results = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
  ]);
  return (
    results['android.permission.BLUETOOTH_SCAN'] === 'granted' &&
    results['android.permission.BLUETOOTH_CONNECT'] === 'granted'
  );
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function startBLEScanning(
  onDetected: (beacon: DetectedBeacon) => void,
): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const granted = await requestPermissions();
  if (!granted) return false;

  const m = mgr();

  // Wait up to 5 s for Bluetooth to be ready
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

  m.startDeviceScan(null, { allowDuplicates: true }, (error, device) => {
    if (error || !device?.manufacturerData) return;
    const parsed = parseIBeacon(device.manufacturerData);
    if (!parsed) return;
    if (parsed.uuid.toLowerCase() !== MINDGUIDE_UUID) return;

    onDetected({ number: parsed.minor, rssi: device.rssi ?? -100 });
  });

  return true;
}

export function stopBLEScanning() {
  _manager?.stopDeviceScan();
}
