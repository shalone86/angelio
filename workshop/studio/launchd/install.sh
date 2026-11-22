#!/bin/sh
# npm run studio-autostart: the workshop starts when he logs in and restarts if it stops.
# Written for this folder (wherever the Angelio repo is on this Mac). Replaces the old sdcourses one.
set -e
DIR=$(cd "$(dirname "$0")/../.." && pwd)
NODE=$(command -v node)
PLIST="$HOME/Library/LaunchAgents/org.angelio.workshop.plist"
launchctl bootout "gui/$(id -u)/com.sdcourses.studio" 2>/dev/null || true
rm -f "$HOME/Library/LaunchAgents/com.sdcourses.studio.plist"
launchctl bootout "gui/$(id -u)/org.angelio.workshop" 2>/dev/null || true
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>org.angelio.workshop</string>
  <key>WorkingDirectory</key><string>$DIR</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE</string>
    <string>studio/server.mjs</string>
    <string>--no-open</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/angelio-workshop.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/angelio-workshop.log</string>
</dict>
</plist>
PL
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "The workshop starts at login now ($DIR). Log: ~/Library/Logs/angelio-workshop.log"
