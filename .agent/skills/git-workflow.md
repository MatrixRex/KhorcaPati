# Skill: Git Staging & Commit Messaging

Instructions for consistently staging changes and generating high-quality commit messages.

## Workflow Steps

### 1. Assessment
- Run `git status` to see which files have changed.
- Use `git diff` on key files to understand the specific logic changes.
- Identify the primary intent (e.g., new feature, bug fix, UI polish).

### 2. Staging
- Use `git add <file>` for specific, related changes.
- Use `git add .` only if all current changes belong to the same logical unit.
- Verify staging with `git status -s`.

### 3. Commit Message Generation
Craft the message using the following structure:
- **Type**: `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:`.
- **Subject**: Concise summary of the main change.
- **Body**: Bulleted list of specific technical or functional updates.

### 4. Verification
- Ensure no temporary files or secrets are being committed.
- Check if any new dependencies were added to `package.json`.

## Best Practices
- Focus messages on **why** the change was made, not just **what**.
- Group related changes (e.g., schema update + store update) into one commit.
- For UI changes, mention specific components or layout shifts.
