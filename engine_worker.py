"""
FormatX · Python Engine Worker
Called as subprocess from backend (MSYS2 Python -> F: Python 3.13)
Usage: /f/python3.13.0/python.exe engine_worker.py <engine> <input> <output> [opts]
"""
import sys
import os

def engine_pillow(input_path, output_path):
    from PIL import Image
    img = Image.open(input_path)
    fmt = os.path.splitext(output_path)[1].upper().lstrip(".")
    if fmt == "JPG": fmt = "JPEG"
    if img.mode in ("RGBA", "P") and fmt == "JPEG":
        img = img.convert("RGB")
    img.save(output_path, format=fmt, quality=92)
    print("OK")

def engine_pymupdf(input_path, output_path):
    import fitz
    doc = fitz.open(input_path)
    fmt = os.path.splitext(output_path)[1].lstrip(".")
    if doc.page_count == 1:
        pix = doc[0].get_pixmap(dpi=150)
        pix.save(output_path)
    else:
        # Multi-page: output is zip of images
        import zipfile
        with zipfile.ZipFile(output_path, 'w') as zf:
            for i, page in enumerate(doc):
                pix = page.get_pixmap(dpi=150)
                img_path = f"/tmp/page_{i+1}.{fmt}"
                pix.save(img_path)
                zf.write(img_path, f"page_{i+1}.{fmt}")
                os.remove(img_path)
    doc.close()
    print("OK")

def engine_fonttools(input_path, output_path):
    from fontTools.ttLib import TTFont
    font = TTFont(input_path)
    font.flavor = None
    font.save(output_path)
    print("OK")

def engine_fiona(input_path, output_path):
    import geopandas as gpd
    out_fmt = os.path.splitext(output_path)[1].lstrip(".")
    fmt_map = {"geojson": "GeoJSON", "gpx": "GPX", "csv": "CSV", "shp": "ESRI Shapefile"}
    driver = fmt_map.get(out_fmt, "GeoJSON")
    gdf = gpd.read_file(input_path)
    if driver == "ESRI Shapefile":
        # SHP needs a directory; output as zip
        import zipfile, tempfile
        tmpdir = tempfile.mkdtemp()
        shp_path = os.path.join(tmpdir, "output.shp")
        gdf.to_file(shp_path, driver=driver)
        with zipfile.ZipFile(output_path, 'w') as zf:
            for f in os.listdir(tmpdir):
                zf.write(os.path.join(tmpdir, f), f)
        import shutil
        shutil.rmtree(tmpdir, ignore_errors=True)
    else:
        gdf.to_file(output_path, driver=driver)
    print("OK")

def engine_paddleocr(input_path, output_path):
    from paddleocr import PaddleOCR
    ocr = PaddleOCR(lang='ch')
    result = ocr.ocr(input_path)
    lines = []
    if result and result[0]:
        for line in result[0]:
            text = line[1][0] if len(line) > 1 else ""
            if text: lines.append(text)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print("OK")

ENGINES = {
    "pillow": engine_pillow,
    "pymupdf": engine_pymupdf,
    "fonttools": engine_fonttools,
    "fiona": engine_fiona,
    "paddleocr": engine_paddleocr,
}

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: engine_worker.py <engine> <input> <output>")
        sys.exit(1)
    engine_name = sys.argv[1]
    input_path = sys.argv[2]
    output_path = sys.argv[3]
    if engine_name not in ENGINES:
        print(f"Unknown engine: {engine_name}")
        sys.exit(1)
    try:
        ENGINES[engine_name](input_path, output_path)
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)
