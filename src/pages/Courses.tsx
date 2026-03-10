import { useState, useEffect } from "react";
import { GraduationCap, Loader2, Sparkles, BookOpen, Trophy, ChevronRight, Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { streamAITool } from "@/lib/ai-tools-stream";
import { useUserProfile } from "@/hooks/useUserProfile";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { LANGUAGES } from "@/lib/languages";
import {
  QuizBlock, ChallengeBlock, FillInBlock, TrueFalseBlock,
  parseInteractiveContent
} from "@/components/courses/InteractiveBlocks";

type Step = "goal" | "language" | "level" | "quiz" | "plan" | "lesson";

interface Course {
  id: string; goal: string; language: string; skill_level: string; plan: any[]; created_at: string;
}

interface Lesson {
  id: string; course_id: string; title: string; lesson_index: number; content: string; is_test: boolean; completed: boolean; generated: boolean;
}

export default function Courses() {
  const { user } = useAuth();
  const { credits, useCredit } = useCredits();
  const userProfile = useUserProfile();

  const [step, setStep] = useState<Step>("goal");
  const [goal, setGoal] = useState("");
  const [language, setLanguage] = useState("");
  const [skillLevel, setSkillLevel] = useState("");
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [lessonContent, setLessonContent] = useState("");
  const [generatingLesson, setGeneratingLesson] = useState(false);
  const [suggestedLangs, setSuggestedLangs] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { if (user) fetchCourses(); }, [user]);

  const fetchCourses = async () => {
    const { data } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
    setCourses((data as any[]) || []);
  };

  const recommendLanguages = async () => {
    if (!goal.trim()) return;
    const hasCredit = await useCredit();
    if (!hasCredit) return;
    setLoading(true);
    let full = "";
    await streamAITool({
      body: { type: "courses", messages: [{ role: "user", content: `The user wants to learn programming to: "${goal}". Suggest exactly 5 best programming languages for this goal. Return ONLY a JSON array of language names like ["Python","JavaScript","Go","Rust","TypeScript"]. No explanation.` }] },
      onDelta: (c) => { full += c; },
      onDone: () => {
        try { const match = full.match(/\[.*\]/s); if (match) setSuggestedLangs(JSON.parse(match[0])); } catch { setSuggestedLangs(["Python", "JavaScript", "TypeScript"]); }
        setStep("language"); setLoading(false);
      },
      onError: (e) => { toast.error(e); setLoading(false); },
    });
  };

  const generateQuiz = async () => {
    if (!language) return;
    const hasCredit = await useCredit();
    if (!hasCredit) return;
    setLoading(true);
    let full = "";
    await streamAITool({
      body: { type: "courses", messages: [{ role: "user", content: `Generate a quick 5-question ${language} skill assessment quiz for someone who rated themselves as "${skillLevel}". Return ONLY valid JSON array like: [{"question":"...","options":["A","B","C","D"],"correct":"A"}]. No explanation.` }] },
      onDelta: (c) => { full += c; },
      onDone: () => {
        try { const match = full.match(/\[.*\]/s); if (match) { setQuizQuestions(JSON.parse(match[0])); setStep("quiz"); } } catch { toast.error("Failed to generate quiz"); }
        setLoading(false);
      },
      onError: (e) => { toast.error(e); setLoading(false); },
    });
  };

  const submitQuiz = async () => {
    const hasCredit = await useCredit();
    if (!hasCredit) return;
    setLoading(true);
    const score = quizQuestions.filter((q, i) => quizAnswers[i] === q.correct).length;
    let full = "";
    await streamAITool({
      body: { type: "courses", messages: [{ role: "user", content: `Create a personalized ${language} learning plan for someone who wants to "${goal}". They rated themselves "${skillLevel}" and scored ${score}/${quizQuestions.length} on the assessment. Create a plan with 8-12 items mixing lessons and tests. Return ONLY a JSON array like: [{"title":"Introduction to ${language}","type":"lesson"},{"title":"Quiz: Basics","type":"test"}]. No explanation.` }] },
      onDelta: (c) => { full += c; },
      onDone: async () => {
        try {
          const match = full.match(/\[.*\]/s);
          if (match) {
            const plan = JSON.parse(match[0]);
            const { data: course } = await supabase.from("courses").insert({ user_id: user!.id, goal, language, skill_level: skillLevel, quiz_results: quizQuestions.map((q, i) => ({ ...q, answer: quizAnswers[i] })), plan }).select().single();
            if (course) {
              const lessonInserts = plan.map((item: any, idx: number) => ({ course_id: (course as any).id, user_id: user!.id, title: item.title, lesson_index: idx, is_test: item.type === "test" }));
              await supabase.from("course_lessons").insert(lessonInserts);
              await fetchCourses();
              openCourse(course as any);
            }
          }
        } catch { toast.error("Failed to create course"); }
        setLoading(false);
      },
      onError: (e) => { toast.error(e); setLoading(false); },
    });
  };

  const openCourse = async (course: Course) => {
    setActiveCourse(course); setActiveLesson(null); setShowCreate(false);
    const { data } = await supabase.from("course_lessons").select("*").eq("course_id", course.id).order("lesson_index", { ascending: true });
    setLessons((data as any[]) || []);
  };

  const openLesson = async (lesson: Lesson) => {
    setActiveLesson(lesson);
    if (lesson.generated && lesson.content) { setLessonContent(lesson.content); return; }
    const hasCredit = await useCredit();
    if (!hasCredit) return;
    setGeneratingLesson(true); setLessonContent("");
    let full = "";

    // Build rich context
    const plan = (activeCourse?.plan as any[]) || [];
    const completedLessons = lessons.filter(l => l.completed).map(l => l.title);
    const currentIndex = lesson.lesson_index;
    const previousLessons = lessons.filter(l => l.lesson_index < currentIndex);
    const prevTitles = previousLessons.map(l => `${l.title} (${l.completed ? "completed" : "not started"})`);
    
    const contextParts = [
      `Course: ${activeCourse?.language} — Goal: "${activeCourse?.goal}"`,
      `Student level: ${activeCourse?.skill_level}`,
      `Course plan (${plan.length} items): ${plan.map((p: any, i: number) => `${i + 1}. ${p.title} [${p.type}]`).join(", ")}`,
      `Progress: ${completedLessons.length}/${lessons.length} completed`,
      prevTitles.length > 0 ? `Previous lessons: ${prevTitles.join("; ")}` : "This is the first lesson.",
      `Current lesson (#${currentIndex + 1}): "${lesson.title}" — Type: ${lesson.is_test ? "TEST/QUIZ" : "LESSON"}`,
    ];

    const lessonType = lesson.is_test
      ? "Create an interactive test/quiz with 8-10 interactive blocks (quiz, challenge, fillin, truefalse). Minimal explanatory text — focus on testing."
      : "Create a detailed interactive lesson. After every concept, include an interactive block (quiz, challenge, fillin, or truefalse). Include at least 5 interactive blocks. End with a final challenge.";

    await streamAITool({
      body: {
        type: "courses",
        messages: [{
          role: "user",
          content: `${contextParts.join("\n")}\n\n${lessonType}\n\nLesson title: "${lesson.title}"\n\nReturn rich markdown with embedded interactive blocks (:::quiz, :::challenge, :::fillin, :::truefalse). Make it engaging and game-like.`
        }],
      },
      onDelta: (c) => { full += c; setLessonContent(full); },
      onDone: async () => {
        await supabase.from("course_lessons").update({ content: full, generated: true }).eq("id", lesson.id);
        setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, content: full, generated: true } : l));
        setGeneratingLesson(false);
      },
      onError: (e) => { toast.error(e); setGeneratingLesson(false); },
      userProfile,
    });
  };

  const markComplete = async (lessonId: string) => {
    await supabase.from("course_lessons").update({ completed: true }).eq("id", lessonId);
    setLessons(prev => prev.map(l => l.id === lessonId ? { ...l, completed: true } : l));
  };

  // Lesson viewer
  if (activeCourse && activeLesson) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setActiveLesson(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-mono text-muted-foreground truncate">{activeLesson.title}</span>
          </div>
          {!activeLesson.completed && (
            <Button size="sm" className="gap-1 bg-cyan hover:bg-cyan/80 text-background" onClick={() => markComplete(activeLesson.id)}>
              <Trophy className="h-3 w-3" /> Mark Complete
            </Button>
          )}
        </div>
        {generatingLesson && !lessonContent && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-cyan" />
            <span className="ml-2 text-muted-foreground">Generating lesson...</span>
          </div>
        )}
        {lessonContent && (
          <div className="prose prose-invert prose-sm max-w-none [&_pre]:bg-[hsl(var(--terminal-bg))] [&_pre]:border [&_pre]:border-border [&_pre]:rounded-md [&_code]:text-cyan/90 [&_h2]:text-cyan [&_h2]:border-b [&_h2]:border-border [&_h2]:pb-2">
            {parseInteractiveContent(lessonContent).map((block, i) => {
              if (block.type === "quiz") return <QuizBlock key={i} data={block.data} />;
              if (block.type === "challenge") return <ChallengeBlock key={i} data={block.data} />;
              if (block.type === "fillin") return <FillInBlock key={i} data={block.data} />;
              if (block.type === "truefalse") return <TrueFalseBlock key={i} data={block.data} />;
              return <ReactMarkdown key={i}>{block.content}</ReactMarkdown>;
            })}
          </div>
        )}
      </div>
    );
  }

  // Course lessons list
  if (activeCourse) {
    const completedCount = lessons.filter(l => l.completed).length;
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setActiveCourse(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-mono text-muted-foreground truncate">{activeCourse.language}: {activeCourse.goal}</span>
          </div>
          <span className="text-xs font-mono text-cyan">{completedCount}/{lessons.length} done</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2 mb-6">
          <div className="bg-cyan h-2 rounded-full transition-all" style={{ width: `${lessons.length ? (completedCount / lessons.length) * 100 : 0}%` }} />
        </div>
        <div className="grid gap-2">
          {lessons.map((lesson, i) => (
            <div key={lesson.id} onClick={() => openLesson(lesson)} className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${lesson.completed ? "border-cyan/30 bg-cyan/5" : "border-border bg-card hover:border-cyan/20"}`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-mono shrink-0 ${lesson.completed ? "bg-cyan text-background" : lesson.is_test ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"}`}>
                {lesson.completed ? "✓" : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-sm font-medium truncate ${lesson.completed ? "text-cyan" : "text-foreground"}`}>{lesson.title}</h3>
                <p className="text-xs text-muted-foreground">{lesson.is_test ? "Test" : "Lesson"}{lesson.generated ? "" : " • Click to generate"}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Course list
  if (!showCreate) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-cyan/10 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-cyan" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">AI Courses</h1>
              <p className="text-sm text-muted-foreground">Personalized learning paths powered by AI</p>
            </div>
          </div>
          <Button onClick={() => { setShowCreate(true); setStep("goal"); }} className="gap-2 bg-cyan hover:bg-cyan/80 text-background">
            <Plus className="h-4 w-4" /> New Course
          </Button>
        </div>
        {courses.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-lg">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-muted-foreground">No courses yet. Create your first AI-powered course!</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {courses.map(c => (
              <div key={c.id} onClick={() => openCourse(c)} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:border-cyan/30 hover:shadow-lg hover:shadow-cyan/5 transition-all cursor-pointer group">
                <div>
                  <h3 className="font-medium text-foreground group-hover:text-cyan transition-colors">{c.language}: {c.goal}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.skill_level} • {(c.plan as any[])?.length || 0} lessons</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-cyan" />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Course creation wizard
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-12">
      <Button variant="ghost" size="sm" className="mb-4 gap-1 text-muted-foreground" onClick={() => setShowCreate(false)}>
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </Button>

      {step === "goal" && (
        <Card className="animate-fade-up border-border bg-card">
          <CardHeader className="text-center pb-2">
            <div className="h-16 w-16 rounded-2xl bg-cyan/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-cyan" />
            </div>
            <CardTitle className="text-2xl">What do you want to build?</CardTitle>
            <CardDescription>Describe your goal and AI will create a personalized course</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Build a full-stack web app, Create mobile games..." className="bg-secondary border-border text-center" onKeyDown={(e) => e.key === "Enter" && recommendLanguages()} />
            <Button onClick={recommendLanguages} disabled={!goal.trim() || loading} className="w-full gap-2 bg-cyan hover:bg-cyan/80 text-background">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />} Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "language" && (
        <Card className="animate-fade-up border-border bg-card">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Pick a Language</CardTitle>
            <CardDescription>AI recommends these for your goal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {suggestedLangs.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestedLangs.map(l => (
                  <button key={l} onClick={() => setLanguage(l)} className={`px-4 py-2 rounded-lg border text-sm font-mono transition-all ${language === l ? "border-cyan bg-cyan/10 text-cyan" : "border-border bg-secondary text-foreground hover:border-cyan/30"}`}>{l}</button>
                ))}
              </div>
            )}
            <div className="text-center text-xs text-muted-foreground">or choose from list</div>
            <Select value={LANGUAGES.includes(language) ? language : ""} onValueChange={setLanguage}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select language" /></SelectTrigger>
              <SelectContent>{LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
            <div className="text-center text-xs text-muted-foreground">or type your own</div>
            <Input 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)} 
              placeholder="Enter custom language (e.g., Brainfuck, BASIC)"
              className="bg-secondary border-border text-center"
            />
            <Button onClick={() => setStep("level")} disabled={!language} className="w-full gap-2 bg-cyan hover:bg-cyan/80 text-background">
              <ChevronRight className="h-4 w-4" /> Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "level" && (
        <Card className="animate-fade-up border-border bg-card">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Your Skill Level</CardTitle>
            <CardDescription>How would you rate yourself in {language}?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {[
                { value: "beginner", label: "Beginner", desc: "New to programming or this language", icon: "🌱" },
                { value: "intermediate", label: "Intermediate", desc: "Know basics, built small projects", icon: "🔧" },
                { value: "advanced", label: "Advanced", desc: "Built complex apps, know patterns", icon: "🚀" },
                { value: "expert", label: "Expert", desc: "Deep knowledge, want to master edge cases", icon: "💎" },
              ].map(level => (
                <button key={level.value} onClick={() => setSkillLevel(level.value)} className={`flex items-center gap-3 p-4 rounded-lg border text-left transition-all ${skillLevel === level.value ? "border-cyan bg-cyan/5" : "border-border bg-card hover:border-cyan/20"}`}>
                  <span className="text-2xl">{level.icon}</span>
                  <div><h3 className="font-medium text-foreground">{level.label}</h3><p className="text-xs text-muted-foreground">{level.desc}</p></div>
                </button>
              ))}
            </div>
            <Button onClick={generateQuiz} disabled={!skillLevel || loading} className="w-full gap-2 bg-cyan hover:bg-cyan/80 text-background">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />} Take Quick Assessment
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "quiz" && (
        <Card className="animate-fade-up border-border bg-card">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Quick Assessment</CardTitle>
            <CardDescription>{quizQuestions.length} questions to calibrate your course</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {quizQuestions.map((q, qi) => (
              <Card key={qi} className="border-border bg-secondary/30">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-foreground mb-3">{qi + 1}. {q.question}</p>
                  <div className="grid gap-2">
                    {q.options?.map((opt: string, oi: number) => (
                      <button key={oi} onClick={() => setQuizAnswers(p => ({ ...p, [qi]: opt }))} className={`text-left px-3 py-2 rounded-md border text-sm transition-all ${quizAnswers[qi] === opt ? "border-cyan bg-cyan/10 text-cyan" : "border-border bg-secondary text-foreground hover:border-cyan/20"}`}>{opt}</button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button onClick={submitQuiz} disabled={Object.keys(quizAnswers).length < quizQuestions.length || loading} className="w-full gap-2 bg-cyan hover:bg-cyan/80 text-background">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate My Course
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
