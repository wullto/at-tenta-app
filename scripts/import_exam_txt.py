#!/usr/bin/env python3

import argparse
import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple


ROOT = Path(__file__).resolve().parents[1]

BLOCK_RE = re.compile(
    r"(^|\f|\n)\s*Fall\s+([1-4])\s*,?\s*Fråga\s+([1-4])\.(\d+)(?:\.(\d+))?\.?\s*",
    re.MULTILINE,
)
CASE_TITLE_RE = re.compile(r"Fall\s+([1-4])(?:\s*[–-])?\s+([A-Za-zÅÄÖåäö]+)", re.MULTILINE)
REPEATED_QUESTION_RE = re.compile(r"Fråga\s+([1-4])\.(\d+)(?:\.(\d+))?\.?\s*", re.MULTILINE)
PLAIN_BLOCK_RE = re.compile(r"(^|\f|\n)\s*Fråga\s+([1-4])\.(\d+)(?:\.(\d+))?\.?\s*", re.MULTILINE)
POINTS_RE = re.compile(r"Max poäng:\s*([0-9]+(?:[.,][0-9]+)?)", re.I)


def normalize_qid(case_number: str, middle: str, final: Optional[str]) -> str:
    if final is None:
        return f"{case_number}.1.{middle}"
    return f"{case_number}.{middle}.{final}"


def normalize_text(text: str) -> Optional[str]:
    text = text.replace("\xa0", " ").replace("\u200b", "")
    lines = [line.strip() for line in text.splitlines()]

    paragraphs: List[str] = []
    current: List[str] = []
    for line in lines:
        if not line or line == "":
            if current:
                paragraphs.append(" ".join(current))
                current = []
            continue
        current.append(re.sub(r"\s+", " ", line))

    if current:
        paragraphs.append(" ".join(current))

    normalized = "\n\n".join(paragraphs).strip()
    return normalized or None


def read_blocks(text: str, allow_plain: bool = False) -> Dict[str, str]:
    matches = list(BLOCK_RE.finditer(text))
    use_plain = allow_plain and len(matches) < 4
    if use_plain:
        matches = list(PLAIN_BLOCK_RE.finditer(text))

    blocks: Dict[str, str] = {}

    for index, match in enumerate(matches):
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        block = text[start:end].strip()
        if use_plain:
            qid = normalize_qid(match.group(2), match.group(3), match.group(4))
        else:
            qid = normalize_qid(match.group(3), match.group(4), match.group(5))
        blocks[qid] = block

    return blocks


def parse_question_block(qid: str, block: str) -> Dict:
    points_match = POINTS_RE.search(block)
    if not points_match:
        raise ValueError(f"Missing max points for {qid}")

    max_points = float(points_match.group(1).replace(",", "."))
    after_points = block[points_match.end() :].strip()

    repeated_matches = list(REPEATED_QUESTION_RE.finditer(after_points))
    if repeated_matches:
        repeated = repeated_matches[-1]
        context = normalize_text(after_points[: repeated.start()])
        question_text = normalize_text(after_points[repeated.end() :])
    else:
        context = None
        question_text = normalize_text(after_points)

    if not question_text:
        raise ValueError(f"Missing question text for {qid}")

    return {
        "question": question_text,
        "max_points": max_points,
        "context": context,
    }


def parse_answer_block(qid: str, block: str) -> Dict:
    points_match = POINTS_RE.search(block)
    after_points = block[points_match.end() :].strip() if points_match else block
    answer_split = re.split(r"Svarsförslag\s*:?", after_points, maxsplit=1, flags=re.I)

    if len(answer_split) == 2:
        before_answer = answer_split[0].strip()
        answer_text = answer_split[1].strip()
    else:
        before_answer = after_points
        answer_text = ""

    repeated_matches = list(REPEATED_QUESTION_RE.finditer(before_answer))
    if repeated_matches:
        repeated = repeated_matches[-1]
        context = normalize_text(before_answer[: repeated.start()])
        question_text = normalize_text(before_answer[repeated.end() :])
    else:
        context = None
        question_text = normalize_text(before_answer)

    answer_text = normalize_text(answer_text) or ""
    return {
        "question": question_text,
        "context": context,
        "answer": answer_text,
    }


