export type DeviceConnectionState =
    | "connecting"
    | "connected"
    | "disconnected"
    | "reconnecting"
    | "error";

export type TransportState =
    | "connecting"
    | "connected"
    | "reconnecting"
    | "disconnected"
    | "error";

export interface StreamdeckState {
    master: {
        volume: number;
        muted: boolean;
    };
    deviceConnection: {
        state: DeviceConnectionState;
        portName?: string;
    };
    capturedAtUtc?: string;
}

export type MeterMode = "ring_fill" | "vu_peak_hold" | "peak_indicator";

export interface EffectiveSettings {
    autoReconnectOnError: boolean;
    autoConnectOnStartup: boolean;
    volumeStepSize: number;
    detentCount: number;
    detentStrength: number;
    snapStrength: number;
    encoderInvert: boolean;
    ledBrightness: number;
    meterMode: MeterMode;
    meterColor: string;
    meterBrightness: number;
    meterGain: number;
    meterSmoothing: number;
    meterPeakHoldMs: number;
    meterMuteRedDurationMs: number;
    lowEndstopEnabled: boolean;
    lowEndstopPosition: number;
    lowEndstopStrength: number;
    highEndstopEnabled: boolean;
    highEndstopPosition: number;
    highEndstopStrength: number;
}

export type SettingKey = keyof EffectiveSettings;
export type SettingValue = boolean | number | string;

export interface RuntimeSnapshot {
    state: StreamdeckState | null;
    effectiveSettings: EffectiveSettings;
    transportState: TransportState;
    endpointOnline: boolean;
    lastError: string | null;
}

