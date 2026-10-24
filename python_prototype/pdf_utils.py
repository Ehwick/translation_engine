import fitz  # PyMuPDF


def get_page_count(pdf_path: str) -> int:
    with fitz.open(pdf_path) as doc:
        return doc.page_count


def extract_pages_text(pdf_path: str, start_page: int, end_page: int) -> list[tuple[int, str]]:
    """start_page/end_page are 1-indexed and inclusive."""
    results = []
    with fitz.open(pdf_path) as doc:
        for page_index in range(start_page - 1, end_page):
            page = doc[page_index]
            text = page.get_text("text")
            results.append((page_index + 1, text))
    return results
