# GitHub local backup

Goal: keep a copy of this repo on a local machine that (1) survives GitHub
being unavailable or a repo being deleted/corrupted, and (2) stays a normal
working clone you can keep coding in — not a cold archive you'd have to
restore first.

## Script

`scripts/backup_repo.sh [DEST_DIR]`

- First run: `git clone` into `DEST_DIR` (default `~/roogoodee-backup`, or
  set `ROOGONDEE_BACKUP_DIR`).
- Later runs: `git fetch --all --tags --prune` (always), then fast-forwards
  the currently checked-out branch **only if the working tree is clean**.
  If you have local edits, the fetch still updates the refs but never
  touches your uncommitted work.
- Every run also writes a dated `git bundle --all` snapshot under
  `DEST_DIR/.snapshots/` — a single portable file containing every branch
  and tag at that point in time, kept independent of the working clone in
  case that clone itself gets corrupted. Old snapshots beyond
  `ROOGONDEE_BACKUP_KEEP_SNAPSHOTS` (default 14) are pruned automatically.

```bash
# one-off
scripts/backup_repo.sh

# custom location / remote
ROOGONDEE_BACKUP_DIR=/mnt/backups/roogoodee \
ROOGONDEE_REMOTE_URL=https://github.com/roogondee/roogoodee.git \
scripts/backup_repo.sh
```

## Automate it (cron)

```
# crontab -e
0 * * * * /path/to/scripts/backup_repo.sh >> ~/roogoodee-backup.log 2>&1
```

Hourly is enough for a lead-gen site with this commit volume; tighten if
needed.

## Keep working from the backup

`DEST_DIR` is a real working clone, so you can `cd` into it and develop
normally at any time — branch, commit, push. It's kept up to date the same
way any dev machine stays current: `git fetch` + fast-forward when clean.
If GitHub is down, you can still branch and commit locally; push once
GitHub is back.

## Recovering from a snapshot bundle

If the working clone is gone or broken, restore from the newest bundle
under `.snapshots/`:

```bash
git clone /path/to/roogoodee-backup/.snapshots/roogoodee-<timestamp>.bundle restored-repo
cd restored-repo
git remote set-url origin git@github.com:roogondee/roogoodee.git
```

This gives back every branch and tag that existed at snapshot time, ready
to push back to GitHub if needed.
