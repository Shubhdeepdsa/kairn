import { useLocation } from "react-router";
/** Honest route demonstration. No preference/configuration persistence is implemented here. */
export function SettingsPage() {
  const { pathname } = useLocation();
  return (
    <section>
      <h2>Settings architecture contract</h2>
      <p>
        Foundation only: {pathname.split("/").at(-1)}. Settings forms and saving
        are not implemented.
      </p>
      <p>
        Future preferences resolve defaults, global personal values and only
        explicitly supported project overrides. Documentation sources remain in
        the existing core configuration model.
      </p>
    </section>
  );
}
