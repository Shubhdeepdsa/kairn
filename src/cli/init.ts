import {
  applyInitializationPlan,
  planInitialization,
} from "../core/initialization.js";

/** Injectable terminal boundary; null represents keyboard cancellation. */
export interface InitPrompts {
  choose(action: "create" | "reuse"): Promise<"continue" | "cancel" | null>;
  confirm(): Promise<boolean | null>;
}

/** Input/output context; filesystem decisions remain in core. */
export interface InitContext {
  directory: string;
  yes: boolean;
  interactive: boolean;
  prompts: InitPrompts;
  message(text: string): void;
}

/** Run a preview/consent/apply flow; 0 success, 2 declined/canceled. Errors propagate to the entrypoint. */
export async function runInit(context: InitContext): Promise<number> {
  const plan = await planInitialization(context.directory);
  context.message(`Project: ${plan.root}`);
  context.message(
    plan.action === "create"
      ? "Preview: create docs/ (empty directory)."
      : "Preview: reuse docs/; no files will change.",
  );
  if (!context.yes) {
    if (!context.interactive)
      throw new Error(
        "Interactive terminal required. Use kairn init --yes to approve the safe default.",
      );
    const choice = await context.prompts.choose(plan.action);
    if (choice !== "continue" || (await context.prompts.confirm()) !== true) {
      context.message("Canceled. No changes made.");
      return 2;
    }
  }
  const result = await applyInitializationPlan(plan, true);
  context.message(
    result.outcome === "created"
      ? "Created docs/. Add your first Markdown file to docs/."
      : "Reused docs/. Your existing documentation is ready to edit.",
  );
  return 0;
}
