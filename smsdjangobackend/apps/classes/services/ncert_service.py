import io
import re
import zipfile
from html.parser import HTMLParser
from urllib.parse import urljoin

import requests
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import exceptions

NCERT_TEXTBOOK_URL = "https://ncert.nic.in/textbook.php"
NCERT_CACHE_TIMEOUT = 60 * 60 * 24
NCERT_REQUEST_TIMEOUT = 25

FALLBACK_SUBJECTS = {
    "1": ["English", "Mathematics", "Hindi"],
    "2": ["English", "Mathematics", "Hindi"],
    "3": ["English", "Mathematics", "Hindi", "EVS"],
    "4": ["English", "Mathematics", "Hindi", "EVS"],
    "5": ["English", "Mathematics", "Hindi", "EVS"],
    "6": ["English", "Mathematics", "Science", "Social Science", "Hindi", "Sanskrit"],
    "7": ["English", "Mathematics", "Science", "Social Science", "Hindi", "Sanskrit"],
    "8": ["English", "Mathematics", "Science", "Social Science", "Hindi", "Sanskrit"],
    "9": ["English", "Mathematics", "Science", "Social Science", "Hindi", "Sanskrit"],
    "10": ["English", "Mathematics", "Science", "Social Science", "Hindi", "Sanskrit"],
    "11": ["English", "Mathematics", "Physics", "Chemistry", "Biology", "History", "Political Science", "Economics"],
    "12": ["English", "Mathematics", "Physics", "Chemistry", "Biology", "History", "Political Science", "Economics"],
}


class _NcertTextbookParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.current_select = None
        self.current_option = None
        self.current_anchor = None
        self.select_options = {}
        self.links = []

    def handle_starttag(self, tag, attrs):
        attr_map = dict(attrs)
        if tag == "select":
            self.current_select = (
                attr_map.get("id")
                or attr_map.get("name")
                or attr_map.get("class")
                or "unknown_select"
            )
            self.select_options.setdefault(self.current_select, [])
        elif tag == "option" and self.current_select:
            self.current_option = {
                "value": (attr_map.get("value") or "").strip(),
                "text": "",
            }
        elif tag == "a":
            href = (attr_map.get("href") or "").strip()
            if href:
                self.current_anchor = {"href": href, "text": ""}

    def handle_data(self, data):
        if self.current_option is not None:
            self.current_option["text"] += data
        if self.current_anchor is not None:
            self.current_anchor["text"] += data

    def handle_endtag(self, tag):
        if tag == "option" and self.current_option is not None and self.current_select:
            option = {
                "value": self.current_option["value"],
                "text": self.current_option["text"].strip(),
            }
            if option["value"] or option["text"]:
                self.select_options[self.current_select].append(option)
            self.current_option = None
        elif tag == "select":
            self.current_select = None
        elif tag == "a" and self.current_anchor is not None:
            self.current_anchor["text"] = self.current_anchor["text"].strip()
            self.links.append(self.current_anchor)
            self.current_anchor = None


def _cache_key(prefix, *parts):
    suffix = ":".join(str(part).strip().lower() for part in parts if part not in (None, ""))
    return f"ncert:{prefix}:{suffix}" if suffix else f"ncert:{prefix}"


def _fetch_ncert_page(params=None):
    response = requests.get(
        NCERT_TEXTBOOK_URL,
        params=params or {},
        timeout=NCERT_REQUEST_TIMEOUT,
        headers={"User-Agent": "Mozilla/5.0 StudyPlanner/1.0"},
    )
    response.raise_for_status()
    return response.text


def _parse_html(html):
    parser = _NcertTextbookParser()
    parser.feed(html or "")
    return parser


def _dedupe(items, key_name):
    seen = set()
    ordered = []
    for item in items:
        key = (item.get(key_name) or "").strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        ordered.append(item)
    return ordered


def _extract_class_hierarchy(parser):
    class_options = []
    for select_name, options in parser.select_options.items():
        normalized = select_name.lower()
        if "class" in normalized or "standard" in normalized:
            class_options.extend(options)
    classes = []
    for option in class_options:
        match = re.search(r"(\d{1,2})", option.get("text") or option.get("value") or "")
        if not match:
            continue
        class_num = match.group(1)
        classes.append(
            {
                "class": class_num,
                "subjects": FALLBACK_SUBJECTS.get(class_num, []),
            }
        )
    return _dedupe(classes, "class")


def get_ncert_hierarchy():
    cache_key = _cache_key("hierarchy")
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    hierarchy = []
    try:
        html = _fetch_ncert_page()
        # Extract hierarchy from JS "change()" function blocks
        # Pattern: else if (document.test.tclass.value==(\d+)) followed by options
        class_blocks = re.split(r"else if\s*\(document\.test\.tclass\.value==(\d+)\)", html)
        if len(class_blocks) > 1:
            for i in range(1, len(class_blocks), 2):
                class_num = class_blocks[i]
                block_content = class_blocks[i+1]
                subjects = re.findall(r'document\.test\.tsubject\.options\[\d+\]\.text="([^"]+)"', block_content)
                subjects = [s.strip() for s in subjects if s.strip() and "Select Subject" not in s]
                if subjects:
                    hierarchy.append({"class": class_num, "subjects": subjects})
        
        if not hierarchy:
            parser = _parse_html(html)
            hierarchy = _extract_class_hierarchy(parser)
    except Exception:
        hierarchy = []

    if not hierarchy:
        hierarchy = [
            {"class": class_num, "subjects": subjects}
            for class_num, subjects in sorted(FALLBACK_SUBJECTS.items(), key=lambda item: int(item[0]))
        ]

    cache.set(cache_key, hierarchy, NCERT_CACHE_TIMEOUT)
    return hierarchy


