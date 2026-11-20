# Reusable module catalog

All core exports live in `src/core/initialization.ts` and are tested in
`tests/core.test.ts`.

| Export                      | Contract                                                              |
| --------------------------- | --------------------------------------------------------------------- |
| `discoverDocumentationRoot` | Read-only direct-child discovery; null if absent; rejects links/files |
| `planInitialization`        | Read-only canonical root, identity and create/reuse snapshot          |
| `applyInitializationPlan`   | Explicit approval; revalidate snapshot; mkdir only; never overwrite   |
| `InitializationPlan`        | Readonly root/action/device/inode snapshot                            |
| `InitializationResult`      | Actual created/reused/declined outcome                                |

CLI adapters consume this module; it has no prompts, process exits or network.
