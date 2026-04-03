import type { DeviceConnectionState } from "../types/streamdeck";

export const DEFAULT_CONNECTION_STATUS_COLORS: Record<DeviceConnectionState, string> = {
    connected: "#1FB36B",
    connecting: "#EAB308",
    reconnecting: "#EAB308",
    disconnected: "#D14343",
    error: "#D14343",
};

export const CONNECTION_STATUS_LABELS: Record<DeviceConnectionState, string> = {
    connected: "Connected",
    connecting: "Connecting",
    reconnecting: "Reconnecting",
    disconnected: "Disconnected",
    error: "Error",
};

export const CONNECTION_STATE_ORDER: readonly DeviceConnectionState[] = [
    "connected",
    "connecting",
    "reconnecting",
    "disconnected",
    "error",
];

