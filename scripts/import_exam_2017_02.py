#!/usr/bin/env python3

import json
import re
import shutil
from pathlib import Path
from typing import Optional

import fitz


ROOT = Path(__file__).resolve().parents[1]
QUESTION_PDF = ROOT / "Tentor PDF" / "eAT_prov_feb_2017_fragor.pdf"
ANSWER_PDF = ROOT / "Tentor PDF" / "eAT_prov_feb_2017_facit.pdf"
OUTPUT_JSON = ROOT / "data" / "exams" / "2017-02.json"
OUTPUT_IMAGE_DIR = ROOT / "public" / "images" / "exams" / "2017-02"
TMP_IMAGE_DIR = ROOT / "tmp_2017_02" / "import_images"

QUESTION_ID_RE = re.compile(r"([1-4][:.][0-9]+[:.][0-9]+)[:.]?\s")
PAGE_RE = re.compile(r"--- PAGE (\d+) ---\n(.*?)(?=--- PAGE \d+ ---|\Z)", re.S)
POINTS_RE = re.compile(r"\((\d+(?:,\d+)?)p\)")


CASE_SPECS = [
    {
        "id": "1",
        "number": 1,
        "title": "Fall 1 – Allmänmedicin",
        "points": 20,
        "groups": [
            {"page_id": "1-1", "pages": [2], "question_page": 2, "question_images": {"1:1:1": "page2_img1.jpeg"}},
            {"page_id": "1-2", "pages": [3], "question_page": 3},
            {"page_id": "1-3", "pages": [4], "question_page": 4},
            {"page_id": "1-4", "pages": [5], "question_page": 5},
            {"page_id": "1-5", "pages": [6], "question_page": 6, "context_image": "page6_img1.jpeg"},
            {"page_id": "1-6", "pages": [7], "question_page": 7, "context_image": "page7_img1.jpeg"},
        ],
    },
    {
        "id": "2",
        "number": 2,
        "title": "Fall 2 – Internmedicin",
        "points": 20,
        "groups": [
            {"page_id": "2-1", "pages": [8], "question_page": 8},
            {"page_id": "2-2", "pages": [9], "question_page": 9},
            {"page_id": "2-3", "pages": [10], "question_page": 10},
            {
                "page_id": "2-4",
                "pages": [11, 12, 13],
                "question_page": 13,
                "context_image": "page12_img1.jpeg",
                "question_images": {"2:4:1": "page12_img2.jpeg"},
            },
            {"page_id": "2-5", "pages": [14, 15], "question_page": 15},
            {"page_id": "2-6", "pages": [16, 17], "question_page": 17},
            {"page_id": "2-7", "pages": [18], "question_page": 18},
            {"page_id": "2-8", "pages": [19], "question_page": 19},
            {"page_id": "2-9", "pages": [20], "question_page": 20},
        ],
    },
    {
        "id": "3",
        "number": 3,
        "title": "Fall 3 – Psykiatri",
        "points": 20,
        "groups": [
            {"page_id": "3-1", "pages": [22], "question_page": 22},
            {"page_id": "3-2", "pages": [23], "question_page": 23},
            {"page_id": "3-3", "pages": [24], "question_page": 24},
            {"page_id": "3-4", "pages": [25], "question_page": 25},
            {"page_id": "3-5", "pages": [26], "question_page": 26},
            {"page_id": "3-6", "pages": [27], "question_page": 27},
            {"page_id": "3-7", "pages": [28], "question_page": 28},
            {"page_id": "3-8", "pages": [29], "question_page": 29},
            {"page_id": "3-9", "pages": [30], "question_page": 30},
        ],
    },
    {
        "id": "4",
        "number": 4,
        "title": "Fall 4 – Kirurgi",
        "points": 20,
        "groups": [
            {"page_id": "4-1", "pages": [32], "question_page": 32, "context_image": "page32_img1.jpeg"},
            {"page_id": "4-2", "pages": [33], "question_page": 33},
            {"page_id": "4-3", "pages": [34], "question_page": 34},
            {"page_id": "4-4", "pages": [35], "question_page": 35},
            {"page_id": "4-5", "pages": [36], "question_page": 36},
            {"page_id": "4-6", "pages": [37], "question_page": 37},
            {"page_id": "4-7", "pages": [38], "question_page": 38},
            {"page_id": "4-8", "pages": [39], "question_page": 39},
            {"page_id": "4-9", "pages": [40], "question_page": 40},
            {"page_id": "4-10", "pages": [41, 42], "question_page": 42},
            {
                "page_id": "4-11",
                "pages": [43, 44, 45],
                "question_page": 43,
                "context_image": "page44_img1.jpeg",
                "question_images": {"4:11:1": "page45_img1.jpeg"},
            },
            {"page_id": "4-12", "pages": [46], "question_page": 46},
        ],
    },
]


