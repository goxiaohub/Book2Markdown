# Book2Markdown

Book2Markdown converts EPUB and PDF ebooks into clean Markdown files.

## Features

- Upload `.epub` and `.pdf` files
- Detect file format automatically
- Export extracted images into `output/images/`
- Generate UTF-8 Markdown as `book.md`
- Provide a Gradio web UI for preview and download
- Optional MinerU provider path for scanned PDFs and images

## Installation

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Usage

```bash
python app.py
```

Then open the local Gradio URL shown in the terminal.

## REST API

Run the API server:

```bash
uvicorn api:api_app --host 0.0.0.0 --port 8000
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

Convert an ebook:

```bash
curl -X POST http://127.0.0.1:8000/convert ^
  -F "file=@sample.pdf" ^
  -o book.md
```

Use the optional MinerU provider:

```bash
curl -X POST "http://127.0.0.1:8000/convert?use_mineru=true" ^
  -F "file=@sample.pdf" ^
  -o book.md
```

## MinerU Provider

MinerU support is optional. The default EPUB/PDF converters do not require it.

Install and configure MinerU separately, then enable it in the UI with
`Use MinerU for PDFs/images` or in the API with `use_mineru=true`.

Environment variables:

- `BOOK2MARKDOWN_MINERU_COMMAND`: MinerU CLI command. Default: `mineru`
- `BOOK2MARKDOWN_MINERU_METHOD`: MinerU parse method. Default: `auto`
- `BOOK2MARKDOWN_MINERU_BACKEND`: optional MinerU backend
- `BOOK2MARKDOWN_MINERU_API_URL`: optional MinerU API URL
- `BOOK2MARKDOWN_MINERU_TIMEOUT`: timeout in seconds. Default: `1800`

The provider calls:

```bash
mineru -p input.pdf -o output/mineru -m auto
```

## Testing

```bash
python -m pytest -q
```

The tests generate temporary `sample.epub` and `sample.pdf` files during the
test run, so no manual fixture files are required.

## Output

Each conversion creates:

- `output/book.md`
- `output/images/`

The output directory is prepared before each conversion so old images do not
mix with the latest Markdown file.

## Docker Deployment

The Docker image starts the Gradio UI by default:

```bash
docker build -t book2markdown .
docker run --rm -p 7860:7860 book2markdown
```

To run the API in Docker:

```bash
docker run --rm -p 8000:8000 book2markdown uvicorn api:api_app --host 0.0.0.0 --port 8000
```

## Screenshots

Screenshots will be added after the first UI version is complete.

## Roadmap

Planned future architecture support:

- MOBI
- AZW3
- LLM cleanup
- Obsidian export
- Batch processing

## Current Limitations

- PDF conversion works best with text-based PDFs.
- Scanned PDFs and images require optional MinerU setup.
- LLM cleanup is intentionally not implemented in V1.
