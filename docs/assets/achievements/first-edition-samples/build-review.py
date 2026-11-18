"""Build local review exports; never generates artwork or touches app assets."""

import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, PngImagePlugin

ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / "manifest.json"
IMPECCABLE = Path.home() / ".codex/skills/impeccable/scripts/impeccable"


def font(size):
    path = Path("/System/Library/Fonts/Supplemental/Arial.ttf")
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default(size=size)


def embed(path, prompt):
    subprocess.run(
        ["sh", str(IMPECCABLE), "embed-prompt", str(path), "--prompt", prompt],
        check=True, capture_output=True, text=True, timeout=30,
    )


data = json.loads(MANIFEST.read_text())
art = []
for sample in data["samples"]:
    path = ROOT / sample["originalFile"]
    with Image.open(path) as source:
        assert source.format == "PNG" and source.size == (128, 128), path
        pixels = source.convert("RGBA")
        assert pixels.getchannel("A").getextrema() == (255, 255), path
        colors = len(pixels.getcolors(maxcolors=128 * 128))
        assert colors <= 32, (path, colors)
        pixel_hash = hashlib.sha256(pixels.tobytes()).hexdigest()
    embed(path, sample["request"]["description"])
    with Image.open(path) as embedded:
        assert hashlib.sha256(embedded.convert("RGBA").tobytes()).hexdigest() == pixel_hash
    for size in (64, 256):
        export = ROOT / f'{path.stem}-{size}.png'
        pixels.resize((size, size), Image.Resampling.NEAREST).save(export, optimize=True)
        embed(export, sample["request"]["description"])
    sample.update({
        "status": "completed",
        "downloadUrl": f'https://api.pixellab.ai/mcp/images/{sample["jobId"]}/download',
        "dimensions": [128, 128],
        "colors": colors,
        "opaque": True,
        "nativeBytes": path.stat().st_size,
        "thumbnailBytes": (ROOT / sample["thumbnailFile"]).stat().st_size,
        "nativeSha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "pixelSha256": pixel_hash,
        "exportResampling": "nearest-neighbor; originals retain their native pixels",
    })
    (ROOT / f'{sample["originalFile"]}.json').write_text(json.dumps(sample, ensure_ascii=False, indent=2) + "\n")
    art.append(pixels.convert("RGB"))

# A simple owner-facing artwork strip, not a mockup of the application UI.
overview = Image.new("RGB", (992, 424), "#f7f5ef")
draw = ImageDraw.Draw(overview)
for i, (sample, original) in enumerate(zip(data["samples"], art)):
    x = 32 + i * 320
    draw.text((x, 24), sample["title"], font=font(23), fill="#202020")
    draw.text((x, 55), sample["theme"], font=font(16), fill="#66635d")
    overview.paste(original.resize((256, 256), Image.Resampling.NEAREST), (x, 92))
    draw.text((x, 369), "128 px original · shown at 2×", font=font(15), fill="#66635d")

# All three display sizes on both backgrounds; no changes to source colors.
review = Image.new("RGB", (992, 1120), "#f7f5ef")
draw = ImageDraw.Draw(review)
draw.rectangle((0, 560, 992, 1120), fill="#18181b")
for y, text_color, muted in ((0, "#202020", "#66635d"), (560, "#fafafa", "#b7b7bf")):
    for i, (sample, original) in enumerate(zip(data["samples"], art)):
        x = 32 + i * 320
        draw.text((x, y + 22), sample["title"], font=font(22), fill=text_color)
        review.paste(original.resize((256, 256), Image.Resampling.NEAREST), (x, y + 68))
        draw.text((x, y + 333), "256 px · 2× gallery enlargement", font=font(14), fill=muted)
        review.paste(original, (x, y + 380))
        review.paste(original.resize((64, 64), Image.Resampling.NEAREST), (x + 184, y + 380))
        draw.text((x, y + 521), "128 px · native", font=font(14), fill=muted)
        draw.text((x + 166, y + 461), "64 px · badge", font=font(14), fill=muted)

metadata = PngImagePlugin.PngInfo()
metadata.add_text("provenance", json.dumps({"kind": "review layout", "sourcePrompts": [s["request"]["description"] for s in data["samples"]]}))
overview.save(ROOT / "sample-overview.png", pnginfo=metadata, optimize=True)
review.save(ROOT / "size-and-background-review.png", pnginfo=metadata, optimize=True)
data["chargedGenerations"] = sum(s["chargedGenerations"] for s in data["samples"]) + sum(s["chargedGenerations"] for s in data.get("supersededSamples", []))
MANIFEST.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
print(json.dumps([{k: s[k] for k in ("achievementId", "dimensions", "colors", "nativeBytes", "thumbnailBytes")} for s in data["samples"]], indent=2))
