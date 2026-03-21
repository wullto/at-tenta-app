import { cache } from "react"
import { promises as fs } from "fs"
import path from "path"
import { Exam, Case, Page, Question } from "@/types/exam"

const EXAMS_DIR = path.join(process.cwd(), "data", "exams")
const PUBLIC_DIR = path.join(process.cwd(), "public")

type RawQuestion = {
  id?: unknown
  text?: unknown
  maxPoints?: unknown
  hint?: unknown
  facit?: unknown
  facitExplanation?: unknown
  imageUrl?: unknown
  tags?: unknown
}

type RawPage = {
  id?: unknown
  context?: unknown
  contextImageUrl?: unknown
  questions?: unknown
}

type RawCase = {
  id?: unknown
  number?: unknown
  title?: unknown
  points?: unknown
  intro?: unknown
  pages?: unknown
}

type RawExam = {
  id?: unknown
  title?: unknown
  date?: unknown
  totalPoints?: unknown
  cases?: unknown
}

function assertString(value: unknown, field: string, fileName: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${fileName}: "${field}" must be a non-empty string`)
  }
  return value
}

function assertNumber(value: unknown, field: string, fileName: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${fileName}: "${field}" must be a number`)
  }
  return value
}

function toOptionalString(value: unknown, field: string, fileName: string): string | undefined {
  if (value === null || value === undefined || value === "") return undefined
  if (typeof value !== "string") {
    throw new Error(`${fileName}: "${field}" must be a string, null, or undefined`)
  }
  return value
}

function toStringArray(value: unknown, field: string, fileName: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${fileName}: "${field}" must be an array`)
  }

  return value.map((entry, index) => {
    if (typeof entry !== "string" || entry.trim() === "") {
      throw new Error(`${fileName}: "${field}[${index}]" must be a non-empty string`)
    }
    return entry
  })
}

async function assertPublicAssetExists(assetPath: string, fileName: string) {
  if (!assetPath.startsWith("/")) {
    throw new Error(`${fileName}: image path "${assetPath}" must start with "/"`)
  }

  const diskPath = path.join(PUBLIC_DIR, assetPath.slice(1))
  try {
    await fs.access(diskPath)
  } catch {
    throw new Error(`${fileName}: image "${assetPath}" does not exist in public/`)
  }
}

async function normalizeQuestion(raw: RawQuestion, fileName: string, pathLabel: string): Promise<Question> {
  const imageUrl = toOptionalString(raw.imageUrl, `${pathLabel}.imageUrl`, fileName)
  if (imageUrl) {
    await assertPublicAssetExists(imageUrl, fileName)
  }

  return {
    id: assertString(raw.id, `${pathLabel}.id`, fileName),
    text: assertString(raw.text, `${pathLabel}.text`, fileName),
    maxPoints: assertNumber(raw.maxPoints, `${pathLabel}.maxPoints`, fileName),
    hint: toOptionalString(raw.hint, `${pathLabel}.hint`, fileName),
    facit: toStringArray(raw.facit, `${pathLabel}.facit`, fileName),
    facitExplanation: toOptionalString(raw.facitExplanation, `${pathLabel}.facitExplanation`, fileName),
    imageUrl,
    tags: raw.tags === undefined || raw.tags === null ? undefined : toStringArray(raw.tags, `${pathLabel}.tags`, fileName),
  }
}

async function normalizePage(raw: RawPage, fileName: string, pathLabel: string): Promise<Page> {
  const contextImageUrl = toOptionalString(raw.contextImageUrl, `${pathLabel}.contextImageUrl`, fileName)
  if (contextImageUrl) {
    await assertPublicAssetExists(contextImageUrl, fileName)
  }

  if (!Array.isArray(raw.questions)) {
    throw new Error(`${fileName}: "${pathLabel}.questions" must be an array`)
  }

  return {
    id: assertString(raw.id, `${pathLabel}.id`, fileName),
    context: toOptionalString(raw.context, `${pathLabel}.context`, fileName),
    contextImageUrl,
    questions: await Promise.all(
      raw.questions.map((question, index) =>
        normalizeQuestion(question as RawQuestion, fileName, `${pathLabel}.questions[${index}]`)
      )
    ),
  }
}

async function normalizeCase(raw: RawCase, fileName: string, pathLabel: string): Promise<Case> {
  if (!Array.isArray(raw.pages)) {
    throw new Error(`${fileName}: "${pathLabel}.pages" must be an array`)
  }

  return {
    id: assertString(raw.id, `${pathLabel}.id`, fileName),
    number: assertNumber(raw.number, `${pathLabel}.number`, fileName),
    title: assertString(raw.title, `${pathLabel}.title`, fileName),
    points: assertNumber(raw.points, `${pathLabel}.points`, fileName),
    intro: assertString(raw.intro, `${pathLabel}.intro`, fileName),
    pages: await Promise.all(
      raw.pages.map((page, index) => normalizePage(page as RawPage, fileName, `${pathLabel}.pages[${index}]`))
    ),
  }
}

async function loadExamFile(fileName: string): Promise<Exam> {
  const filePath = path.join(EXAMS_DIR, fileName)
  const rawText = await fs.readFile(filePath, "utf8")
  const rawExam = JSON.parse(rawText) as RawExam

  if (!Array.isArray(rawExam.cases)) {
    throw new Error(`${fileName}: "cases" must be an array`)
  }

  return {
    id: assertString(rawExam.id, "id", fileName),
    title: assertString(rawExam.title, "title", fileName),
    date: assertString(rawExam.date, "date", fileName),
    totalPoints: assertNumber(rawExam.totalPoints, "totalPoints", fileName),
    cases: await Promise.all(
      rawExam.cases.map((examCase, index) => normalizeCase(examCase as RawCase, fileName, `cases[${index}]`))
    ),
  }
}

const loadAllExamsCached = cache(async (): Promise<Exam[]> => {
  const entries = await fs.readdir(EXAMS_DIR)
  const examFiles = entries.filter((entry) => entry.endsWith(".json")).sort()
  const exams = await Promise.all(examFiles.map(loadExamFile))
  return exams.sort((a, b) => a.date.localeCompare(b.date))
})

export async function getAllExams(): Promise<Exam[]> {
  return loadAllExamsCached()
}

export async function getExamById(examId: string): Promise<Exam | undefined> {
  const exams = await loadAllExamsCached()
  return exams.find((exam) => exam.id === examId)
}

export async function getExamIds(): Promise<string[]> {
  const exams = await loadAllExamsCached()
  return exams.map((exam) => exam.id)
}
