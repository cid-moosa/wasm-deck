// Browser Hardware & Sandbox Telemetry Service

export async function getHardwareTelemetry() {
  const telemetry = {
    webgpuAvailable: false,
    webgpuAdapter: null,
    crossOriginIsolated: window.crossOriginIsolated || false,
    deviceMemoryGB: navigator.deviceMemory || null,
    hardwareConcurrency: navigator.hardwareConcurrency || null,
    storageEstimate: {
      usageBytes: 0,
      quotaBytes: 0,
      usageFormatted: "Calculating...",
      quotaFormatted: "Unknown",
      percentUsed: 0
    },
    gamepadConnected: false,
    gamepadCount: 0,
    gamepadName: null
  };

  // 1. WebGPU Check
  if (navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        telemetry.webgpuAvailable = true;
        telemetry.webgpuAdapter = adapter.info?.architecture || "Hardware Accelerated";
      }
    } catch {
      telemetry.webgpuAvailable = false;
    }
  }

  // 2. Storage & Cache Estimate (OPFS / IndexedDB / CacheStorage)
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      
      telemetry.storageEstimate = {
        usageBytes: usage,
        quotaBytes: quota,
        usageFormatted: formatBytes(usage),
        quotaFormatted: formatBytes(quota),
        percentUsed: quota > 0 ? ((usage / quota) * 100).toFixed(1) : 0
      };
    } catch {
      telemetry.storageEstimate.usageFormatted = "Unavailable";
    }
  }

  // 3. Gamepads
  if (navigator.getGamepads) {
    const gamepads = Array.from(navigator.getGamepads()).filter(Boolean);
    telemetry.gamepadConnected = gamepads.length > 0;
    telemetry.gamepadCount = gamepads.length;
    telemetry.gamepadName = gamepads[0]?.id || null;
  }

  return telemetry;
}

export function formatBytes(bytes) {
  if (bytes === 0) return "0 MB";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export async function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    return await navigator.storage.persist();
  }
  return false;
}
