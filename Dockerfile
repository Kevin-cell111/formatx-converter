FROM python:3.13-slim-bookworm

# Install system dependencies for all engines
RUN apt-get update && apt-get install -y --no-install-recommends \
    # LibreOffice (Office->PDF)
    libreoffice-writer libreoffice-calc libreoffice-impress \
    # FFmpeg (audio/video/subtitles)
    ffmpeg \
    # Calibre (ebooks)
    calibre \
    # Inkscape (vector graphics)
    inkscape \
    # GDAL (geospatial - ogr2ogr)
    gdal-bin \
    # Font tools
    fontconfig \
    # Cleanup
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
RUN pip install --no-cache-dir \
    Pillow \
    PyMuPDF \
    fonttools \
    fiona \
    geopandas

WORKDIR /app
COPY . .

# Make backend work on Linux (override Windows paths)
ENV PORT=10000

EXPOSE 10000
CMD ["python3", "backend.py"]
