import { confirm, isCancel, select } from "@clack/prompts";
import type { InitPrompts } from "./init.js";

/** Clack adapter: keyboard cancellation is normalized before reaching the flow. */
export const clackPrompts: InitPrompts = {
  async choose(action) {
    const result = await select<"continue" | "cancel">({
      message:
        action === "create"
          ? "Create a documentation directory?"
          : "Use existing documentation?",
      options: [
        {
          value: "continue",
          label: action === "create" ? "Create docs/" : "Reuse docs/",
          hint:
            action === "create"
              ? "Empty folder, ready for Markdown"
              : "Preserve every file",
        },
        { value: "cancel", label: "Cancel" },
      ],
    });
    return isCancel(result) ? null : result;
  },
  async confirm() {
    const result = await confirm({
      message: "Apply the preview above?",
      initialValue: false,
    });
    return isCancel(result) ? null : result;
  },
};
