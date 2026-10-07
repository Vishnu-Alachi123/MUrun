#!/bin/bash
# Run this once on your Mac after cloning.
# It scaffolds the native iOS folder, installs dependencies, and runs pod install.

set -e

echo "==> MUrun setup"

# 1. Generate native iOS project in a temp dir, then bring over the ios/ folder
if [ ! -d "ios" ]; then
  echo "--> Generating native iOS scaffold..."
  TMPDIR=$(mktemp -d)
  npx react-native@0.74.5 init MUrun --directory "$TMPDIR/MUrun" --skip-git-init --pm npm 2>&1 | grep -v "^$"
  cp -r "$TMPDIR/MUrun/ios" ./ios
  rm -rf "$TMPDIR"
  echo "--> ios/ folder created"
else
  echo "--> ios/ folder already exists, skipping scaffold"
fi

# 2. npm install
echo "--> Installing npm packages..."
npm install

# 3. Patch Info.plist
PLIST="ios/MUrun/Info.plist"
if [ -f "$PLIST" ]; then
  # UIBackgroundModes: audio
  if ! grep -q "UIBackgroundModes" "$PLIST"; then
    echo "--> Patching Info.plist with UIBackgroundModes..."
    # Insert before closing </dict></plist>
    sed -i '' 's|</dict>\n</plist>||' "$PLIST" 2>/dev/null || true
    plutil -insert UIBackgroundModes -xml "<array><string>audio</string></array>" "$PLIST" 2>/dev/null || \
      echo "  ⚠️  Could not auto-patch UIBackgroundModes — add it manually (see ios-patches/Info.plist.additions.xml)"
  fi

  # CFBundleURLTypes for murun:// redirect
  if ! grep -q "murun" "$PLIST"; then
    plutil -insert CFBundleURLTypes -xml "<array><dict><key>CFBundleURLSchemes</key><array><string>murun</string></array></dict></array>" "$PLIST" 2>/dev/null || \
      echo "  ⚠️  Could not auto-patch CFBundleURLTypes — add it manually (see ios-patches/Info.plist.additions.xml)"
  fi

  # NSMotionUsageDescription
  if ! grep -q "NSMotionUsageDescription" "$PLIST"; then
    plutil -insert NSMotionUsageDescription -string "MUrun uses motion sensors to automatically detect your running cadence." "$PLIST" 2>/dev/null || \
      echo "  ⚠️  Could not auto-patch NSMotionUsageDescription — add it manually"
  fi

  # LSApplicationQueriesSchemes
  if ! grep -q "LSApplicationQueriesSchemes" "$PLIST"; then
    plutil -insert LSApplicationQueriesSchemes -xml "<array><string>spotify</string></array>" "$PLIST" 2>/dev/null || \
      echo "  ⚠️  Could not auto-patch LSApplicationQueriesSchemes — add it manually"
  fi

  echo "--> Info.plist patched"
fi

# 4. Pod install
echo "--> Running pod install..."
cd ios && pod install && cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Open src/services/SpotifyRemoteService.ts and replace YOUR_CLIENT_ID"
echo "  2. Open ios/MUrun.xcworkspace in Xcode"
echo "  3. Select your device and press Run"
echo ""
echo "See SETUP.md for the full guide."
