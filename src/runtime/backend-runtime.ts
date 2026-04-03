import WebSocket, { type RawData } from "ws";

import { STREAMDECK_ENDPOINTS, STREAMDECK_PORT_CANDIDATES, buildBaseUrl, buildWebSocketUrl } from "../constants/endpoints";
import { DEFAULT_EFFECTIVE_SETTINGS } from "../settings/catalog";
import { clampNumber, coerceEffectiveSettings } from "../settings/validation";
import type { ChangeVolumeDirection } from "../types/actions";
import type { EffectiveSettings, RuntimeSnapshot, StreamdeckState, TransportState } from "../types/streamdeck";

type Listener = (snapshot: RuntimeSnapshot) => void;

type StreamdeckEventEnvelope = {
    type?: string;
    payload?: {
        state?: unknown;
    };
};

type HttpMethod = "GET" | "POST";

const REQUEST_TIMEOUT_MS = 2500;
const BASE_URL_CANDIDATES = STREAMDECK_PORT_CANDIDATES.map((port) => buildBaseUrl(port));

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function toStreamdeckState(value: unknown): StreamdeckState | null {
    if (!isObject(value)) {
        return null;
    }

    const master = isObject(value.master) ? value.master : null;
    const deviceConnection = isObject(value.deviceConnection) ? value.deviceConnection : null;
    if (!master || !deviceConnection) {
        return null;
    }

    const rawVolume = typeof master.volume === "number" && Number.isFinite(master.volume) ? master.volume : NaN;
    const rawMuted = typeof master.muted === "boolean" ? master.muted : null;
    const rawConnectionState = typeof deviceConnection.state === "string" ? deviceConnection.state : null;

    if (Number.isNaN(rawVolume) || rawMuted === null || rawConnectionState === null) {
        return null;
    }

    const normalizedConnectionState = parseDeviceConnectionState(rawConnectionState);
    if (normalizedConnectionState === null) {
        return null;
    }

    return {
        master: {
            volume: clampNumber(rawVolume, 0, 1),
            muted: rawMuted,
        },
        deviceConnection: {
            state: normalizedConnectionState,
            portName: typeof deviceConnection.portName === "string" ? deviceConnection.portName : undefined,
        },
        capturedAtUtc: typeof value.capturedAtUtc === "string" ? value.capturedAtUtc : undefined,
    };
}

function parseDeviceConnectionState(value: string): StreamdeckState["deviceConnection"]["state"] | null {
    switch (value) {
        case "connecting":
        case "connected":
        case "disconnected":
        case "reconnecting":
        case "error":
            return value;
        default:
            return null;
    }
}

function extractErrorMessage(value: unknown): string | null {
    if (typeof value === "string" && value.trim().length > 0) {
        return value;
    }

    if (!isObject(value)) {
        return null;
    }

    if ("error" in value && isObject(value.error) && typeof value.error.message === "string") {
        return value.error.message;
    }

    if (typeof value.message === "string") {
        return value.message;
    }

    return null;
}

function toUtf8String(data: RawData): string | null {
    if (typeof data === "string") {
        return data;
    }

    if (Buffer.isBuffer(data)) {
        return data.toString("utf-8");
    }

    if (Array.isArray(data)) {
        return data.map((chunk) => chunk.toString("utf-8")).join("");
    }

    if (data instanceof ArrayBuffer) {
        return Buffer.from(data).toString("utf-8");
    }

    return null;
}

export class BackendRuntime {
    private readonly listeners = new Set<Listener>();

    private snapshot: RuntimeSnapshot = {
        state: null,
        effectiveSettings: { ...DEFAULT_EFFECTIVE_SETTINGS },
        transportState: "disconnected",
        endpointOnline: false,
        lastError: null,
    };

    private started = false;
    private activeBaseUrl: string | null = null;
    private websocket: WebSocket | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private reconnectAttempts = 0;

    start(): void {
        if (this.started) {
            return;
        }

        this.started = true;
        void this.bootstrap();
    }

    subscribe(listener: Listener): () => void {
        this.listeners.add(listener);
        listener(this.getSnapshot());
        return () => {
            this.listeners.delete(listener);
        };
    }

    getSnapshot(): RuntimeSnapshot {
        return {
            state: this.snapshot.state
                ? {
                      master: { ...this.snapshot.state.master },
                      deviceConnection: { ...this.snapshot.state.deviceConnection },
                      capturedAtUtc: this.snapshot.state.capturedAtUtc,
                  }
                : null,
            effectiveSettings: { ...this.snapshot.effectiveSettings },
            transportState: this.snapshot.transportState,
            endpointOnline: this.snapshot.endpointOnline,
            lastError: this.snapshot.lastError,
        };
    }

