#!/bin/bash

#cd /scripts && chmod +x gitpush.sh

# Use first argument as commit message
msg="$1"

# Check if a commit message was provided
if [ -z "$msg" ]; then
  echo "Error: No commit message provided."
  echo "Usage: pnpm gitpush \"your commit message\""
  exit 1
fi

# Run Git commands
git add .
git commit -m "$msg"
git push

echo "Git commands executed successfully."
