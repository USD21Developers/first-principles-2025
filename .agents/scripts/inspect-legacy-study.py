from pathlib import Path
import fitz

source = Path("attached_assets/ICC_First_Principles_LIGHT_&_DARKNESS_(Legacy)_(3)_1792789100944.pdf")
output = Path("/tmp/fp-legacy-pdf")
output.mkdir(parents=True, exist_ok=True)
document = fitz.open(source)
print(f"Pages: {len(document)}")
for index, page in enumerate(document):
    page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(output / f"page-{index + 1}.png")
    print(f"\n--- PAGE {index + 1} ({page.rect}) ---\n{page.get_text()}")
    print("Images:", page.get_images(full=True))

output.joinpath("source.txt").write_text(
    "\n\n".join(f"PAGE {i + 1}\n{page.get_text()}" for i, page in enumerate(document)),
    encoding="utf-8",
)
assets = Path("artifacts/first-principles/public/fp/en/light-darkness-legacy/img")
assets.mkdir(parents=True, exist_ok=True)
for page_index, name, bounds in [
    (0, "wall-of-sin", (143, 209, 260, 259)),
    (0, "all-have-sinned", (260, 385, 362, 468)),
    (0, "wages-and-gift", (92, 536, 317, 591)),
    (1, "baptism", (44, 314, 193, 421)),
]:
    if name == "all-have-sinned":
        # The adjacent paragraph overlaps the crop above the bars. Mask only
        # that text on this in-memory page, retaining the SIN label at right.
        document[page_index].draw_rect(
            fitz.Rect(260, 385, 317, 391),
            color=None, fill=(0.957, 0.957, 0.957), overlay=True
        )
    document[page_index].get_pixmap(
        matrix=fitz.Matrix(3, 3), clip=fitz.Rect(*bounds), alpha=False
    ).save(assets / f"{name}.png")
