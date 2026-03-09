---
description: Stage all current changes and generate a structured git commit message.
---

1. Run `git status` to see the current state of the workspace.
2. Summarize the changes and append them to `CHANGELOG.md` under a new version or date heading.
// turbo
3. Add all pending changes (including the updated CHANGELOG) to the staging area.
`git add .`
4. Generate a structured commit message with the following format:
   - **Type**: feat/fix/refactor/style
   - **Subject**: Main objective (one line)
   - **Body**: Detailed bullet points explaining the 'why' and technical changes.
5. Present the final commit message to the user for confirmation.
