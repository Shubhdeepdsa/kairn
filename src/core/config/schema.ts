import { z } from "zod";
import { isAbsolute, win32 } from "node:path";

/** Stable configuration failures; invalid files are never reset or migrated. */
export class ConfigError extends Error {
  constructor(
    public readonly code: "INVALID" | "VERSION" | "CONFLICT" | "IO" | "MISSING",
    message: string,
  ) {
    super(message);
    this.name = "ConfigError";
  }
}
const name = z.string().trim().min(1).max(200);
const path = z
  .string()
  .min(1)
  .max(4096)
  .refine(
    (value) => !/[\u0000-\u001f]/.test(value),
    "Control characters are forbidden",
  );
/** Portable forward-slash path contained within a project. */
export const relativePathSchema = path.refine(
  (value) =>
    !isAbsolute(value) &&
    !win32.isAbsolute(value) &&
    !value.includes("\\") &&
    !value.includes(":") &&
    value.split("/").every((part) => part !== ".." && part !== ""),
  "Use a project-relative forward-slash path without traversal",
);
const pattern = z
  .string()
  .min(1)
  .max(256)
  .refine(
    (value) =>
      !/[\\[\]{}!\u0000-\u001f]/.test(value) &&
      !value.startsWith("/") &&
      !value.split("/").includes(".."),
    "Only relative *, ? and ** patterns are supported",
  );
const source = z.strictObject({ path, primary: z.boolean().optional() });
const sources = z
  .array(source)
  .max(32)
  .superRefine((items, ctx) => {
    if (new Set(items.map((item) => item.path)).size !== items.length)
      ctx.addIssue({ code: "custom", message: "Duplicate source paths" });
    if (items.filter((item) => item.primary).length > 1)
      ctx.addIssue({
        code: "custom",
        message: "Only one primary source is allowed",
      });
  });
/** Strict portable project schema v1. Unknown fields fail. */
export const projectSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    name: name.optional(),
    documentation: z.strictObject({
      sources,
      exclude: z.array(pattern).max(100).default([]),
    }),
  })
  .superRefine((value, ctx) => {
    for (const item of value.documentation.sources)
      if (!relativePathSchema.safeParse(item.path).success)
        ctx.addIssue({
          code: "custom",
          message: "Shared sources must be portable relative paths",
        });
  });
/** Machine-local field-specific overrides, never recursively merged. */
export const overridesSchema = z.strictObject({
  additionalSources: sources.default([]),
  disabledSources: z.array(path).max(64).default([]),
  primary: path.optional(),
  excludeAdd: z.array(pattern).max(100).default([]),
  excludeRemove: z.array(pattern).max(100).default([]),
});
/** Persistent machine Library. Revision is used for optimistic conflict checks. */
export const librarySchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    revision: z.number().int().nonnegative(),
    projects: z
      .array(
        z.strictObject({
          id: z.uuid(),
          name,
          root: path.refine(isAbsolute, "Project root must be absolute"),
          overrides: overridesSchema,
        }),
      )
      .max(1000),
  })
  .superRefine((value, ctx) => {
    if (
      new Set(value.projects.map((p) => p.id)).size !== value.projects.length ||
      new Set(value.projects.map((p) => p.root)).size !== value.projects.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Duplicate project identity or root",
      });
  });
export type SharedConfig = z.infer<typeof projectSchema>;
export type PersonalOverrides = z.infer<typeof overridesSchema>;
export type LibraryData = z.infer<typeof librarySchema>;
export type Project = LibraryData["projects"][number];

/** Validate runtime data and explicitly reject incompatible versions. */
export function validateConfig<T>(schema: z.ZodType<T>, value: unknown): T {
  if (
    typeof value === "object" &&
    value !== null &&
    "schemaVersion" in value &&
    value.schemaVersion !== 1
  )
    throw new ConfigError(
      "VERSION",
      "Unsupported schemaVersion; expected 1. Existing data was preserved.",
    );
  const result = schema.safeParse(value);
  if (!result.success)
    throw new ConfigError(
      "INVALID",
      result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; "),
    );
  return result.data;
}
