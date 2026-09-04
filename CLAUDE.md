# CLAUDE.md — english-platform

## Long-running processes

The rule for starting and killing servers lives in `~/.claude/CLAUDE.md` and
applies everywhere. What is specific to this repo:

- `yarn dev` / `yarn start` delegate through `yarn --cwd apps/web`, so the
  process that ends up holding the port renames itself to `next-server (vX.Y.Z)`
  and no name pattern built from the command you typed will match it.
- **`postgres` (5432) and `redis` (6379) are pre-existing local services.** The
  app needs both. They are not ours to kill during cleanup.
- Nothing of ours should be listening on 3000–4000 once a task is finished.
