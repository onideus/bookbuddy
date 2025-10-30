#!/usr/bin/env bash

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the root project directory (main worktree)
ROOT_PROJECT=$(git worktree list | head -n 1 | awk '{print $1}')
WORKTREES_DIR="$HOME/.claude-squad/worktrees"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Agent Environment Sync Script${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}Root Project:${NC} $ROOT_PROJECT"
echo -e "${GREEN}Worktrees Dir:${NC} $WORKTREES_DIR"
echo ""

# Environmental files to copy (will skip if they don't exist)
ENV_FILES=(
  ".env"
  ".env.local"
  ".env.development"
  ".env.production"
  ".env.test"
  "config.local.json"
)

# Function to determine agent role from directory name
get_agent_role() {
  local dir_name=$(basename "$1")

  if [[ "$dir_name" =~ ^overseer ]]; then
    echo "overseer"
  elif [[ "$dir_name" =~ ^implementor-a ]]; then
    echo "implementor-a"
  elif [[ "$dir_name" =~ ^implementor-b ]]; then
    echo "implementor-b"
  elif [[ "$dir_name" =~ ^implementor-c ]]; then
    echo "implementor-c"
  else
    echo "single-agent"
  fi
}

# Function to sync env files to a worktree
sync_env_files() {
  local worktree_path="$1"
  local files_copied=0

  for env_file in "${ENV_FILES[@]}"; do
    if [[ -f "$ROOT_PROJECT/$env_file" ]]; then
      cp "$ROOT_PROJECT/$env_file" "$worktree_path/$env_file"
      echo -e "  ${GREEN}✓${NC} Copied $env_file"
      ((files_copied++))
    fi
  done

  if [[ $files_copied -eq 0 ]]; then
    echo -e "  ${YELLOW}ℹ${NC} No env files found in root project"
  fi
}

# Function to setup agent role file
setup_agent_role() {
  local worktree_path="$1"
  local role="$2"

  # Create .claude directory if it doesn't exist
  mkdir -p "$worktree_path/.claude"

  # Write agent role
  echo "$role" > "$worktree_path/.claude/agent-role.local"
  echo -e "  ${GREEN}✓${NC} Set agent role: ${BLUE}$role${NC}"
}

# Process each worktree
echo -e "${BLUE}Processing worktrees...${NC}"
echo ""

git worktree list | tail -n +2 | while read -r worktree_line; do
  worktree_path=$(echo "$worktree_line" | awk '{print $1}')
  worktree_name=$(basename "$worktree_path")

  echo -e "${YELLOW}┌─ $worktree_name${NC}"

  # Determine agent role
  agent_role=$(get_agent_role "$worktree_path")

  # Sync env files
  sync_env_files "$worktree_path"

  # Setup agent role
  setup_agent_role "$worktree_path" "$agent_role"

  echo -e "${YELLOW}└─ Complete${NC}"
  echo ""
done

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ All agents synced successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Agent Role Mapping:${NC}"
echo -e "  overseer_*          → overseer"
echo -e "  implementor-a_*     → implementor-a"
echo -e "  implementor-b_*     → implementor-b"
echo -e "  implementor-c_*     → implementor-c"
echo ""
