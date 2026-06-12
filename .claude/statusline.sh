#!/usr/bin/env bash

# Gealium Project Status Line
# Displays: [vim mode] [@agent] directory (branch) [context %] model

# Read JSON input from stdin
input=$(cat)

# Extract values from JSON
cwd=$(echo "$input" | jq -r '.workspace.current_dir // empty')
model=$(echo "$input" | jq -r '.model.display_name // empty')
branch=$(cd "$cwd" 2>/dev/null && git -c core.useBuiltinFSMonitor=false branch --show-current 2>/dev/null)
remaining=$(echo "$input" | jq -r '.context_window.remaining_percentage // empty')
agent=$(echo "$input" | jq -r '.agent.name // empty')
vim_mode=$(echo "$input" | jq -r '.vim.mode // empty')

# Build status line components
status=""

# Add vim mode if present
if [ -n "$vim_mode" ]; then
  if [ "$vim_mode" = "NORMAL" ]; then
    status+=$(printf "\033[32m[N]\033[0m ")
  else
    status+=$(printf "\033[33m[I]\033[0m ")
  fi
fi

# Add agent name if present
if [ -n "$agent" ]; then
  status+=$(printf "\033[36m@%s\033[0m " "$agent")
fi

# Add current directory (basename only)
if [ -n "$cwd" ]; then
  dir_name=$(basename "$cwd")
  status+=$(printf "\033[34m%s\033[0m" "$dir_name")
fi

# Add git branch if available
if [ -n "$branch" ]; then
  status+=$(printf " \033[35m(%s)\033[0m" "$branch")
fi

# Add context remaining percentage
if [ -n "$remaining" ]; then
  # Color code based on remaining percentage
  if [ "${remaining%.*}" -gt 50 ]; then
    color="\033[32m"  # Green
  elif [ "${remaining%.*}" -gt 20 ]; then
    color="\033[33m"  # Yellow
  else
    color="\033[31m"  # Red
  fi
  status+=$(printf " ${color}[ctx: %.0f%%]\033[0m" "$remaining")
fi

# Add model name (short form)
if [ -n "$model" ]; then
  # Shorten model name (e.g., "Claude 3.5 Sonnet" -> "3.5S")
  short_model=$(echo "$model" | sed -E 's/Claude ([0-9.]+) (Sonnet|Opus|Haiku).*/\1\2/' | sed 's/Sonnet/S/' | sed 's/Opus/O/' | sed 's/Haiku/H/')
  status+=$(printf " \033[90m%s\033[0m" "$short_model")
fi

# Output the status line
echo "$status"

