#!/bin/bash

# Script to save Codespace session history to a file and push to GitHub repository

# Define the output file for the session history
HISTORY_FILE="docs/conversation-history/session_history_$(date +%Y-%m-%d_%H-%M-%S).md"

# Create the directory if it doesn't exist
mkdir -p "$(dirname "$HISTORY_FILE")"

# Save the session history (replace this with actual session data if available)
echo "# Session History" > "$HISTORY_FILE"
echo "\n## Date: $(date)" >> "$HISTORY_FILE"
echo "\n## Commands Executed:" >> "$HISTORY_FILE"
history >> "$HISTORY_FILE"

# Add the file to Git, commit, and push
git add "$HISTORY_FILE"
git commit -m "Save session history on $(date)"
git push

# Notify the user
echo "Session history saved to $HISTORY_FILE and pushed to the repository."