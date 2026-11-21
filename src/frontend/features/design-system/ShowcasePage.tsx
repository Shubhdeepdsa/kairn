import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { IconButton } from "../../components/ui/IconButton";
import { TextInput } from "../../components/ui/TextInput";
import { Select } from "../../components/ui/Select";
import { Switch } from "../../components/ui/Switch";
import {
  Badge,
  Card,
  Divider,
  SectionHeading,
} from "../../components/ui/Presentation";
import { SettingsSection, SettingRow } from "../../components/ui/Settings";
import { Tabs } from "../../components/ui/Tabs";
import { Breadcrumbs } from "../../components/ui/Breadcrumbs";
import { Sidebar } from "../../layouts/Sidebar";
import { Icon } from "../../icons/Icon";
import { iconRegistry } from "../../icons/registry";
import type { IconName } from "../../icons/registry";
import { useTheme } from "../../app/providers/ThemeProvider";
import type {
  Appearance,
  AccentPalette,
} from "../../app/providers/ThemeProvider";
/** Internal specimen composition; controls preview runtime state, never persisted product settings. */
export function ShowcasePage() {
  const theme = useTheme();
  const [enabled, setEnabled] = useState(true);
  const [name, setName] = useState("");
  return (
    <div className="showcase">
      <Breadcrumbs
        items={[{ label: "Kairn", to: "/" }, { label: "Design system" }]}
      />
      <div className="showcase-intro">
        <div>
          <p className="type-technical">Internal specimen / 6B</p>
          <h1 className="type-display">Mineral Precision</h1>
          <p>A shared language for structured knowledge.</p>
        </div>
        <Badge>Runtime preview · not saved</Badge>
      </div>
      <Card>
        <div className="showcase-controls">
          <Select
            label="Appearance"
            value={theme.appearance}
            onChange={(event) =>
              theme.setAppearance(event.target.value as Appearance)
            }
          >
            <option value="light">Mineral Light</option>
            <option value="dark">Mineral Dark</option>
            <option value="system">System</option>
          </Select>
          <Select
            label="Accent palette"
            value={theme.accent}
            onChange={(event) =>
              theme.setAccent(event.target.value as AccentPalette)
            }
          >
            <option value="mineral">Mineral Yellow</option>
            <option value="blue">Instrument Blue</option>
            <option value="forest">Forest</option>
          </Select>
          <p className="ui-description">
            Theme changes propagate across the shell and every shared component.
            No settings are written.
          </p>
        </div>
      </Card>
      <section aria-labelledby="surfaces">
        <SectionHeading id="surfaces">01 / Color & surfaces</SectionHeading>
        <div className="showcase-grid">
          <Card>
            <h3>Semantic surfaces</h3>
            <div className="swatch-grid">
              {["canvas", "surface", "subtle", "accent", "selected"].map(
                (role) => (
                  <div key={role} className={`swatch swatch-${role}`}>
                    <span>{role}</span>
                  </div>
                ),
              )}
            </div>
            <p className="ui-description">
              Neutral planes. Deliberate wayfinding.
            </p>
          </Card>
          <Card>
            <h3>Status is independent of accent</h3>
            <div className="specimen-row">
              {(["info", "success", "warning", "danger"] as const).map(
                (tone) => (
                  <Badge key={tone} tone={tone}>
                    {tone}
                  </Badge>
                ),
              )}
            </div>
            <p className="type-caption">
              Primitive reference: Mineral Yellow / Graphite / neutral scale.
            </p>
            <div className="swatch-grid">
              <div className="swatch primitive-yellow">Mineral</div>
              <div className="swatch primitive-graphite">Graphite</div>
              <div className="swatch swatch-subtle">Neutral</div>
            </div>
          </Card>
        </div>
      </section>
      <section aria-labelledby="typography">
        <SectionHeading id="typography">02 / Typography</SectionHeading>
        <Card>
          <p className="type-display">Wayfinding, with precision.</p>
          <p className="type-display-medium">Display medium · Syne</p>
          <p className="type-section">Section heading · 20 / 28</p>
          <p className="type-card">Card heading · 16 / 22</p>
          <p className="type-body">
            Body regular — Plus Jakarta Sans keeps dense interfaces readable.
          </p>
          <p className="type-medium">Body medium · emphasis without noise.</p>
          <p className="type-dense">
            Dense body · clear navigation and supporting content.
          </p>
          <p className="type-caption">Caption · small supporting context</p>
          <p className="type-technical">
            Technical label / docs / architecture.md
          </p>
          <code>createDocumentService(project)</code>
        </Card>
      </section>
      <section aria-labelledby="actions">
        <SectionHeading id="actions">03 / Actions</SectionHeading>
        <Card>
          <div className="specimen-row">
            <Button variant="primary">Primary action</Button>
            <Button>Secondary action</Button>
            <Button variant="ghost">Quiet action</Button>
            <Button variant="destructive">Destructive action</Button>
            <IconButton icon="settings" label="Specimen preferences" />
          </div>
          <Divider />
          <div className="specimen-row">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button disabled>Disabled</Button>
            <Button loading>Loading</Button>
          </div>
        </Card>
      </section>
      <SettingsSection title="04 / Form controls">
        <SettingRow
          title="Documentation label"
          description="Representative input; no project configuration is changed."
        >
          <TextInput
            label="Example name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter a label"
            description="Use a short, clear name."
          />
        </SettingRow>
        <SettingRow
          title="Validation"
          description="Errors are associated with the control."
        >
          <TextInput
            label="Invalid example"
            error="A name is required."
            defaultValue=""
          />
        </SettingRow>
        <SettingRow title="Native selection">
          <Select label="Example source" defaultValue="docs">
            <option value="docs">Documentation directory</option>
            <option value="readme">README file</option>
          </Select>
        </SettingRow>
        <SettingRow
          title="Switch semantics"
          description="Space toggles the focused native control."
        >
          <Switch
            label="Enable preview"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
        </SettingRow>
        <SettingRow title="Disabled controls">
          <TextInput
            label="Disabled example"
            disabled
            defaultValue="Unavailable"
          />
          <Switch label="Disabled preview" disabled />
        </SettingRow>
      </SettingsSection>
      <section aria-labelledby="navigation">
        <SectionHeading id="navigation">05 / Navigation</SectionHeading>
        <Card>
          <div className="workspace-layout">
            <Sidebar
              label="Specimen navigation"
              items={[
                { to: "/design-system", label: "Design system" },
                { to: "/settings/appearance", label: "Settings contract" },
              ]}
            />
            <div className="content-panel">
              <Tabs
                label="Specimen tabs"
                items={[
                  {
                    id: "overview",
                    label: "Overview",
                    content: (
                      <p>
                        Shared tabs: arrows move focus; Enter or Space
                        activates.
                      </p>
                    ),
                  },
                  {
                    id: "details",
                    label: "Details",
                    content: (
                      <p>One active indicator across all tab consumers.</p>
                    ),
                  },
                  {
                    id: "disabled",
                    label: "Unavailable",
                    disabled: true,
                    content: null,
                  },
                ]}
              />
              <p className="ui-description">
                Sidebar collapse hides navigation; it does not create an icon
                rail.
              </p>
            </div>
          </div>
        </Card>
      </section>
      <section aria-labelledby="icons">
        <SectionHeading id="icons">06 / Semantic icon library</SectionHeading>
        <Card>
          <div className="specimen-row">
            {(Object.keys(iconRegistry) as IconName[]).map((icon) => (
              <span key={icon} className="icon-specimen">
                <Icon name={icon} decorative={false} label={icon} size="lg" />
                {icon}
              </span>
            ))}
          </div>
          <Divider />
          <div className="specimen-row">
            <Icon name="wayfinding" size="sm" />
            <Icon name="wayfinding" />
            <Icon name="wayfinding" size="lg" />
            <p>
              Original wayfinding glyph, mixed with Lucide. Not a brand-logo
              replacement.
            </p>
          </div>
        </Card>
      </section>
      <section aria-labelledby="reading">
        <SectionHeading id="reading">07 / Reading foundations</SectionHeading>
        <Card>
          <article
            className="kairn-prose"
            aria-label="Markdown presentation specimen"
          >
            <h2>Structured knowledge</h2>
            <p>
              Static markup validates the presentation contract. The existing
              Markdown engine remains unchanged. Follow{" "}
              <a href="#reading">reading foundations</a> or inspect{" "}
              <code>docs/architecture.md</code>.
            </p>
            <h3>Heading three</h3>
            <p>Readable hierarchy and a restrained rhythm.</p>
            <h4>Heading four</h4>
            <h5>Heading five</h5>
            <h6>Heading six</h6>
            <ul>
              <li>Local first</li>
              <li>Shared components</li>
            </ul>
            <ol>
              <li>Discover</li>
              <li>Read</li>
            </ol>
            <blockquote>
              Wayfinding should clarify the structure, without competing with
              the content.
            </blockquote>
            <div className="callout">
              <strong>Presentation contract</strong>
              <p>
                No raw HTML injection, remote images or new renderer is enabled.
              </p>
            </div>
            <hr />
            <div className="table-container">
              <table>
                <caption>Representative document sources</caption>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Ownership</th>
                    <th>Behavior</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <code>docs/</code>
                    </td>
                    <td>Project</td>
                    <td>Read only</td>
                  </tr>
                  <tr>
                    <td>README</td>
                    <td>Project</td>
                    <td>Read only</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <pre tabIndex={0} aria-label="Code example">
              <code>
                {
                  'const source = "docs/";\n// Presentation only; no code is executed.\n'
                }
              </code>
            </pre>
            <figure>
              <div className="image-placeholder">
                Image presentation placeholder — no image requested
              </div>
              <figcaption>
                Caption contract, without enabling image loading.
              </figcaption>
            </figure>
          </article>
        </Card>
      </section>
      <p className="type-caption">
        Mineral design-system specimen. Documentation Explorer integration
        follows in Phase 6C.
      </p>
    </div>
  );
}
