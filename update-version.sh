#!/bin/bash

# Read the current version
version=$(grep "APP_VERSION = '" lib/version.ts | sed "s/export const APP_VERSION = '//;s/'//")

# Split the version into major, minor, and patch
IFS='.' read -ra VERSION_PARTS <<< "$version"
major=${VERSION_PARTS[0]}
minor=${VERSION_PARTS[1]}
patch=${VERSION_PARTS[2]}

# Increment the patch version
patch=$((patch + 1))

# Create the new version string
new_version="$major.$minor.$patch"

# Update the version in the file
sed -i "s/APP_VERSION = '.*'/APP_VERSION = '$new_version'/" lib/version.ts

echo "Updated version to $new_version"

