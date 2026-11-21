import { Link } from "react-router";
/** Native ordered navigation; only navigable ancestors receive hrefs. */
export function Breadcrumbs({
  items,
  label = "Breadcrumbs",
}: {
  items: readonly { label: string; to?: string }[];
  label?: string;
}) {
  return (
    <nav aria-label={label} className="ui-breadcrumbs">
      <ol>
        {items.map((item, index) => (
          <li key={index}>
            {index === items.length - 1 ? (
              <span aria-current="page">{item.label}</span>
            ) : item.to ? (
              <Link to={item.to}>{item.label}</Link>
            ) : (
              <span>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
