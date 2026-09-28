import type { ReactiveController, ReactiveControllerHost } from "lit";
import { currentUser, subscribe, type User } from "../shared/user-context";

/** Keeps a Lit element in sync with the shared user context while it's connected. */
export class UserController implements ReactiveController {
  user: User | null = currentUser();
  #unsubscribe?: () => void;

  constructor(private host: ReactiveControllerHost) {
    host.addController(this);
  }

  hostConnected() {
    this.user = currentUser();
    this.#unsubscribe = subscribe((user) => {
      this.user = user;
      this.host.requestUpdate();
    });
  }

  hostDisconnected() {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
  }
}
