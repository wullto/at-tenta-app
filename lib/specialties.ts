const SPECIALTY_THEMES: Record<string, SpecialtyTheme> = {
  internmedicin: {
    badge: "border border-emerald-200 bg-[linear-gradient(135deg,rgba(236,253,245,0.96),rgba(209,250,229,0.82))] text-emerald-800",
    badgeStrong: "border border-emerald-300 bg-[linear-gradient(135deg,rgba(209,250,229,0.95),rgba(167,243,208,0.88))] text-emerald-900 shadow-sm",
    card: "border-emerald-200 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(236,253,245,0.92)_58%,rgba(209,250,229,0.88))]",
    cardSoft: "border-emerald-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(236,253,245,0.9))]",
    panel: "border-emerald-200 bg-[linear-gradient(140deg,rgba(255,255,255,0.98),rgba(236,253,245,0.93)_52%,rgba(167,243,208,0.35)_100%)] text-emerald-950 shadow-sm",
    panelMuted: "bg-emerald-100/70 border-emerald-200",
    accentText: "text-emerald-800",
    accentTextStrong: "text-emerald-900",
    accentTextHover: "hover:text-emerald-900",
    accentBorder: "border-emerald-300",
    accentBorderHover: "hover:border-emerald-400",
    accentRing: "ring-emerald-300",
    accentBg: "bg-emerald-600",
    accentBgHover: "hover:bg-emerald-700",
    accentBgSoft: "bg-emerald-500/15",
    accentFill: "bg-emerald-500",
    accentFillSoft: "bg-emerald-100",
    accentDot: "bg-emerald-600",
  },
  kirurgi: {
    badge: "border border-rose-200 bg-[linear-gradient(135deg,rgba(255,241,242,0.96),rgba(255,228,230,0.82))] text-rose-800",
    badgeStrong: "border border-rose-300 bg-[linear-gradient(135deg,rgba(255,228,230,0.95),rgba(254,205,211,0.88))] text-rose-900 shadow-sm",
    card: "border-rose-200 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(255,241,242,0.92)_58%,rgba(255,228,230,0.88))]",
    cardSoft: "border-rose-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(255,241,242,0.9))]",
    panel: "border-rose-200 bg-[linear-gradient(140deg,rgba(255,255,255,0.98),rgba(255,241,242,0.93)_52%,rgba(254,205,211,0.38)_100%)] text-rose-950 shadow-sm",
    panelMuted: "bg-rose-100/70 border-rose-200",
    accentText: "text-rose-800",
    accentTextStrong: "text-rose-900",
    accentTextHover: "hover:text-rose-900",
    accentBorder: "border-rose-300",
    accentBorderHover: "hover:border-rose-400",
    accentRing: "ring-rose-300",
    accentBg: "bg-rose-600",
    accentBgHover: "hover:bg-rose-700",
    accentBgSoft: "bg-rose-500/15",
    accentFill: "bg-rose-500",
    accentFillSoft: "bg-rose-100",
    accentDot: "bg-rose-600",
  },
  "allmänmedicin": {
    badge: "border border-amber-200 bg-[linear-gradient(135deg,rgba(255,251,235,0.97),rgba(254,243,199,0.84))] text-amber-800",
    badgeStrong: "border border-amber-300 bg-[linear-gradient(135deg,rgba(254,243,199,0.95),rgba(253,230,138,0.88))] text-amber-900 shadow-sm",
    card: "border-amber-200 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(255,251,235,0.92)_58%,rgba(254,243,199,0.88))]",
    cardSoft: "border-amber-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(255,251,235,0.9))]",
    panel: "border-amber-200 bg-[linear-gradient(140deg,rgba(255,255,255,0.98),rgba(255,251,235,0.93)_52%,rgba(253,224,71,0.22)_100%)] text-amber-950 shadow-sm",
    panelMuted: "bg-amber-100/70 border-amber-200",
    accentText: "text-amber-800",
    accentTextStrong: "text-amber-900",
    accentTextHover: "hover:text-amber-900",
    accentBorder: "border-amber-300",
    accentBorderHover: "hover:border-amber-400",
    accentRing: "ring-amber-300",
    accentBg: "bg-amber-500",
    accentBgHover: "hover:bg-amber-600",
    accentBgSoft: "bg-amber-500/15",
    accentFill: "bg-amber-500",
    accentFillSoft: "bg-amber-100",
    accentDot: "bg-amber-600",
  },
  psykiatri: {
    badge: "border border-fuchsia-200 bg-[linear-gradient(135deg,rgba(253,244,255,0.97),rgba(250,232,255,0.84))] text-fuchsia-800",
    badgeStrong: "border border-fuchsia-300 bg-[linear-gradient(135deg,rgba(250,232,255,0.95),rgba(245,208,254,0.88))] text-fuchsia-900 shadow-sm",
    card: "border-fuchsia-200 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(253,244,255,0.92)_58%,rgba(250,232,255,0.88))]",
    cardSoft: "border-fuchsia-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(253,244,255,0.9))]",
    panel: "border-fuchsia-200 bg-[linear-gradient(140deg,rgba(255,255,255,0.98),rgba(253,244,255,0.93)_52%,rgba(245,208,254,0.35)_100%)] text-fuchsia-950 shadow-sm",
    panelMuted: "bg-fuchsia-100/70 border-fuchsia-200",
    accentText: "text-fuchsia-800",
    accentTextStrong: "text-fuchsia-900",
    accentTextHover: "hover:text-fuchsia-900",
    accentBorder: "border-fuchsia-300",
    accentBorderHover: "hover:border-fuchsia-400",
    accentRing: "ring-fuchsia-300",
    accentBg: "bg-fuchsia-600",
    accentBgHover: "hover:bg-fuchsia-700",
    accentBgSoft: "bg-fuchsia-500/15",
    accentFill: "bg-fuchsia-500",
    accentFillSoft: "bg-fuchsia-100",
    accentDot: "bg-fuchsia-600",
  },
}

