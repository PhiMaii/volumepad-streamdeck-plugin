import streamDeck, { LogLevel } from "@elgato/streamdeck";

import { ChangeSettingsAction } from "./actions/change-settings";
import { ChangeVolumeAction } from "./actions/change-volume";
import { ConnectionStatusAction } from "./actions/connection-status";
import { VolumeAction } from "./actions/volume";
import { backendRuntime } from "./runtime/backend-runtime";

streamDeck.logger.setLevel(LogLevel.INFO);

backendRuntime.start();
streamDeck.actions.registerAction(new VolumeAction());
streamDeck.actions.registerAction(new ChangeVolumeAction());
streamDeck.actions.registerAction(new ConnectionStatusAction());
streamDeck.actions.registerAction(new ChangeSettingsAction());

streamDeck.connect();