def normalize_question_id(raw: str) -> str:
    return raw.replace(".", ":")


def normalize_paragraphs(text: str) -> Optional[str]:
    lines = [line.strip() for line in text.replace("\xa0", " ").splitlines()]
    paragraphs: list[str] = []
    current: list[str] = []

    for line in lines:
        if re.fullmatch(r"--- PAGE \d+ ---", line):
            continue
        if re.fullmatch(r"Bild [A-Z0-9]+", line):
            continue
        if line == "":
            if current:
                paragraphs.append(" ".join(current))
                current = []
            continue
        current.append(line)

    if current:
        paragraphs.append(" ".join(current))

    normalized = "\n\n".join(paragraphs).strip()
    return normalized or None


def strip_case_heading(text: str, case_number: int) -> str:
    text = text.strip()
    pattern = re.compile(rf"^Fall\s+{case_number}\s*", re.I)
    return pattern.sub("", text, count=1).strip()


def page_text_map(pdf_path: Path) -> dict[int, str]:
    doc = fitz.open(pdf_path)
    try:
        return {page_number: doc[page_number - 1].get_text("text") for page_number in range(1, doc.page_count + 1)}
    finally:
        doc.close()


def extract_questions_by_page(question_pages: dict[int, str]) -> dict[int, list[dict]]:
    result: dict[int, list[dict]] = {}

    for page_number, text in question_pages.items():
        matches = list(QUESTION_ID_RE.finditer(text))
        if not matches:
            continue

        page_questions: list[dict] = []
        for index, match in enumerate(matches):
            qid = normalize_question_id(match.group(1))
            start = match.start()
            end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
            block = text[start:end].strip()
            max_points_match = POINTS_RE.search(block)
            max_points = float(max_points_match.group(1).replace(",", ".")) if max_points_match else None
            cleaned = re.sub(rf"^{re.escape(match.group(1))}[:.]?\s*", "", block)
            cleaned = re.sub(r"\(\d+(?:,\d+)?p\)\s*$", "", cleaned.strip())
            page_questions.append(
                {
                    "id": qid,
                    "text": normalize_paragraphs(cleaned),
                    "maxPoints": max_points,
                }
            )

        result[page_number] = page_questions

    return result


def extract_answers_in_order(answer_pages: dict[int, str]) -> list[str]:
    full_text = "\n".join(f"--- PAGE {page} ---\n{text}" for page, text in answer_pages.items())
    matches = list(QUESTION_ID_RE.finditer(full_text))
    answers: list[str] = []

    for index, match in enumerate(matches):
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(full_text)
        block = full_text[start:end]
        block = re.sub(r"^.*?(Svarsförslag|Svar)\s*[:;]\s*", "", block, count=1, flags=re.S)
        block = re.sub(r"^Svarsförslag\s+[A-Za-zÅÄÖåäö]+\s+\d+\s+poäng\s*", "", block, flags=re.I)
        block = block.replace("Svarsförslag;", "").replace("Svarsförslag:", "").replace("Svar:", "")
        cleaned = normalize_paragraphs(block)
        if cleaned:
            cleaned = re.sub(r"\n\nSvarsförslag\s+[A-Za-zÅÄÖåäö]+\s+\d+\s+poäng$", "", cleaned, flags=re.I)
        if cleaned and cleaned.startswith(";"):
            cleaned = cleaned[1:].strip()
        answers.append(cleaned or "")

    return answers


