Place your 5 webm files directly in this folder (public/videos/) before
running `npm run build`. Filenames must match exactly:

  hammy-breathe.webm
  hammy-posture.webm
  hammy-eye-break.webm
  hammy-drink-water.webm
  hammy-stretch.webm

WXT copies this folder as-is into .output/chrome-mv3/videos/ on build.

IMPORTANT — these clips rely on a real VP9 alpha channel (transparent
background) so Hammy shows through onto the page instead of a solid
color box. If you ever need to shrink these for size, be careful:

  - A generic re-encode (e.g. `ffmpeg -i in.webm -vf scale=640:-2
    -c:v libvpx-vp9 ...`) without an explicit alpha pass can silently
    drop the transparency while still reporting `alpha_mode: 1` in the
    metadata — the file looks fine in ffprobe but plays as a solid
    opaque rectangle in the browser.
  - To re-encode correctly, force the alpha plane through the filter
    chain and encoder explicitly:

      ffmpeg -i in.webm \
        -vf "format=yuva420p,scale=640:-2" \
        -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 34 \
        -c:a libopus -b:a 48k out.webm

  - Even then, libvpx-vp9's alpha re-encoding is known to be flaky.
    Don't trust the metadata flag — verify the actual alpha plane
    before shipping:

      ffmpeg -i out.webm -vf "format=yuva420p,alphaextract" \
        -update 1 -frames:v 1 -ss 3 alpha_check.png

    If alpha_check.png comes out solid white, the transparency was
    lost — the clip will render as an opaque box, not a floating
    hamster.
