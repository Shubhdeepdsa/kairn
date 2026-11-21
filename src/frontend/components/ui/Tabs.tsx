import { useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "./Button";
/** Manual activation tabs: arrows/Home/End move focus; native Enter/Space activates. */
export function Tabs({
  label,
  items,
  value,
  defaultValue,
  onValueChange,
}: {
  label: string;
  items: readonly {
    id: string;
    label: string;
    content: ReactNode;
    disabled?: boolean;
  }[];
  value?: string;
  defaultValue?: string;
  onValueChange?(id: string): void;
}) {
  const instance = useId();
  const [local, setLocal] = useState(
    defaultValue ?? items.find((item) => !item.disabled)?.id,
  );
  const selected = value ?? local;
  const refs = useRef(new Map<string, HTMLButtonElement>());
  return (
    <div className="ui-tabs">
      <div role="tablist" aria-label={label}>
        {items.map((item) => (
          <Button
            key={item.id}
            ref={(node) => {
              if (node) refs.current.set(item.id, node);
              else refs.current.delete(item.id);
            }}
            role="tab"
            id={`${instance}-tab-${item.id}`}
            aria-selected={selected === item.id}
            aria-controls={`${instance}-panel-${item.id}`}
            disabled={item.disabled}
            tabIndex={selected === item.id ? 0 : -1}
            variant="ghost"
            onClick={() => {
              if (value === undefined) setLocal(item.id);
              onValueChange?.(item.id);
            }}
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const enabled = items.filter((tab) => !tab.disabled);
              const index = enabled.findIndex((tab) => tab.id === item.id);
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? enabled.length - 1
                    : (index +
                        (event.key === "ArrowRight" ? 1 : -1) +
                        enabled.length) %
                      enabled.length;
              const target = enabled[next];
              if (target) refs.current.get(target.id)?.focus();
            }}
          >
            {item.label}
          </Button>
        ))}
      </div>
      {items.map((item) => (
        <section
          key={item.id}
          role="tabpanel"
          id={`${instance}-panel-${item.id}`}
          aria-labelledby={`${instance}-tab-${item.id}`}
          hidden={selected !== item.id}
          tabIndex={0}
        >
          {item.content}
        </section>
      ))}
    </div>
  );
}
