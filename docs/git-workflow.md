# Git workflow for this repo

Use this flow in VS Code Source Control for safe day-to-day updates.

## Normal update cycle

1. Pull latest `main` before edits.
2. Make changes and verify in browser.
3. Stage files intentionally (avoid "Stage All" unless you checked all files).
4. Commit with a clear message.
5. Push to `origin/main`.
6. Confirm GitHub Pages deploy updated.

## Good commit message examples

- `Fix move card spacing on mobile`
- `Add new abilities data and rendering logic`
- `Update favicon and home page hero image`

## Safety checks before push

- `git status` is clean except intended files.
- No secrets (`.env`, keys, tokens) are tracked.
- Large binary assets are intentional.

## Helpful commands

```bash
git pull --rebase origin main
git status -sb
git log --oneline --decorate -n 5
git push origin main
```

