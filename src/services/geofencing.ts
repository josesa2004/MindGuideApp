import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';

export const GEOFENCE_TASK = 'BEACON_GEOFENCE_TASK';

// Must be defined at module top level, outside any component
TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }: any) => {
  if (error || !data) return;
  const { eventType, region } = data;
  if (eventType === Location.GeofencingEventType.Enter) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'MindGuide',
        body: `Está perto de ${region.identifier}. Toque para abrir a navegação.`,
        data: { screen: 'map' },
      },
      trigger: null,
    });
  }
});

type BeaconRegion = { id: string; name: string; latitude: number; longitude: number };

export async function startBeaconGeofencing(beacons: BeaconRegion[]) {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') return false;

  const regions = beacons.map((b) => ({
    identifier: b.name,
    latitude: b.latitude,
    longitude: b.longitude,
    radius: 15, // metres — ~classroom doorway range
    notifyOnEnter: true,
    notifyOnExit: false,
  }));

  await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
  return true;
}

export async function stopBeaconGeofencing() {
  const active = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK).catch(() => false);
  if (active) await Location.stopGeofencingAsync(GEOFENCE_TASK);
}
