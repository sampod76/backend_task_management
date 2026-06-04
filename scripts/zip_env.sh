#!/bin/bash

# Full path to the 7z.exe file
ZIP_COMMAND="/c/Program Files/7-Zip/7z.exe"

# Path to the .env file
ENV_FILE=.env

# Output path for the .env.zip file
ZIP_FILE=.env.zip

# Password for the zip file from Windows environment variable
ZIP_PASS=$ZIP_PASS

# Check if .env exists
if [ -f "$ENV_FILE" ]; then
    echo "Compressing .env into .env.zip with password protection..."
    "$ZIP_COMMAND" a -p"$ZIP_PASS" -y "$ZIP_FILE" "$ENV_FILE" > /dev/null
    echo "Compression complete!"
else
    echo "ERROR: .env file not found!"
    exit 1
fi