    async toggleMute(): Promise<void> {
        const payload = await this.performRequest("POST", STREAMDECK_ENDPOINTS.muteToggle, {});
        this.applyResponsePayload(payload);
    }

    async changeVolume(direction: ChangeVolumeDirection, step: number): Promise<void> {
        const path = direction === "Increase" ? STREAMDECK_ENDPOINTS.volumeIncrease : STREAMDECK_ENDPOINTS.volumeDecrease;
        const payload = await this.performRequest("POST", path, { step });
        this.applyResponsePayload(payload);
    }

    async fetchState(): Promise<void> {
        const payload = await this.performRequest("GET", STREAMDECK_ENDPOINTS.state);
        this.applyResponsePayload(payload);
    }

    async fetchSettings(): Promise<void> {
        const payload = await this.performRequest("GET", STREAMDECK_ENDPOINTS.settings);
        this.applyResponsePayload(payload);
    }

    async updateSettings(settingsPatch: Partial<EffectiveSettings>): Promise<void> {
        const payload = await this.performRequest("POST", STREAMDECK_ENDPOINTS.settingsUpdate, settingsPatch);
        this.applyResponsePayload(payload);
    }

    private async bootstrap(): Promise<void> {
        await Promise.allSettled([this.fetchState(), this.fetchSettings()]);
        this.connectWebSocket(false);
    }

    private connectWebSocket(isReconnect: boolean): void {
        const baseUrl = this.activeBaseUrl ?? BASE_URL_CANDIDATES[0];
        const websocketUrl = buildWebSocketUrl(baseUrl);
        this.setTransportState(isReconnect ? "reconnecting" : "connecting");

        let socket: WebSocket;
        try {
            socket = new WebSocket(websocketUrl);
        } catch (error) {
            this.setTransportState("error");
            this.setEndpointStatus(false, this.toErrorString(error, `WebSocket connection failed (${websocketUrl}).`));
            this.scheduleReconnect();
            return;
        }

        this.websocket = socket;

        socket.on("open", () => {
            if (this.websocket !== socket) {
                return;
            }

            this.reconnectAttempts = 0;
            this.clearReconnectTimer();
            this.setTransportState("connected");
            this.setEndpointStatus(true, null);
        });

        socket.on("message", (data) => {
            if (this.websocket !== socket) {
                return;
            }

            const message = toUtf8String(data);
            if (message === null) {
                return;
            }

            this.handleWebSocketMessage(message);
        });

        socket.on("error", (error) => {
            if (this.websocket !== socket) {
                return;
            }

            this.setTransportState("error");
            this.setEndpointStatus(false, this.toErrorString(error, "WebSocket error."));
        });

        socket.on("close", () => {
            if (this.websocket !== socket) {
                return;
            }

            this.websocket = null;
            this.setTransportState("disconnected");
            this.setEndpointStatus(false, "WebSocket disconnected.");
            this.scheduleReconnect();
        });
    }

    private reconnectWebSocketForBaseUrlChange(): void {
        if (this.websocket === null) {
            return;
        }

        try {
            this.websocket.removeAllListeners();
            this.websocket.close();
        } catch {
            // ignored
        }

        this.websocket = null;
        this.connectWebSocket(true);
    }