def parse_case_titles(text: str) -> Dict[int, str]:
    titles: Dict[int, str] = {}
    for case_no, title in CASE_TITLE_RE.findall(text[:2000]):
        titles[int(case_no)] = title.strip().capitalize()
    return titles


def trim_repeated_context(previous: Optional[str], current: Optional[str]) -> Optional[str]:
    if not current:
        return None
    if not previous:
        return current

    prev = previous.strip()
    curr = current.strip()
    if curr.startswith(prev):
        remainder = curr[len(prev) :].strip(" \n:-")
        return remainder or None
    return curr


def build_exam(exam_id: str, title: str, date: str, questions_text: str, answers_text: str) -> Dict:
    question_blocks = read_blocks(questions_text)
    answer_blocks = read_blocks(answers_text, allow_plain=True)

    all_ids = sorted(set(question_blocks) | set(answer_blocks), key=lambda x: tuple(int(p) for p in x.split(".")))
    titles = parse_case_titles(answers_text) or parse_case_titles(questions_text)

    grouped: Dict[Tuple[int, int], List[Dict]] = {}
    page_contexts: Dict[Tuple[int, int], Optional[str]] = {}
    intro_by_case: Dict[int, Optional[str]] = {}

    for qid in all_ids:
        q_case, q_page, q_num = (int(part) for part in qid.split("."))
        q_block = question_blocks.get(qid)
        a_block = answer_blocks.get(qid)

        q_data = parse_question_block(qid, q_block) if q_block else None
        a_data = parse_answer_block(qid, a_block) if a_block else None

        question_text = (q_data or {}).get("question") or (a_data or {}).get("question")
        answer_text = (a_data or {}).get("answer") or ""
        context_text = (q_data or {}).get("context")
        if context_text is None:
            context_text = (a_data or {}).get("context")
        max_points = (q_data or {}).get("max_points")
        if max_points is None:
            points_match = POINTS_RE.search(a_block or "")
            max_points = float(points_match.group(1).replace(",", ".")) if points_match else None

        if question_text is None or max_points is None:
            raise ValueError(f"Incomplete data for {qid}")

        grouped.setdefault((q_case, q_page), []).append(
            {
                "id": f"{q_case}-{q_page}-{q_num}",
                "text": question_text,
                "maxPoints": max_points,
                "hint": None,
                "imageUrl": None,
                "facit": [answer_text] if answer_text else [""],
                "facitExplanation": None,
                "tags": [],
            }
        )

        page_contexts.setdefault((q_case, q_page), context_text)
        if q_page == 1 and q_case not in intro_by_case:
            intro_by_case[q_case] = context_text

    cases = []
    for case_number in range(1, 5):
        page_numbers = sorted(page for c, page in grouped if c == case_number)
        previous_full_context = intro_by_case.get(case_number)
        pages = []

        for page_number in page_numbers:
            full_context = page_contexts.get((case_number, page_number))
            if page_number == 1:
                page_context = None
            else:
                page_context = trim_repeated_context(previous_full_context, full_context)
            previous_full_context = full_context or previous_full_context

            pages.append(
                {
                    "id": f"{case_number}-{page_number}",
                    "context": page_context,
                    "contextImageUrl": None,
                    "questions": grouped[(case_number, page_number)],
                }
            )

        cases.append(
            {
                "id": str(case_number),
                "number": case_number,
                "title": f"Fall {case_number} – {titles.get(case_number, f'Fall {case_number}')}",
                "points": 20,
                "intro": intro_by_case.get(case_number) or "",
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
    parser.add_argument("--questions-txt", required=True)
    parser.add_argument("--answers-txt", required=True)
    args = parser.parse_args()

    questions_text = (ROOT / args.questions_txt).read_text(encoding="utf-8")
    answers_text = (ROOT / args.answers_txt).read_text(encoding="utf-8")
    output_json = ROOT / "data" / "exams" / f"{args.exam_id}.json"

    exam = build_exam(args.exam_id, args.title, args.date, questions_text, answers_text)
    output_json.write_text(json.dumps(exam, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {output_json}")


if __name__ == "__main__":
    main()
