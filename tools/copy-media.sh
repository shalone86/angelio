#!/bin/bash
# Copy every video, thumbnail and download the library uses (its media/... addresses) from the Ghost kids site into the
# Cloudflare R2 bucket "watch-media", keeping Ghost's paths (content/media/2026/10/lesson-10.mp4 →
# media/2026/10/lesson-10.mp4). Safe to run again: files already copied (listed in DONE) are skipped.
# Run from the repo:  bash tools/copy-media.sh
# Needs: curl, jq, npx wrangler (logged in). Nothing is deleted from Ghost.
set -u
LIB=public/data/library.json
BUCKET=watch-media
GHOST=https://kids.methodiusmedia.com/content/
WORK=${WORK:-.media-work}
DONE=$WORK/done.txt
mkdir -p "$WORK"; touch "$DONE"
type_of() {
  case "${1,,}" in
    *.mp4) echo video/mp4 ;; *.mov) echo video/quicktime ;; *.mp3) echo audio/mpeg ;; *.m4a) echo audio/mp4 ;; *.wav) echo audio/wav ;;
    *.pdf) echo application/pdf ;; *.png) echo image/png ;; *.jpg|*.jpeg) echo image/jpeg ;; *.webp) echo image/webp ;; *.gif) echo image/gif ;;
    *) echo application/octet-stream ;;
  esac
}
# Every media/... address in the library, with the Ghost address it comes from.
jq -r '[(.lessons + .songs)[] | .video, .poster, (.downloads[]?.url)] | map(select(. != null and startswith("media/"))) | unique[]
  | "\(.[6:])\t\(.[6:] | split("/") | map(@uri) | join("/"))"' "$LIB" | while IFS=$'\t' read -r key path; do
  url="$GHOST$path"
  grep -qxF "$key" "$DONE" && continue
  if ! curl -sS -f -m 900 -o "$WORK/file" "$url"; then echo "FAILED download: $key"; continue; fi
  size=$(stat -c %s "$WORK/file")
  if [ "$size" -gt 300000000 ]; then echo "TOO BIG for a simple upload ($size bytes): $key"; continue; fi
  if npx wrangler r2 object put "$BUCKET/$key" --file "$WORK/file" --content-type "$(type_of "$key")" --remote >/dev/null 2>"$WORK/err"; then
    echo "$key" >> "$DONE"; echo "ok $((size / 1000000)) MB  $key"
  else
    echo "FAILED upload: $key: $(tail -1 "$WORK/err")"
  fi
done
rm -f "$WORK/file"
echo "copied: $(wc -l < "$DONE") files"
