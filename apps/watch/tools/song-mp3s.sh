#!/bin/bash
# An MP3 for every song that doesn't have one: takes the sound out of the song's video (ffmpeg), uploads it to
# the R2 bucket "watch-media" as audio/<song id>.mp3 (served at media/audio/<song id>.mp3), and lists it in content/song-audio.json, which
# tools/import-ghost.mjs (and this script) add to each song's downloads as "🎧 Song (audio)".
# Safe to run again: songs already listed are skipped. Run from apps/watch:  bash tools/song-mp3s.sh
# Needs: curl, jq, ffmpeg, npx wrangler (logged in).
set -u
LIB=public/data/library.json
LIST=content/song-audio.json
BUCKET=watch-media
SITE=${SITE:-https://angelio.org/watch/}
WORK=${WORK:-.media-work}
mkdir -p "$WORK"; [ -f "$LIST" ] || echo '{}' > "$LIST"
jq -r '.songs[] | select([.downloads[]?.url | test("\\.mp3$")] | any | not) | select(.video != null) | "\(.id)\t\(.video)"' "$LIB" |
while IFS=$'\t' read -r id video; do
  jq -e --arg id "$id" 'has($id)' "$LIST" >/dev/null && continue
  key="audio/$id.mp3"   # R2 key; the library address is media/<key>
  if ! curl -sS -f -m 900 -o "$WORK/video" "$SITE$video"; then echo "FAILED download: $id"; continue; fi
  # 192 kbps stereo, evened out to a normal listening level.
  if ! ffmpeg -nostdin -loglevel error -y -i "$WORK/video" -vn -af loudnorm=I=-16:TP=-1.5 -ar 44100 -ac 2 -b:a 192k "$WORK/song.mp3"; then echo "FAILED ffmpeg: $id"; continue; fi
  if npx wrangler r2 object put "$BUCKET/$key" --file "$WORK/song.mp3" --content-type audio/mpeg --remote >/dev/null 2>"$WORK/err"; then
    jq --arg id "$id" --arg key "media/$key" '. + {($id): $key}' "$LIST" > "$WORK/list" && mv "$WORK/list" "$LIST"
    echo "ok $(( $(stat -c %s "$WORK/song.mp3") / 1000 )) KB  $id"
  else
    echo "FAILED upload: $id: $(tail -1 "$WORK/err")"
  fi
done
rm -f "$WORK/video" "$WORK/song.mp3"
echo "songs with a made MP3: $(jq 'length' "$LIST")"
