#!/usr/bin/env python3

import argparse
import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import fitz


ROOT = Path(__file__).resolve().parents[1]
QUESTION_ID_RE = re.compile(r"([1-4][:.][0-9]+[:.][0-9]+)[:.]?\s*")
POINTS_RE = re.compile(r"\((\d+(?:[.,]\d+)?)\s*p\)?\.?", re.I)
CASE_TITLE_RE = re.compile(r"Svarsförslag\s+(.+?)\s+20\s+poäng", re.I)
IMAGE_HINT_RE = re.compile(r"\b(bild|figur|röntgenbilder|ekg|se bifogade|vad visar)\b", re.I)


def normalize_paragraphs(text: str) -> Optional[str]:
    lines = [line.strip() for line in text.replace("\xa0", " ").splitlines()]
    paragraphs: List[str] = []
    current: List[str] = []

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


def pdf_page_texts(pdf_path: Path) -> Dict[int, str]:
    doc = fitz.open(pdf_path)
    try:
        return {page_number: doc[page_number - 1].get_text("text") for page_number in range(1, doc.page_count + 1)}
    finally:
        doc.close()


def extract_case_titles(answer_pdf: Path) -> List[str]:
    doc = fitz.open(answer_pdf)
    try:
        text = "\n".join(doc[i].get_text("text") for i in range(doc.page_count))
    finally:
        doc.close()

    titles = [match.group(1).strip() for match in CASE_TITLE_RE.finditer(text)]
    return titles[:4]


def extract_questions_by_page(question_pages: Dict[int, str]) -> Dict[int, List[Dict]]:
    result: Dict[int, List[Dict]] = {}

    for page_number, text in question_pages.items():
        matches = list(QUESTION_ID_RE.finditer(text))
        if not matches:
            continue

        page_questions: List[Dict] = []
        for index, match in enumerate(matches):
            qid = match.group(1).replace(".", ":")
            start = match.start()
            end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
            block = text[start:end].strip()
            max_points_match = POINTS_RE.search(block)
            max_points = float(max_points_match.group(1).replace(",", ".")) if max_points_match else None
            cleaned = re.sub(rf"^{re.escape(match.group(1))}[:.]?\s*", "", block)
            cleaned = re.sub(r"\(\d+(?:[.,]\d+)?\s*p\)?\.?\s*$", "", cleaned.strip(), flags=re.I)
            page_questions.append(
                {
                    "id": qid,
                    "text": normalize_paragraphs(cleaned) or "",
                    "maxPoints": max_points,
                }
            )

        result[page_number] = page_questions

    return result


def extract_answers_in_order(answer_pages: Dict[int, str]) -> List[Tuple[str, str]]:
    full_text = "\n".join(f"--- PAGE {page} ---\n{text}" for page, text in answer_pages.items())
    matches = list(QUESTION_ID_RE.finditer(full_text))
    result: List[Tuple[str, str]] = []

    for index, match in enumerate(matches):
        qid = match.group(1).replace(".", ":")
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(full_text)
        block = full_text[start:end]
        block = re.sub(r"^.*?(Svarsförslag|Svar)\s*[:;]\s*", "", block, count=1, flags=re.S)
        block = re.sub(r"^Svarsförslag\s+.+?\s+20\s+poäng\s*", "", block, flags=re.I)
        cleaned = normalize_paragraphs(block) or ""
        cleaned = re.sub(r"\n\nSvarsförslag\s+.+?\s+20\s+poäng$", "", cleaned, flags=re.I)
        if cleaned.startswith(";"):
            cleaned = cleaned[1:].strip()
        result.append((qid, cleaned.strip()))

    return result


def strip_question_prefix(answer: str, question_text: str) -> str:
    normalized_answer = " ".join(answer.split())
    normalized_question = " ".join(question_text.split())

    if normalized_answer.startswith(normalized_question):
        answer = answer[len(question_text) :].lstrip()
        answer = re.sub(r"^\(?\d+(?:[.,]\d+)?\s*p\)?\.?\s*", "", answer, flags=re.I)
        answer = re.sub(r"^(Svarsförslag|Svar)\s*[:;]\s*", "", answer, flags=re.I)

    return answer.strip()


def extract_images(question_pdf: Path, output_dir: Path) -> Dict[int, List[str]]:
    output_dir.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(question_pdf)
    page_images: Dict[int, List[str]] = {}

    try:
        for page_number in range(1, doc.page_count + 1):
            page = doc[page_number - 1]
            names: List[str] = []
            for image_index, image_info in enumerate(page.get_images(full=True), start=1):
                base_image = doc.extract_image(image_info[0])
                extension = base_image["ext"]
                file_name = f"page{page_number}_img{image_index}.{extension}"
                (output_dir / file_name).write_bytes(base_image["image"])
                names.append(file_name)
            if names:
                page_images[page_number] = names
    finally:
        doc.close()

    return page_images


def page_case_map(questions_by_page: Dict[int, List[Dict]]) -> Dict[int, int]:
    mapping: Dict[int, int] = {}
    for page_number, questions in questions_by_page.items():
        case_number = int(questions[0]["id"].split(":")[0])
        mapping[page_number] = case_number
    return mapping


def strip_case_heading(text: Optional[str], case_number: int) -> str:
    if not text:
        return ""
    return re.sub(rf"^Fall\s+{case_number}\s*", "", text.strip(), count=1, flags=re.I).strip()


