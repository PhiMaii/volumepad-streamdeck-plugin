import streamDeck from "@elgato/streamdeck";

import { CONNECTION_STATE_ORDER, DEFAULT_CONNECTION_STATUS_COLORS } from "../settings/connection-status-colors";
import { isHexColor, normalizeHexColor } from "../settings/validation";
import type { ConnectionStatusSettings } from "../types/actions";
import type { DeviceConnectionState } from "../types/streamdeck";

function requireElement<TElement extends Element>(selector: string): TElement {
    const element = document.querySelector<TElement>(selector);
    if (element === null) {
        throw new Error(`Missing required UI element: ${selector}`);
    }

    return element;
}

const fieldMap: Record<DeviceConnectionState, { settingKey: keyof ConnectionStatusSettings; input: HTMLInputElement }> = {
    connected: { settingKey: "connectedColor", input: requireElement<HTMLInputElement>("#connected-color") },
    connecting: { settingKey: "connectingColor", input: requireElement<HTMLInputElement>("#connecting-color") },
    reconnecting: { settingKey: "reconnectingColor", input: requireElement<HTMLInputElement>("#reconnecting-color") },
    disconnected: { settingKey: "disconnectedColor", input: requireElement<HTMLInputElement>("#disconnected-color") },
    error: { settingKey: "errorColor", input: requireElement<HTMLInputElement>("#error-color") },
};

const helperText = requireElement<HTMLElement>("#helper-text");

function settingsEqual(a: ConnectionStatusSettings, b: ConnectionStatusSettings): boolean {
    return (
        a.connectedColor === b.connectedColor
        && a.connectingColor === b.connectingColor
        && a.reconnectingColor === b.reconnectingColor
        && a.disconnectedColor === b.disconnectedColor
        && a.errorColor === b.errorColor
    );
}

function normalizeSettings(settings: ConnectionStatusSettings): ConnectionStatusSettings {
    const normalized: ConnectionStatusSettings = {};

    for (const state of CONNECTION_STATE_ORDER) {
        const { settingKey } = fieldMap[state];
        const candidate = settings[settingKey];
        normalized[settingKey] = typeof candidate === "string" && isHexColor(candidate)
            ? normalizeHexColor(candidate)
            : DEFAULT_CONNECTION_STATUS_COLORS[state];
    }

    return normalized;
}

function applyToUi(settings: ConnectionStatusSettings): void {
    for (const state of CONNECTION_STATE_ORDER) {
        const { settingKey, input } = fieldMap[state];
        const configuredColor = settings[settingKey];
        input.value = typeof configuredColor === "string" ? configuredColor : DEFAULT_CONNECTION_STATUS_COLORS[state];
    }
}

async function persistFromUi(): Promise<void> {
    const nextSettings: ConnectionStatusSettings = {};
    for (const state of CONNECTION_STATE_ORDER) {
        const { settingKey, input } = fieldMap[state];
        nextSettings[settingKey] = normalizeHexColor(input.value);
    }

    const normalized = normalizeSettings(nextSettings);
    applyToUi(normalized);
    await streamDeck.settings.setSettings(normalized);
    helperText.textContent = "Custom colors saved.";
}

async function loadInitialSettings(): Promise<void> {
    const existingSettings = await streamDeck.settings.getSettings<ConnectionStatusSettings>();
    const normalizedSettings = normalizeSettings(existingSettings);
    applyToUi(normalizedSettings);

    if (!settingsEqual(existingSettings, normalizedSettings)) {
        await streamDeck.settings.setSettings(normalizedSettings);
    }
}

streamDeck.onConnected(() => {
    void loadInitialSettings();
});

streamDeck.settings.onDidReceiveSettings((ev) => {
    applyToUi(normalizeSettings(ev.payload.settings as ConnectionStatusSettings));
});

for (const state of CONNECTION_STATE_ORDER) {
    fieldMap[state].input.addEventListener("change", () => {
        void persistFromUi();
    });
}