def _normalize_book_code(value):
    # Extracts book code from something like "textbook.php?aemr1=0-9"
    match = re.search(r"\?([a-z0-9]{4,12})(?:=|$)", value or "")
    if match:
        return match.group(1).lower()
    cleaned = re.sub(r"[^A-Za-z0-9]", "", value or "").lower()
    if 4 <= len(cleaned) <= 12:
        return cleaned
    return ""


def get_ncert_books(class_num, subject_name):
    cache_key = _cache_key("books", class_num, subject_name)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    books = []
    try:
        html = _fetch_ncert_page()
        # Find the block for this class and subject in "change1(sind)"
        # Pattern: else if((document.test.tclass.value==1) && (document.test.tsubject.options[sind].text=="English"))
        search_pattern = rf'else if\s*\(\(document\.test\.tclass\.value=={class_num}\)\s*&&\s*\(document\.test\.tsubject\.options\[sind\]\.text=="{subject_name}"\)\)'
        block_match = re.search(search_pattern, html)
        if block_match:
            # Extract content until the next "else if" or end of script
            start_pos = block_match.end()
            end_match = re.search(r"else if", html[start_pos:])
            block_content = html[start_pos:start_pos + end_match.start()] if end_match else html[start_pos:]
            
            # Find books: document.test.tbook.options[1].text="Mridang"; document.test.tbook.options[1].value="textbook.php?aemr1=0-9"
            book_matches = re.finditer(r'document\.test\.tbook\.options\[\d+\]\.text="([^"]+)";\s*document\.test\.tbook\.options\[\d+\]\.value="([^"]+)"', block_content)
            for m in book_matches:
                title = m.group(1).strip()
                value = m.group(2)
                code = _normalize_book_code(value)
                if code and title and "Select Book" not in title:
                    books.append({
                        "title": title,
                        "code": code,
                        "pdf_url": f"https://ncert.nic.in/textbook/pdf/{code}dd.zip",
                        "cover_url": f"https://ncert.nic.in/textbook/pdf/{code}cc.jpg",
                    })
    except Exception:
        pass

    if not books:
        # Fallback to old scraping method if JS parsing fails
        request_variants = [
            {"tclass": class_num, "tsubject": subject_name},
            {"class": class_num, "subject": subject_name},
        ]
        for params in request_variants:
            try:
                parser = _parse_html(_fetch_ncert_page(params=params))
                books.extend(_extract_books_from_options(parser))
                books.extend(_extract_books_from_links(parser, class_num=class_num, subject_name=subject_name))
            except Exception:
                continue

    filtered_books = _dedupe(books, "code")
    cache.set(cache_key, filtered_books, NCERT_CACHE_TIMEOUT)
    return filtered_books


def _pdf_url_candidates(book_code):
    return [
        f"https://ncert.nic.in/textbook/pdf/{book_code}dd.zip",
        f"https://ncert.nic.in/textbook/pdf/{book_code}.pdf",
        f"https://ncert.nic.in/textbook/pdf/{book_code}.zip",
        f"https://ncert.nic.in/textbook/pdf/{book_code}1ps.pdf",
        f"https://ncert.nic.in/textbook/pdf/{book_code}1ps.zip",
    ]


def _extract_pdf_bytes(response_content, source_name):
    if response_content[:4] == b"%PDF":
        return response_content, source_name if source_name.endswith(".pdf") else f"{source_name}.pdf"

    if response_content[:2] == b"PK":
        with zipfile.ZipFile(io.BytesIO(response_content)) as archive:
            for member_name in archive.namelist():
                if member_name.lower().endswith(".pdf"):
                    return archive.read(member_name), member_name.rsplit("/", 1)[-1]
        raise exceptions.ValidationError("NCERT download did not contain a PDF file.")

    raise exceptions.ValidationError("NCERT download was not a valid PDF or ZIP archive.")


def download_ncert_book_as_upload(book_code, book_title="", pdf_url=""):
    code = _normalize_book_code(book_code)
    if not code:
        raise exceptions.ValidationError({"book_code": "Invalid NCERT book code."})

    candidate_urls = [pdf_url] if pdf_url else []
    candidate_urls.extend(_pdf_url_candidates(code))

    last_error = None
    for candidate_url in candidate_urls:
        if not candidate_url:
            continue
        try:
            response = requests.get(
                candidate_url,
                timeout=NCERT_REQUEST_TIMEOUT,
                headers={"User-Agent": "Mozilla/5.0 StudyPlanner/1.0"},
            )
            response.raise_for_status()
            pdf_bytes, filename = _extract_pdf_bytes(response.content, code)
            display_name = filename or f"{code}.pdf"
            return SimpleUploadedFile(
                display_name,
                pdf_bytes,
                content_type="application/pdf",
            )
        except Exception as exc:
            last_error = exc

    if last_error:
        raise exceptions.ValidationError(
            {
                "book_code": "Unable to download the selected NCERT textbook right now. Please try manual upload."
            }
        )
    raise exceptions.ValidationError(
        {"book_code": "Unable to download the selected NCERT textbook right now. Please try manual upload."}
    )
