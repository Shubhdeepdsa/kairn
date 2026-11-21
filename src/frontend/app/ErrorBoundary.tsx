import { Component } from "react";
import type { ReactNode } from "react";
/** Redacts unexpected render failures; recovery reloads the local application. */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  render(): ReactNode {
    return this.state.failed ? (
      <main role="alert">
        <h1>Application could not load</h1>
        <a href="/app">Reload foundation</a>
      </main>
    ) : (
      this.props.children
    );
  }
}
