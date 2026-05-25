# Contributing

## Branch workflow

This repository uses two long-lived branches:

- **`main`** — stable releases only
- **`dev`** — all day-to-day development

### Rules

1. Check out `dev` before making changes.
2. Commit and push to `origin/dev`.
3. Merge `dev` → `main` when a release is ready (not the other way around for feature work).
4. Do **not** open parallel feature branches (e.g. `cursor/...`) unless explicitly agreed for a one-off experiment.

### Typical commands

```bash
git fetch origin
git checkout dev
git pull origin dev

# after your edits
git add -A
git commit -m "describe your change"
git push origin dev
```

### Render / deployment

Point preview or staging environments at `dev`; production should track `main` after merge.
