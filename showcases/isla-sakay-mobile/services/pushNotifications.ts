/** Push delivery and device registration are disabled for the standalone demo. */
export async function registerForPushNotificationsAsync() {
  return { token: null, reason: "demo_disabled" as const };
}

export function getDevicePushMetadata() {
  return { platform: "web", deviceName: "Portfolio browser demo", appVersion: "1.0.0" };
}
