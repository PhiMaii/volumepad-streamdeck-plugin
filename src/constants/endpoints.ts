export const STREAMDECK_PORT_CANDIDATES = [5820, 57691] as const;

export const STREAMDECK_ENDPOINTS = {
    state: "/api/v1/streamdeck/state",
    muteToggle: "/api/v1/streamdeck/actions/master/mute/toggle",
    volumeIncrease: "/api/v1/streamdeck/actions/master/volume/increase",
    volumeDecrease: "/api/v1/streamdeck/actions/master/volume/decrease",
    settings: "/api/v1/streamdeck/settings",
    settingsUpdate: "/api/v1/streamdeck/settings/update",
    websocket: "/api/v1/streamdeck/ws",
} as const;

export function buildBaseUrl(port: number): string {
    return `http://127.0.0.1:${port}`;
}

export function buildWebSocketUrl(baseUrl: string): string {
    return `${baseUrl.replace(/^http/i, "ws")}${STREAMDECK_ENDPOINTS.websocket}`;
}
