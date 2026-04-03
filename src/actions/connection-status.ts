import { action, type KeyAction } from "@elgato/streamdeck";

import { CONNECTION_STATUS_LABELS, DEFAULT_CONNECTION_STATUS_COLORS } from "../settings/connection-status-colors";
import { isHexColor, normalizeHexColor } from "../settings/validation";
import { renderConnectionStatusKeySvg } from "../runtime/svg";
import type { ConnectionStatusSettings } from "../types/actions";
import type { DeviceConnectionState, RuntimeSnapshot } from "../types/streamdeck";
import { RuntimeKeyAction } from "./runtime-key-action";

const COLOR_SETTING_MAP: Record<DeviceConnectionState, keyof ConnectionStatusSettings> = {
    connected: "connectedColor",
    connecting: "connectingColor",
    reconnecting: "reconnectingColor",
    disconnected: "disconnectedColor",
    error: "errorColor",
};

function resolveState(snapshot: RuntimeSnapshot): DeviceConnectionState {
    if (snapshot.state !== null) {
        return snapshot.state.deviceConnection.state;
    }

    switch (snapshot.transportState) {
        case "connecting":
            return "connecting";
        case "reconnecting":
            return "reconnecting";
        case "connected":
            return "connected";
        case "error":
            return "error";
        case "disconnected":
        default:
            return "disconnected";
    }
}

@action({ UUID: "net.phimai.volumepad.streamdeck-remote.connection-status" })
export class ConnectionStatusAction extends RuntimeKeyAction<ConnectionStatusSettings> {
    protected override async renderKey(action: KeyAction<ConnectionStatusSettings>): Promise<void> {
        const snapshot = this.getSnapshot();
        const state = resolveState(snapshot);
        const settings = await action.getSettings<ConnectionStatusSettings>();

        const settingKey = COLOR_SETTING_MAP[state];
        const candidateColor = settings[settingKey];
        const resolvedColor = typeof candidateColor === "string" && isHexColor(candidateColor)
            ? normalizeHexColor(candidateColor)
            : DEFAULT_CONNECTION_STATUS_COLORS[state];

        await Promise.all([
            action.setImage(renderConnectionStatusKeySvg(resolvedColor, !snapshot.endpointOnline)),
            action.setTitle(CONNECTION_STATUS_LABELS[state]),
        ]);
    }
}