def extract_image(image_dir: Path, pdf_path: Path, page_number: int, image_index: int) -> str:
    doc = fitz.open(pdf_path)
    try:
        page = doc[page_number - 1]
        image_info = page.get_images(full=True)[image_index - 1]
        base_image = doc.extract_image(image_info[0])
        extension = base_image["ext"]
        file_name = f"page{page_number}_img{image_index}.{extension}"
        (image_dir / file_name).write_bytes(base_image["image"])
        return file_name
    finally:
        doc.close()


def copy_selected_images() -> None:
    TMP_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_IMAGE_DIR.mkdir(parents=True, exist_ok=True)

    selected = [(2, 1), (6, 1), (7, 1), (12, 1), (12, 2), (32, 1), (44, 1), (45, 1)]
    for page_number, image_index in selected:
        file_name = extract_image(TMP_IMAGE_DIR, QUESTION_PDF, page_number, image_index)
        shutil.copy2(TMP_IMAGE_DIR / file_name, OUTPUT_IMAGE_DIR / file_name)


def full_page_context(question_pages: dict[int, str], page_number: int) -> Optional[str]:
    return normalize_paragraphs(question_pages[page_number])


def pre_question_context(question_pages: dict[int, str], page_number: int) -> Optional[str]:
    text = question_pages[page_number]
    match = QUESTION_ID_RE.search(text)
    if not match:
        return normalize_paragraphs(text)
    return normalize_paragraphs(text[: match.start()])


def build_exam() -> dict:
    question_pages = page_text_map(QUESTION_PDF)
    answer_pages = page_text_map(ANSWER_PDF)
    questions_by_page = extract_questions_by_page(question_pages)

    ordered_questions = [question for page in sorted(questions_by_page) for question in questions_by_page[page]]
    ordered_answers = extract_answers_in_order(answer_pages)
    if len(ordered_questions) != len(ordered_answers):
        raise ValueError(f"Question/answer count mismatch: {len(ordered_questions)} vs {len(ordered_answers)}")

    answers_by_id = {question["id"]: answer for question, answer in zip(ordered_questions, ordered_answers)}

    cases = []
    for case_spec in CASE_SPECS:
        groups = case_spec["groups"]
        first_group = groups[0]
        intro = strip_case_heading(pre_question_context(question_pages, first_group["question_page"]) or "", case_spec["number"])
        pages = []

        for group_index, group in enumerate(groups):
            page_questions = questions_by_page[group["question_page"]]
            context_parts: list[str] = []

            for page_number in group["pages"]:
                if page_number == group["question_page"]:
                    if group_index == 0:
                        continue
                    text = pre_question_context(question_pages, page_number)
                else:
                    text = full_page_context(question_pages, page_number)
                if text:
                    context_parts.append(text)

            page_questions_payload = []
            for question in page_questions:
                image_name = group.get("question_images", {}).get(question["id"])
                answer_text = answers_by_id.get(question["id"], "").strip()
                page_questions_payload.append(
                    {
                        "id": question["id"].replace(":", "-"),
                        "text": question["text"],
                        "maxPoints": question["maxPoints"],
                        "hint": None,
                        "imageUrl": f"/images/exams/2017-02/{image_name}" if image_name else None,
                        "facit": [answer_text] if answer_text else [""],
                        "facitExplanation": None,
                        "tags": [],
                    }
                )

            pages.append(
                {
                    "id": group["page_id"],
                    "context": normalize_paragraphs("\n\n".join(context_parts)) if context_parts else None,
                    "contextImageUrl": (
                        f"/images/exams/2017-02/{group['context_image']}" if group.get("context_image") else None
                    ),
                    "questions": page_questions_payload,
                }
            )

        cases.append(
            {
                "id": case_spec["id"],
                "number": case_spec["number"],
                "title": case_spec["title"],
                "points": case_spec["points"],
                "intro": intro,
                "pages": pages,
            }
        )

    return {
        "id": "2017-02",
        "title": "AT-prov februari 2017",
        "date": "2017-02-24",
        "totalPoints": 80,
        "cases": cases,
    }


def main() -> None:
    copy_selected_images()
    exam = build_exam()
    OUTPUT_JSON.write_text(json.dumps(exam, ensure_ascii=False, indent=2) + "\n")
    print(f"Wrote {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
