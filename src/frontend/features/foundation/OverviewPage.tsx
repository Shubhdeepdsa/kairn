import { Link } from "react-router";
import { useApplication } from "../../app/providers/ApplicationProvider";
import { useTheme } from "../../app/providers/ThemeProvider";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../icons/Icon";
export function OverviewPage() {
  const { current } = useApplication();
  const theme = useTheme();
  return (
    <section>
      <h1>React foundation</h1>
      <p>
        Foundation only. Documentation, search and live refresh remain in the
        existing reader.
      </p>
      <p>Active project: {current.name}</p>
      <ul>
        <li>
          <Link to={`/projects/${current.id}/docs`}>
            <Icon name="documentation" />
            Workspace foundation
          </Link>
        </li>
        <li>
          <Link to="/settings/appearance">
            <Icon name="settings" />
            Global settings contract
          </Link>
        </li>
      </ul>
      <Button
        onClick={() =>
          theme.setAppearance(theme.appearance === "dark" ? "light" : "dark")
        }
      >
        Preview {theme.appearance === "dark" ? "light" : "dark"} tokens
        (temporary)
      </Button>
    </section>
  );
}
