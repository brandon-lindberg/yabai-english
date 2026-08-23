#!/usr/bin/env python3
"""
Cuts the app icons out of the brand artwork.

Python rather than TypeScript because this needs Pillow, and it runs by hand on
the rare occasions the artwork changes — not in CI or the build:

    pip install Pillow
    python3 apps/web/scripts/generate-brand-icons.py

`brand/esj-logo-source.png` is a presentation sheet: one flat 1536x1024 raster
holding the hero lockup, the wordmark, and — along the bottom — five icon tiles
at descending sizes.

Those five tiles are the important part, and the reason this script exists
rather than a crop of the hero fox. They are not scaled copies of one image:
the designer redrew the mark for each size, zooming in and shedding detail as it
shrinks, and shifting the frame from rounded square to circle. At 16px the hero
fox turns to grey mush; tile 5, drawn for that size, still reads as a fox. So
each output below is cut from the tile authored closest to its display size, and
is only ever downscaled where the source allows.

Tile boxes were measured off the sheet's alpha channel — the near-opaque tile
square, not the soft glow around it. Re-deriving them by hand is the painful
part if the artwork is ever recut.
"""

import io
import struct
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "brand" / "esj-logo-source.png"
PUBLIC = ROOT / "apps" / "web" / "public"
APP_DIR = ROOT / "apps" / "web" / "src" / "app"

# The five authored tiles, largest to smallest.
TILES = {
    1: (206, 718, 448, 966),   # 242px — rounded square, head and shoulders
    2: (545, 783, 725, 965),   # 180px
    3: (820, 819, 960, 963),   # 140px
    4: (1061, 835, 1185, 962), # 124px — frame tightening toward a circle
    5: (1279, 872, 1365, 960), #  86px — circular, head only, least detail
}

# The tiles' own ground, sampled from inside their edges. Padding added below
# has to match it exactly or the join shows.
TILE_INK = (20, 20, 20, 255)

# Maskable icons are cropped by the platform to an arbitrary shape; only the
# middle 80% is guaranteed visible.
MASKABLE_SAFE = 0.80


def tile(n: int, size: int, *, keep_shape: bool = False) -> Image.Image:
    """
    Tile `n`, as a square of `size` px.

    The authored tiles are rounded — squares at the large end, a circle at the
    small end — with transparent corners. `keep_shape` preserves that, which is
    what the PWA icons want since platforms show them unmasked. Everything else
    fills the corners with the tiles' own ground: a maskable icon must bleed to
    its edges, iOS applies its own rounding to the touch icon, and at favicon
    sizes a rounded corner is two grey pixels rather than a shape.
    """
    source = Image.open(SOURCE).convert("RGBA")
    x0, y0, x1, y1 = TILES[n]
    # The measured boxes run a few pixels tall from antialiasing along the
    # bottom edge; take a centred square so nothing is stretched.
    side = min(x1 - x0, y1 - y0)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    square = source.crop((cx - side // 2, cy - side // 2, cx + side // 2, cy + side // 2))
    if not keep_shape:
        ground = Image.new("RGBA", square.size, TILE_INK)
        ground.alpha_composite(square)
        square = ground
    return square.resize((size, size), Image.LANCZOS)


def to_grey(image: Image.Image) -> Image.Image:
    """
    Store as greyscale.

    The artwork's largest per-pixel RGB spread is 10/255 — imperceptible, and
    the design system is a value ladder with no brand hue anyway. Dropping the
    two redundant channels cuts each icon by roughly two thirds.
    """
    return image.convert("LA" if "A" in image.getbands() else "L")


def write_ico(path: Path, frames: dict[int, Image.Image]) -> None:
    """
    Write a multi-size .ico, one distinct image per size.

    Hand-rolled because Pillow's ICO writer takes a single image and derives the
    other sizes by downscaling it — it ignores `append_images`, so the whole
    point here, a differently drawn mark at each size, cannot survive it. Each
    entry is stored PNG-compressed, which every browser in use understands.
    """
    blobs = {}
    for size, image in sorted(frames.items()):
        buf = io.BytesIO()
        to_grey(image).convert("RGBA").save(buf, format="PNG", optimize=True)
        blobs[size] = buf.getvalue()

    header = struct.pack("<HHH", 0, 1, len(blobs))
    offset = len(header) + 16 * len(blobs)
    directory, payload = b"", b""
    for size, blob in blobs.items():
        directory += struct.pack(
            "<BBBBHHII",
            size if size < 256 else 0,
            size if size < 256 else 0,
            0, 0, 1, 32, len(blob), offset,
        )
        payload += blob
        offset += len(blob)

    path.write_bytes(header + directory + payload)


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"missing brand source: {SOURCE}")

    written = []

    def emit(path: Path, image: Image.Image, **save_kw):
        to_grey(image).save(path, **save_kw)
        written.append(path)

    # PWA icons. Tile 1 is the only tile with enough pixels for these; 512 is a
    # 2.1x upscale of it, which is softer than ideal but keeps the authored
    # framing rather than substituting a differently-drawn fox.
    emit(PUBLIC / "icon-192.png", tile(1, 192, keep_shape=True), optimize=True)
    emit(PUBLIC / "icon-512.png", tile(1, 512, keep_shape=True), optimize=True)

    # Maskable: tile 1 inset on matching ground, so a circular crop keeps the ears.
    canvas = Image.new("RGBA", (512, 512), TILE_INK)
    inner = round(512 * MASKABLE_SAFE)
    canvas.alpha_composite(tile(1, inner), ((512 - inner) // 2, (512 - inner) // 2))
    emit(PUBLIC / "icon-maskable-512.png", canvas, optimize=True)

    # Apple touch: tile 2 is 180px, the exact size wanted — a straight 1:1 cut.
    # iOS rounds it, so it ships square.
    emit(PUBLIC / "apple-touch-icon.png", tile(2, 180).convert("RGB"), optimize=True)

    # Favicon: each embedded size from the tile drawn nearest to it, so the 16px
    # entry is the simplified circular mark rather than a shrunk illustration.
    ico_path = APP_DIR / "favicon.ico"
    write_ico(ico_path, {16: tile(5, 16), 32: tile(4, 32), 48: tile(3, 48)})
    written.append(ico_path)

    for p in written:
        print(f"  {p.relative_to(ROOT)}  ({p.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