const DEFAULT_THEME: SpecialtyTheme = {
  badge: "border border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,0.97),rgba(241,245,249,0.88))] text-slate-600",
  badgeStrong: "border border-slate-300 bg-[linear-gradient(135deg,rgba(241,245,249,0.97),rgba(226,232,240,0.9))] text-slate-800 shadow-sm",
  card: "bg-white border-slate-200",
  cardSoft: "bg-slate-50 border-slate-200",
  panel: "border-slate-200 bg-[linear-gradient(140deg,rgba(255,255,255,0.98),rgba(248,250,252,0.93)_60%,rgba(226,232,240,0.4)_100%)] text-slate-900 shadow-sm",
  panelMuted: "bg-slate-100/70 border-slate-200",
  accentText: "text-slate-700",
  accentTextStrong: "text-slate-900",
  accentTextHover: "hover:text-slate-900",
  accentBorder: "border-slate-300",
  accentBorderHover: "hover:border-slate-400",
  accentRing: "ring-slate-300",
  accentBg: "bg-slate-700",
  accentBgHover: "hover:bg-slate-800",
  accentBgSoft: "bg-slate-500/15",
  accentFill: "bg-slate-500",
  accentFillSoft: "bg-slate-100",
  accentDot: "bg-slate-600",
}

const SPECIALTY_LABELS: Record<string, string> = {
  internmedicin: "Internmedicin",
  kirurgi: "Kirurgi",
  "allmänmedicin": "Allmänmedicin",
  psykiatri: "Psykiatri",
}

export type SpecialtyTheme = {
  badge: string
  badgeStrong: string
  card: string
  cardSoft: string
  panel: string
  panelMuted: string
  accentText: string
  accentTextStrong: string
  accentTextHover: string
  accentBorder: string
  accentBorderHover: string
  accentRing: string
  accentBg: string
  accentBgHover: string
  accentBgSoft: string
  accentFill: string
  accentFillSoft: string
  accentDot: string
}

export function specialtyName(caseTitle: string): string {
  const parts = caseTitle.split("–")
  return parts.length > 1 ? parts[parts.length - 1].trim() : caseTitle
}

export function specialtyKey(caseTitleOrSpecialty: string): string {
  return specialtyName(caseTitleOrSpecialty).trim().toLowerCase()
}

export function specialtyLabel(caseTitleOrSpecialty: string): string {
  return SPECIALTY_LABELS[specialtyKey(caseTitleOrSpecialty)] ?? specialtyName(caseTitleOrSpecialty).trim()
}

export function getSpecialtyTheme(caseTitleOrSpecialty: string): SpecialtyTheme {
  return SPECIALTY_THEMES[specialtyKey(caseTitleOrSpecialty)] ?? DEFAULT_THEME
}