def choose_images(
    group_pages: List[int],
    question_page: int,
    page_images: Dict[int, List[str]],
    questions: List[Dict],
) -> Tuple[Optional[str], Dict[str, str]]:
    non_question_images: List[str] = []
    question_page_images = page_images.get(question_page, [])

    for page_number in group_pages:
        if page_number == question_page:
            continue
        non_question_images.extend(page_images.get(page_number, []))

    all_images = non_question_images + question_page_images
    if not all_images:
        return None, {}

    question_map: Dict[str, str] = {}
    context_image: Optional[str] = None
    image_questions = [question for question in questions if IMAGE_HINT_RE.search(question["text"])]

    if len(questions) == 1:
        question_id = questions[0]["id"]
        if len(all_images) >= 2:
            context_image = all_images[0]
            question_map[question_id] = all_images[1]
        elif IMAGE_HINT_RE.search(questions[0]["text"]):
            question_map[question_id] = all_images[0]
        else:
            context_image = all_images[0]
        return context_image, question_map

    remaining = list(all_images)
    if non_question_images:
        context_image = remaining.pop(0)

    targets = image_questions if image_questions else questions
    for question in targets:
        if not remaining:
            break
        question_map[question["id"]] = remaining.pop(0)

    return context_image, question_map


def build_exam(
    exam_id: str,
    title: str,
    date: str,
    question_pdf: Path,
    answer_pdf: Path,
    output_image_dir: Path,
) -> Dict:
    question_pages = pdf_page_texts(question_pdf)
    answer_pages = pdf_page_texts(answer_pdf)
    questions_by_page = extract_questions_by_page(question_pages)
    ordered_questions = [question for page in sorted(questions_by_page) for question in questions_by_page[page]]
    ordered_answers = extract_answers_in_order(answer_pages)

    if len(ordered_questions) != len(ordered_answers):
        raise ValueError(
            f"Question/answer count mismatch for {exam_id}: {len(ordered_questions)} questions vs {len(ordered_answers)} answers"
        )

    answers_by_id = {}
    for question, (_, answer) in zip(ordered_questions, ordered_answers):
        cleaned_answer = strip_question_prefix(answer, question["text"])
        answers_by_id[question["id"]] = cleaned_answer
    page_images = extract_images(question_pdf, output_image_dir)
    case_titles = extract_case_titles(answer_pdf)

    questions_per_case: Dict[int, List[int]] = {case_number: [] for case_number in range(1, 5)}
    for page_number, questions in sorted(questions_by_page.items()):
        case_number = int(questions[0]["id"].split(":")[0])
        questions_per_case[case_number].append(page_number)

    cases = []
    for case_number in range(1, 5):
        question_pages_for_case = questions_per_case[case_number]
        page_counter = 1
        first_question_page = question_pages_for_case[0]
        previous_question_page = first_question_page - 1
        intro = strip_case_heading(
            normalize_paragraphs(question_pages[first_question_page][: QUESTION_ID_RE.search(question_pages[first_question_page]).start()]),
            case_number,
        )

        pages = []
        for index, question_page in enumerate(question_pages_for_case):
            start_page = first_question_page if index == 0 else previous_question_page + 1
            group_pages = list(range(start_page, question_page + 1))
            current_questions = questions_by_page[question_page]
            pre_question = normalize_paragraphs(question_pages[question_page][: QUESTION_ID_RE.search(question_pages[question_page]).start()])

            context_parts: List[str] = []
            if index > 0 and pre_question:
                context_parts.append(pre_question)
            for page_number in group_pages:
                if page_number == question_page:
                    continue
                page_text = normalize_paragraphs(question_pages[page_number])
                if page_text:
                    context_parts.insert(0, page_text)

            context_image, question_images = choose_images(group_pages, question_page, page_images, current_questions)

            pages.append(
                {
                    "id": f"{case_number}-{page_counter}",
                    "context": normalize_paragraphs("\n\n".join(context_parts)) if context_parts else None,
                    "contextImageUrl": f"/images/exams/{exam_id}/{context_image}" if context_image else None,
                    "questions": [
                        {
                            "id": question["id"].replace(":", "-"),
                            "text": question["text"],
                            "maxPoints": question["maxPoints"],
                            "hint": None,
                            "imageUrl": (
                                f"/images/exams/{exam_id}/{question_images[question['id']]}"
                                if question["id"] in question_images
                                else None
                            ),
                            "facit": [answers_by_id.get(question["id"], "")],
                            "facitExplanation": None,
                            "tags": [],
                        }
                        for question in current_questions
                    ],
                }
            )

            page_counter += 1
            previous_question_page = question_page

        case_title = case_titles[case_number - 1] if len(case_titles) >= case_number else f"Fall {case_number}"
        cases.append(
            {
                "id": str(case_number),
                "number": case_number,
                "title": f"Fall {case_number} – {case_title}",
                "points": 20,
                "intro": intro,
                "pages": pages,
            }
        )

    return {
        "id": exam_id,
        "title": title,
        "date": date,
        "totalPoints": 80,
        "cases": cases,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--exam-id", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--date", required=True)
    parser.add_argument("--questions-pdf", required=True)
    parser.add_argument("--answers-pdf", required=True)
    args = parser.parse_args()

    question_pdf = ROOT / args.questions_pdf
    answer_pdf = ROOT / args.answers_pdf
    output_json = ROOT / "data" / "exams" / f"{args.exam_id}.json"
    output_image_dir = ROOT / "public" / "images" / "exams" / args.exam_id

    exam = build_exam(args.exam_id, args.title, args.date, question_pdf, answer_pdf, output_image_dir)
    output_json.write_text(json.dumps(exam, ensure_ascii=False, indent=2) + "\n")
    print(f"Wrote {output_json}")


if __name__ == "__main__":
    main()
