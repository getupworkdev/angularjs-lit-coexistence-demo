import "./styles.css";
import { bootstrapLegacy } from "./legacy/module";
import { listenerCount } from "./shared/user-context";
import { AppShell } from "./shell/app-shell";

// AngularJS first, so the shell has an $injector to hand to <legacy-outlet>.
const injector = bootstrapLegacy(document.getElementById("legacy-root")!);

const shell = new AppShell();
shell.injector = injector;
document.body.prepend(shell);

// Read-only hook for the leak test: shared-module subscriptions aren't DOM
// listeners, so the browser's counters can't see them.
Object.assign(window, { __demo: { userContextListeners: listenerCount } });
