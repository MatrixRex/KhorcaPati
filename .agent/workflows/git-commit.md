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
5. commit to git.
6. If this commit is part of a release (version bump / tag):
   - Push commit and tags immediately: `git push && git push --tags`
   - Monitor GitHub Actions deployment run: `gh run list --limit 1` and ensure deployment completes with status `success`.
   - If deployment fails: check logs (`gh run view --log-failed`), fix the issue, commit, and re-try until deployment succeeds.
