#!/usr/bin/env bash
# Keep a full local working clone of this repo in sync, for disaster-recovery
# backup AND so the copy stays directly usable to keep coding from.
#
# Usage:
#   scripts/backup_repo.sh [DEST_DIR]
#
# DEST_DIR defaults to $ROOGONDEE_BACKUP_DIR or ~/roogoodee-backup.
#
# First run clones the repo. Later runs fetch all branches/tags and
# fast-forward the currently checked-out branch only if the working tree
# is clean (never overwrites uncommitted local work). A dated bundle
# snapshot is also written under DEST_DIR/.snapshots for point-in-time
# recovery even if the working clone itself gets corrupted.

set -euo pipefail

REMOTE_URL="${ROOGONDEE_REMOTE_URL:-git@github.com:roogondee/roogoodee.git}"
DEST_DIR="${1:-${ROOGONDEE_BACKUP_DIR:-$HOME/roogoodee-backup}}"
SNAPSHOT_DIR="$DEST_DIR/.snapshots"
KEEP_SNAPSHOTS="${ROOGONDEE_BACKUP_KEEP_SNAPSHOTS:-14}"

log() { printf '[backup_repo] %s\n' "$1"; }

if [ ! -d "$DEST_DIR/.git" ]; then
  log "no local clone at $DEST_DIR yet, cloning..."
  git clone "$REMOTE_URL" "$DEST_DIR"
else
  log "syncing existing clone at $DEST_DIR"
  git -C "$DEST_DIR" fetch --all --tags --prune

  if [ -n "$(git -C "$DEST_DIR" status --porcelain)" ]; then
    log "working tree has local changes, skipping fast-forward (refs are still updated)"
  else
    current_branch="$(git -C "$DEST_DIR" symbolic-ref --short -q HEAD || true)"
    if [ -n "$current_branch" ] && git -C "$DEST_DIR" rev-parse --verify -q "origin/$current_branch" >/dev/null; then
      git -C "$DEST_DIR" merge --ff-only "origin/$current_branch"
      log "fast-forwarded '$current_branch' to origin"
    else
      log "detached HEAD or no matching remote branch, skipping fast-forward"
    fi
  fi
fi

mkdir -p "$SNAPSHOT_DIR"
snapshot_file="$SNAPSHOT_DIR/roogoodee-$(date +%Y%m%d-%H%M%S).bundle"
git -C "$DEST_DIR" bundle create "$snapshot_file" --all
log "wrote snapshot bundle: $snapshot_file"

# Prune old snapshots, keep the most recent N.
mapfile -t snapshots < <(ls -1t "$SNAPSHOT_DIR"/*.bundle 2>/dev/null)
if [ "${#snapshots[@]}" -gt "$KEEP_SNAPSHOTS" ]; then
  for old in "${snapshots[@]:$KEEP_SNAPSHOTS}"; do
    rm -f "$old"
    log "pruned old snapshot: $old"
  done
fi

log "done. working clone: $DEST_DIR | snapshots: $SNAPSHOT_DIR"