    private scheduleReconnect(): void {
        if (this.reconnectTimer !== null) {
            return;
        }

        const attempt = this.reconnectAttempts;
        this.reconnectAttempts += 1;

        const baseDelayMs = Math.min(10_000, 500 * (2 ** attempt));
        const jitter = 0.75 + (Math.random() * 0.5);
        const delayMs = Math.max(250, Math.round(baseDelayMs * jitter));

        this.setTransportState("reconnecting");
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            void Promise.allSettled([this.fetchState(), this.fetchSettings()]).finally(() => {
                this.connectWebSocket(true);
            });
        }, delayMs);
    }

    private clearReconnectTimer(): void {
        if (this.reconnectTimer === null) {
            return;
        }

        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
    }

    private handleWebSocketMessage(message: string): void {
        let parsedEvent: StreamdeckEventEnvelope;
        try {
            parsedEvent = JSON.parse(message) as StreamdeckEventEnvelope;
        } catch {
            this.setEndpointStatus(false, "Invalid WebSocket payload.");
            return;
        }

        if (parsedEvent.type !== "state.snapshot" && parsedEvent.type !== "state.changed") {
            return;
        }

        if (!isObject(parsedEvent.payload)) {
            return;
        }

        const state = toStreamdeckState(parsedEvent.payload.state);
        if (state === null) {
            return;
        }

        this.snapshot.state = state;
        this.setEndpointStatus(true, null);
        this.notify();
    }

    private applyResponsePayload(payload: unknown): void {
        const directState = toStreamdeckState(payload);
        if (directState !== null) {
            this.snapshot.state = directState;
            this.notify();
            return;
        }

        if (!isObject(payload)) {
            return;
        }

        let hasChanges = false;

        if ("state" in payload) {
            const responseState = toStreamdeckState(payload.state);
            if (responseState !== null) {
                this.snapshot.state = responseState;
                hasChanges = true;
            }
        }

        if ("effective" in payload) {
            this.snapshot.effectiveSettings = coerceEffectiveSettings(payload.effective, this.snapshot.effectiveSettings);
            hasChanges = true;
        }

        if (hasChanges) {
            this.notify();
        }
    }

    private async performRequest(method: HttpMethod, path: string, body?: unknown): Promise<unknown> {
        const baseUrls = this.getPrioritizedBaseUrls();
        let lastError: Error | null = null;

        for (const baseUrl of baseUrls) {
            const url = `${baseUrl}${path}`;

            try {
                const response = await this.fetchWithTimeout(url, {
                    method,
                    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
                    body: body === undefined ? undefined : JSON.stringify(body),
                });

                const payload = await this.parseResponsePayload(response);

                if (!response.ok) {
                    const message = extractErrorMessage(payload) ?? `${method} ${path} failed with status ${response.status}.`;
                    throw new Error(message);
                }

                if (isObject(payload) && payload.ok === false) {
                    const message = extractErrorMessage(payload) ?? `${method} ${path} failed.`;
                    throw new Error(message);
                }

                const didBaseUrlChange = this.activeBaseUrl !== baseUrl;
                this.activeBaseUrl = baseUrl;
                this.setEndpointStatus(true, null);

                if (didBaseUrlChange) {
                    this.reconnectWebSocketForBaseUrlChange();
                }

                return payload;
            } catch (error) {
                lastError = new Error(`${method} ${path} via ${baseUrl}: ${this.toErrorString(error, "request failed")}`);
            }
        }

        const fallback = `${method} ${path} failed on all configured backend ports (${STREAMDECK_PORT_CANDIDATES.join(", ")}).`;
        const errorMessage = lastError?.message ?? fallback;
        this.setEndpointStatus(false, errorMessage);
        throw new Error(errorMessage);
    }

    private getPrioritizedBaseUrls(): string[] {
        if (this.activeBaseUrl === null) {
            return [...BASE_URL_CANDIDATES];
        }

        return [this.activeBaseUrl, ...BASE_URL_CANDIDATES.filter((baseUrl) => baseUrl !== this.activeBaseUrl)];
    }

    private async parseResponsePayload(response: Response): Promise<unknown> {
        const rawText = await response.text();
        if (rawText.length === 0) {
            return {};
        }

        try {
            return JSON.parse(rawText) as unknown;
        } catch {
            return rawText;
        }
    }

    private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
        const abortController = new AbortController();
        const timeout = setTimeout(() => {
            abortController.abort();
        }, REQUEST_TIMEOUT_MS);

        try {
            return await fetch(url, { ...init, signal: abortController.signal });
        } finally {
            clearTimeout(timeout);
        }
    }

    private setTransportState(transportState: TransportState): void {
        if (this.snapshot.transportState === transportState) {
            return;
        }

        this.snapshot.transportState = transportState;
        this.notify();
    }

    private setEndpointStatus(isOnline: boolean, errorMessage: string | null): void {
        const changed = this.snapshot.endpointOnline !== isOnline || this.snapshot.lastError !== errorMessage;
        if (!changed) {
            return;
        }

        this.snapshot.endpointOnline = isOnline;
        this.snapshot.lastError = errorMessage;
        this.notify();
    }

    private notify(): void {
        const snapshot = this.getSnapshot();
        for (const listener of this.listeners) {
            listener(snapshot);
        }
    }

    private toErrorString(error: unknown, fallbackMessage: string): string {
        if (error instanceof Error && error.message.trim().length > 0) {
            return error.message;
        }

        return fallbackMessage;
    }
}

export const backendRuntime = new BackendRuntime();
