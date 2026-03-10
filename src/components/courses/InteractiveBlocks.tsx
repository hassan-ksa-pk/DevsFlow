import { useState } from "react";
import { Check, X, Lightbulb, Eye, EyeOff, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

// --- Quiz Block ---
interface QuizData {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export function QuizBlock({ data }: { data: QuizData }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const isCorrect = selected === data.correct;

  return (
    <div className="my-6 rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 bg-cyan/10 border-b border-border flex items-center gap-2">
        <span className="text-cyan text-sm font-semibold font-mono">🧠 QUIZ</span>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">{data.question}</p>
        <div className="grid gap-2">
          {data.options.map((opt, i) => {
            let cls = "border-border bg-secondary text-foreground hover:border-cyan/30";
            if (submitted && i === data.correct) cls = "border-green-500 bg-green-500/10 text-green-400";
            else if (submitted && i === selected) cls = "border-red-500 bg-red-500/10 text-red-400";
            else if (!submitted && i === selected) cls = "border-cyan bg-cyan/10 text-cyan";
            return (
              <button
                key={i}
                disabled={submitted}
                onClick={() => setSelected(i)}
                className={`text-left px-3 py-2 rounded-lg border text-sm transition-all flex items-center gap-2 ${cls}`}
              >
                <span className="font-mono text-xs opacity-60">{String.fromCharCode(65 + i)}</span>
                {opt}
                {submitted && i === data.correct && <Check className="h-3.5 w-3.5 ml-auto text-green-400" />}
                {submitted && i === selected && i !== data.correct && <X className="h-3.5 w-3.5 ml-auto text-red-400" />}
              </button>
            );
          })}
        </div>
        {!submitted ? (
          <Button size="sm" disabled={selected === null} onClick={() => setSubmitted(true)} className="gap-1 bg-cyan hover:bg-cyan/80 text-background">
            <Check className="h-3 w-3" /> Check Answer
          </Button>
        ) : (
          <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${isCorrect ? "bg-green-500/10 text-green-300" : "bg-amber-500/10 text-amber-300"}`}>
            <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{isCorrect ? "Correct! " : "Not quite. "}{data.explanation}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Code Challenge Block ---
interface ChallengeData {
  title: string;
  description: string;
  starterCode: string;
  solution: string;
  hint?: string;
  language?: string;
}

export function ChallengeBlock({ data }: { data: ChallengeData }) {
  const [code, setCode] = useState(data.starterCode);
  const [showSolution, setShowSolution] = useState(false);
  const [showHint, setShowHint] = useState(false);

  return (
    <div className="my-6 rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 bg-accent/10 border-b border-border flex items-center gap-2">
        <span className="text-accent text-sm font-semibold font-mono">💻 CODE CHALLENGE</span>
        <span className="ml-auto text-xs text-muted-foreground font-mono">{data.language || "code"}</span>
      </div>
      <div className="p-4 space-y-3">
        <h4 className="text-sm font-bold text-foreground">{data.title}</h4>
        <p className="text-sm text-muted-foreground">{data.description}</p>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="w-full min-h-[120px] bg-[hsl(var(--terminal-bg,var(--secondary)))] border border-border rounded-lg p-3 font-mono text-xs text-cyan/90 resize-y focus:outline-none focus:ring-1 focus:ring-cyan/30"
        />
        <div className="flex flex-wrap gap-2">
          {data.hint && (
            <Button size="sm" variant="outline" onClick={() => setShowHint(!showHint)} className="gap-1 text-xs">
              <Lightbulb className="h-3 w-3" /> {showHint ? "Hide Hint" : "Show Hint"}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowSolution(!showSolution)} className="gap-1 text-xs">
            {showSolution ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {showSolution ? "Hide Solution" : "Show Solution"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCode(data.starterCode)} className="gap-1 text-xs">
            <RotateCcw className="h-3 w-3" /> Reset
          </Button>
        </div>
        {showHint && data.hint && (
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-300 text-sm flex items-start gap-2">
            <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" /> {data.hint}
          </div>
        )}
        {showSolution && (
          <div className="rounded-lg overflow-hidden border border-green-500/30">
            <div className="px-3 py-1.5 bg-green-500/10 text-green-400 text-xs font-mono">Solution</div>
            <pre className="p-3 bg-[hsl(var(--terminal-bg,var(--secondary)))] text-xs font-mono text-foreground overflow-x-auto">
              <code>{data.solution}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Fill in the Blank Block ---
interface FillInData {
  prompt: string;
  code: string;
  blanks: string[];
  explanation: string;
}

export function FillInBlock({ data }: { data: FillInData }) {
  const [answers, setAnswers] = useState<string[]>(data.blanks.map(() => ""));
  const [submitted, setSubmitted] = useState(false);
  const isCorrect = answers.every((a, i) => a.trim().toLowerCase() === data.blanks[i].trim().toLowerCase());

  const parts = data.code.split("___");

  return (
    <div className="my-6 rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 bg-purple-500/10 border-b border-border flex items-center gap-2">
        <span className="text-purple-400 text-sm font-semibold font-mono">✏️ FILL IN THE BLANK</span>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">{data.prompt}</p>
        <div className="bg-[hsl(var(--terminal-bg,var(--secondary)))] rounded-lg p-3 font-mono text-xs leading-relaxed">
          {parts.map((part, i) => (
            <span key={i}>
              <span className="text-foreground/80">{part}</span>
              {i < parts.length - 1 && (
                <input
                  value={answers[i] || ""}
                  onChange={(e) => {
                    const next = [...answers];
                    next[i] = e.target.value;
                    setAnswers(next);
                  }}
                  disabled={submitted}
                  className={`inline-block w-24 mx-1 px-2 py-0.5 rounded border text-center text-xs font-mono bg-background/50 focus:outline-none focus:ring-1 focus:ring-cyan/30 ${
                    submitted
                      ? answers[i]?.trim().toLowerCase() === data.blanks[i]?.trim().toLowerCase()
                        ? "border-green-500 text-green-400"
                        : "border-red-500 text-red-400"
                      : "border-border text-cyan"
                  }`}
                  placeholder="..."
                />
              )}
            </span>
          ))}
        </div>
        {!submitted ? (
          <Button size="sm" onClick={() => setSubmitted(true)} className="gap-1 bg-cyan hover:bg-cyan/80 text-background">
            <Check className="h-3 w-3" /> Check
          </Button>
        ) : (
          <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${isCorrect ? "bg-green-500/10 text-green-300" : "bg-amber-500/10 text-amber-300"}`}>
            <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              {!isCorrect && <p className="mb-1">Answers: {data.blanks.map((b, i) => <code key={i} className="mx-1 px-1 rounded bg-background/30">{b}</code>)}</p>}
              <p>{data.explanation}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- True/False Block ---
interface TrueFalseData {
  statement: string;
  correct: boolean;
  explanation: string;
}

export function TrueFalseBlock({ data }: { data: TrueFalseData }) {
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const isCorrect = answer === data.correct;

  return (
    <div className="my-6 rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 bg-orange-500/10 border-b border-border flex items-center gap-2">
        <span className="text-orange-400 text-sm font-semibold font-mono">⚡ TRUE OR FALSE</span>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-sm font-medium text-foreground italic">"{data.statement}"</p>
        <div className="flex gap-2">
          {[true, false].map((val) => {
            let cls = "border-border bg-secondary text-foreground hover:border-cyan/30";
            if (submitted && val === data.correct) cls = "border-green-500 bg-green-500/10 text-green-400";
            else if (submitted && val === answer && val !== data.correct) cls = "border-red-500 bg-red-500/10 text-red-400";
            else if (!submitted && val === answer) cls = "border-cyan bg-cyan/10 text-cyan";
            return (
              <button
                key={String(val)}
                disabled={submitted}
                onClick={() => setAnswer(val)}
                className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all ${cls}`}
              >
                {val ? "✅ True" : "❌ False"}
              </button>
            );
          })}
        </div>
        {!submitted ? (
          <Button size="sm" disabled={answer === null} onClick={() => setSubmitted(true)} className="gap-1 bg-cyan hover:bg-cyan/80 text-background">
            <Check className="h-3 w-3" /> Check
          </Button>
        ) : (
          <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${isCorrect ? "bg-green-500/10 text-green-300" : "bg-amber-500/10 text-amber-300"}`}>
            <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{isCorrect ? "Correct! " : "Not quite. "}{data.explanation}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Parser: splits markdown + interactive blocks ---
export interface ParsedBlock {
  type: "markdown" | "quiz" | "challenge" | "fillin" | "truefalse";
  content: string;
  data?: any;
}

export function parseInteractiveContent(raw: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const regex = /:::(\w+)\n([\s\S]*?):::/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    // Add markdown before this block
    if (match.index > lastIndex) {
      const md = raw.slice(lastIndex, match.index).trim();
      if (md) blocks.push({ type: "markdown", content: md });
    }
    const blockType = match[1] as any;
    const jsonStr = match[2].trim();
    try {
      const data = JSON.parse(jsonStr);
      blocks.push({ type: blockType, content: "", data });
    } catch {
      // If JSON fails, render as markdown
      blocks.push({ type: "markdown", content: match[0] });
    }
    lastIndex = match.index + match[0].length;
  }

  // Remaining markdown
  if (lastIndex < raw.length) {
    const md = raw.slice(lastIndex).trim();
    if (md) blocks.push({ type: "markdown", content: md });
  }

  return blocks;
}
