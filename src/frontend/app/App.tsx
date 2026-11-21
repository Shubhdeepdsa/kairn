import { ThemeProvider } from "./providers/ThemeProvider";
import { ErrorBoundary } from "./ErrorBoundary";
/** Browser foundation; the working documentation reader remains a separate route until parity. */
export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <main>
          <h1>React foundation</h1>
          <p>
            Foundation only. Documentation reading remains in the existing
            viewer.
          </p>
          <a href="/">Open documentation reader</a>
        </main>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
