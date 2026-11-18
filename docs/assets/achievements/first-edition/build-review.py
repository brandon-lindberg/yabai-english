"""Validate generated assets and build development-only review sheets (no API calls)."""
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, PngImagePlugin

ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / "manifest.json"
HELPER = Path.home() / ".codex/skills/impeccable/scripts/impeccable"


def font(size):
    path = Path("/System/Library/Fonts/Supplemental/Arial.ttf")
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default(size=size)


def embed(path, prompt):
    subprocess.run(["sh", str(HELPER), "embed-prompt", str(path), "--prompt", prompt], check=True, capture_output=True, timeout=30)


def export_metadata(art):
    m = PngImagePlugin.PngInfo()
    m.add_text("provenance", json.dumps({"kind": "development review layout", "sourcePrompts": [a["request"]["description"] for a in art]}))
    return m


def save_sheet(items, path, background):
    color, muted = ("#fafafa", "#b7b7bf") if background == "#18181b" else ("#202020", "#66635d")
    sheet = Image.new("RGB", (1024, 980), background)
    draw = ImageDraw.Draw(sheet)
    for i, a in enumerate(items):
        x, y = 24 + (i % 3) * 336, 18 + (i // 3) * 490
        draw.text((x, y), f'{a["number"]:02}  {a["titleEn"]}', font=font(18), fill=color)
        with Image.open(ROOT / a["originalFile"]) as im:
            im = im.convert("RGB")
            sheet.paste(im.resize((256, 256), Image.Resampling.NEAREST), (x, y + 35))
            sheet.paste(im, (x, y + 322))
            sheet.paste(im.resize((64, 64), Image.Resampling.NEAREST), (x + 184, y + 322))
        draw.text((x, y + 298), "256 px / 2×", font=font(13), fill=muted)
        draw.text((x, y + 455), "128 px / native", font=font(13), fill=muted)
        draw.text((x + 176, y + 397), "64 px / badge", font=font(13), fill=muted)
    sheet.save(path, pnginfo=export_metadata(items), optimize=True)


data = json.loads(MANIFEST.read_text())
assert len(data["artworks"]) == 39 and len({a["id"] for a in data["artworks"]}) == 39
for folder in ("native", "thumbs", "enlarged", "review"):
    (ROOT / folder).mkdir(exist_ok=True)
for a in data["artworks"]:
    job_path = ROOT / "jobs" / f'{a["id"]}.json'
    if job_path.exists():
        job = json.loads(job_path.read_text())
        for key in ("jobId", "sourceImageId", "request", "tool", "chargedGenerations", "latestJobChargedGenerations", "revisions"):
            if key in job:
                a[key] = job[key]
    path = ROOT / a["originalFile"]
    if not path.exists() and a.get("sourceSampleFile"):
        shutil.copyfile(ROOT / a["sourceSampleFile"], path)
    if not path.exists():
        continue
    a.setdefault("provider", "PixelLab")
    a.setdefault("tool", "edit_image_pro_flash" if a["request"].get("method") else "create_image_pro_flash")
    a["downloadUrl"] = f'https://api.pixellab.ai/mcp/images/{a["jobId"]}/download'
    with Image.open(path) as im:
        assert im.format == "PNG" and im.size == (128, 128), (a["id"], im.size)
        pixels = im.convert("RGBA")
        assert pixels.getchannel("A").getextrema() == (255, 255), a["id"]
        colors = len(pixels.getcolors(maxcolors=16384))
        assert colors <= 32, (a["id"], colors)
        pixel_hash = hashlib.sha256(pixels.tobytes()).hexdigest()
    embed(path, a["request"]["description"])
    with Image.open(path) as im:
        assert hashlib.sha256(im.convert("RGBA").tobytes()).hexdigest() == pixel_hash
    for key, size in (("thumbnailFile", 64), ("enlargedFile", 256)):
        export = ROOT / a[key]
        pixels.resize((size, size), Image.Resampling.NEAREST).save(export, optimize=True)
        embed(export, a["request"]["description"])
    a.update(status="completed", colors=colors, dimensions=[128, 128], opaque=True,
             chargedGenerations=a.get("chargedGenerations", 6), nativeBytes=path.stat().st_size,
             thumbnailBytes=(ROOT / a["thumbnailFile"]).stat().st_size,
             nativeSha256=hashlib.sha256(path.read_bytes()).hexdigest(), pixelSha256=pixel_hash)
    (ROOT / (a["originalFile"] + ".json")).write_text(json.dumps(a, ensure_ascii=False, indent=2) + "\n")

done = [a for a in data["artworks"] if a["status"] == "completed"]
for batch in range(1, 7):
    items = [a for a in done if a.get("batch") == batch]
    if len(items) == 6:
        for bg, label in (("#f7f5ef", "light"), ("#18181b", "dark")):
            save_sheet(items, ROOT / "review" / f"batch-{batch}-{label}.png", bg)
overview = Image.new("RGB", (1056, 1436), "#f7f5ef")
draw = ImageDraw.Draw(overview)
for a in done:
    i = a["number"] - 1
    x, y = 24 + (i % 6) * 172, 18 + (i // 6) * 202
    with Image.open(ROOT / a["originalFile"]) as im:
        overview.paste(im.convert("RGB"), (x, y))
    draw.text((x, y + 136), f'{a["number"]:02}', font=font(13), fill="#66635d")
    words, lines = a["titleEn"].split(), [""]
    for word in words:
        candidate = (lines[-1] + " " + word).strip()
        if draw.textlength(candidate, font=font(13)) > 150:
            lines.append(word)
        else:
            lines[-1] = candidate
    draw.multiline_text((x, y + 155), "\n".join(lines), font=font(13), fill="#202020", spacing=2)
overview.save(ROOT / "review" / "complete-collection.png", pnginfo=export_metadata(done), optimize=True)
dark_overview = Image.new("RGB", overview.size, "#18181b")
dark_draw = ImageDraw.Draw(dark_overview)
for a in done:
    i = a["number"] - 1
    x, y = 24 + (i % 6) * 172, 18 + (i // 6) * 202
    with Image.open(ROOT / a["originalFile"]) as im:
        dark_overview.paste(im.convert("RGB"), (x, y))
    dark_draw.text((x, y + 136), f'{a["number"]:02}  {a["id"]}', font=font(12), fill="#fafafa")
dark_overview.save(ROOT / "review" / "complete-collection-dark.png", pnginfo=export_metadata(done), optimize=True)
data["completedArtworkCount"] = len(done)
data["newArtworkGenerationUnits"] = sum(a["chargedGenerations"] for a in done if a["origin"] == "remaining artwork batch")
data["nativeBytes"] = sum(a["nativeBytes"] for a in done)
data["thumbnailBytes"] = sum(a["thumbnailBytes"] for a in done)
data["status"] = ("generated; visual review complete" if data.get("visualReview", {}).get("passed") else "generated; visual review pending") if len(done) == 39 else "generation in progress"
MANIFEST.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({k: data[k] for k in ("completedArtworkCount", "nativeBytes", "thumbnailBytes", "newArtworkGenerationUnits")}))
