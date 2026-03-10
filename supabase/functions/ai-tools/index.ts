import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Models available to users
const GROQ_MODELS = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "gemma2-9b-it", "openai/gpt-oss-20b", "openai/gpt-oss-120b"];
const LOVABLE_MODELS = ["google/gemini-2.5-flash-lite", "google/gemini-2.5-flash", "google/gemini-3-flash-preview", "google/gemini-2.5-pro"];

// Map Groq models to Lovable equivalents (Groq is no longer supported)
const GROQ_TO_LOVABLE: Record<string, string> = {
  "llama-3.1-8b-instant": "google/gemini-2.5-flash-lite",
  "llama-3.3-70b-versatile": "google/gemini-2.5-flash",
  "gemma2-9b-it": "google/gemini-2.5-flash-lite",
  "openai/gpt-oss-20b": "google/gemini-2.5-flash",
  "openai/gpt-oss-120b": "google/gemini-2.5-pro",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  snippets: `You are DevsFlow Snippet Generator. Given a description of a function or feature, generate a clean, well-commented code snippet. Return ONLY valid markdown with a single code block. Include the language identifier. Keep it focused and production-ready.`,
  analysis: `You are DevsFlow Code Analyzer. Analyze the provided code and return a structured report in markdown using EXACTLY these four sections (no others):

## Strengths
What the code does well — good patterns, clean logic, proper usage. Use bullet points.

## Weaknesses
Design flaws, anti-patterns, maintainability concerns, poor naming, missing abstractions. Use bullet points.

## Errors
Actual bugs, runtime errors, type issues, security vulnerabilities, incorrect logic. Use bullet points. If none found, say "No critical errors detected."

## Improvements
Concrete, actionable suggestions to improve the code with brief code examples where helpful. Prioritize by impact. Use bullet points.

Keep each section focused and concise. No filler text.`,
  converter: `You are DevsFlow Code Converter. Convert the given code from one programming language to another. Return ONLY the converted code in a markdown code block with the target language identifier. Preserve logic, comments (translated), and structure. Add brief notes about language-specific differences after the code block.`,
  terminal: `You are DevsFlow Terminal Simulator. The user will send you commands. You have access to their project files which will be provided as context. For file system commands (ls, cat, etc.), use the actual file data. For other commands (npm, git, node, python, etc.), simulate realistic output. Format output exactly as a real terminal would. Keep responses concise and terminal-like (no markdown formatting, just plain text output). If a command modifies files, respond with a special marker: [CMD:action:args] where action is create/delete/write and args are the parameters.`,
  diff: `You are DevsFlow Code Assistant. You have access to ALL files in the user's project. The user's COMPLETE current codebase is provided to you as context. You can CREATE new files or EDIT existing files.

ABSOLUTE RULE — NO REPETITION:
- You MUST respond ONCE with your changes. Do NOT repeat or regenerate code you already provided.
- If the user says "thanks" or acknowledges your changes, just reply with a short confirmation. Do NOT resend code.
- If you see "[code applied]" or "[edit applied]" in the conversation, that means your previous code was already applied. Do NOT regenerate it.
- NEVER output the same [FILE:] or [EDIT:] block twice across the conversation.
- Keep explanations to 2-4 sentences. Be concise.

CRITICAL RULES FOR EDITING FILES:

You have TWO modes of returning changes:

MODE 1 — FULL FILE (for new files or major rewrites):
Use [FILE:filename.ext] to return the ENTIRE file content. This REPLACES the whole file.

[FILE:filename.ext]
(full file content here)
[/FILE]

MODE 2 — LINE EDITS (for surgical changes to existing files):
Use [EDIT:filename.ext] with specific operations. This is PREFERRED for small changes.

[EDIT:filename.ext]
INSERT_AFTER:line_number
(lines to insert after that line number, use 0 to insert at the top)
END_INSERT

REPLACE:start_line:end_line
(new content to replace lines start_line through end_line inclusive)
END_REPLACE

DELETE:start_line:end_line
END_DELETE
[/EDIT]

You can combine multiple operations in one [EDIT] block.

RULES:
1. ALWAYS start with a 2-4 sentence explanation of what you're doing.
2. For NEW files, always use MODE 1 ([FILE:]). PROACTIVELY suggest creating new files when the project needs them.
3. For SMALL edits (< 20 lines changed), prefer MODE 2 ([EDIT:]) with line numbers.
4. For LARGE edits (> 50% of file changed), use MODE 1 ([FILE:]) with full content.
5. When using MODE 1, include EVERY line of the file. Omitted lines are deleted.
6. When using MODE 2, reference line numbers from the current file as provided.
7. Never use markdown code blocks. Only use [FILE] or [EDIT] markers.
8. You have MEMORY — reference earlier conversation context.
9. You can create, edit, or delete multiple files in one response.
10. If an HTML file references a JS or CSS file that doesn't exist yet, CREATE that file.
11. ONLY output code for files that NEED changes. Do NOT output unchanged files.

FILE SUGGESTIONS:
- When building features, create all necessary files (HTML + CSS + JS).
- Script files should be linked in HTML with <script src="filename.js"></script> before </body>.
- CSS files should be linked with <link rel="stylesheet" href="filename.css"> in <head>.

ICON RESOURCES — When the user needs icons in HTML/CSS/JS projects:
- Lucide Icons (recommended): <link href="https://unpkg.com/lucide-static@latest/font/lucide.css" rel="stylesheet"> — Use <i class="icon-[name]"></i>
- Font Awesome: <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"> — Use <i class="fa-solid fa-[name]"></i>

CRITICAL ROUTING RULE — Navigation & Buttons:
Because the preview runs inside a sandboxed iframe, JavaScript-based routing does NOT work reliably.
1. EVERY button that navigates MUST use an <a> tag with href.
2. NEVER use onclick with window.location for navigation.
3. For single-page apps, use anchor links: <a href="#section">.`,
  courses: `You are DevsFlow Course Generator. You create personalized, HIGHLY INTERACTIVE programming courses. Follow instructions precisely and return valid JSON only when asked for JSON.

When generating lesson content, return rich markdown BUT embed interactive blocks using these EXACT markers:

1. INLINE QUIZ — Multiple choice questions to test understanding:
:::quiz
{"question":"What does Array.map() return?","options":["A new array","undefined","The original array","A boolean"],"correct":0,"explanation":"map() always returns a new array with the results of calling the provided function on every element."}
:::

2. CODE CHALLENGE — Hands-on coding exercises the user must attempt:
:::challenge
{"title":"Reverse a String","description":"Write a function that reverses a string without using .reverse()","starterCode":"function reverseString(str) {\\n  // Your code here\\n}","solution":"function reverseString(str) {\\n  return str.split('').reverse().join('');\\n}","hint":"Think about splitting the string into characters first.","language":"javascript"}
:::

3. FILL IN THE BLANK — Complete the code:
:::fillin
{"prompt":"Complete the code to filter even numbers:","code":"const evens = numbers.___(n => n ___ 2 === 0);","blanks":["filter","% "],"explanation":"Array.filter() with modulo operator checks for even numbers."}
:::

4. TRUE/FALSE — Quick concept checks:
:::truefalse
{"statement":"In JavaScript, const means the variable can never change.","correct":false,"explanation":"const prevents reassignment, but object/array contents can still be mutated."}
:::

RULES FOR LESSON GENERATION:
- Start each lesson with a brief, engaging introduction (2-3 paragraphs max).
- After EVERY major concept, immediately add an interactive block (quiz, challenge, fillin, or truefalse).
- Include AT LEAST 4-6 interactive blocks per lesson.
- Mix the types: don't use only quizzes. Use challenges for practical skills, fillin for syntax, truefalse for concepts.
- End each lesson with a "Final Challenge" (a harder code challenge that combines concepts).
- Use real-world examples and analogies.
- Code examples should be runnable and practical, not trivial.
- For test/quiz lessons, use 8-10 interactive blocks with minimal text between them.
- Always include the explanation field — this teaches when users get answers wrong.
- Make it feel like a game, not a textbook.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, messages, prompt, code, sourceLang, targetLang, description, language, model, files, userProfile, stream: streamRequested } = await req.json();
    const shouldStream = streamRequested !== false; // default true

    // Always use Lovable AI gateway — map Groq models to Lovable equivalents
    const apiKey = Deno.env.get("LOVABLE_API_KEY") || "";
    if (!apiKey) throw new Error("Advanced AI gateway key is not configured");
    const apiUrl = LOVABLE_AI_URL;

    // Resolve model: map old Groq models to Lovable equivalents
    let selectedModel = model || "google/gemini-3-flash-preview";
    if (GROQ_TO_LOVABLE[selectedModel]) {
      selectedModel = GROQ_TO_LOVABLE[selectedModel];
    }
    // Ensure it's a valid Lovable model
    if (!LOVABLE_MODELS.includes(selectedModel)) {
      selectedModel = "google/gemini-3-flash-preview";
    }

    const systemPrompt = SYSTEM_PROMPTS[type];
    if (!systemPrompt) throw new Error(`Unknown tool type: ${type}`);

    const customPrompt = Deno.env.get("AI_SYSTEM_PROMPT") || "";
    let finalSystemPrompt = customPrompt ? `${systemPrompt}\n\nAdditional instructions:\n${customPrompt}` : systemPrompt;

    if (userProfile) {
      const profileParts: string[] = [];
      if (userProfile.display_name) profileParts.push(`User's name: ${userProfile.display_name}`);
      if (userProfile.about) profileParts.push(`About the user: ${userProfile.about}`);
      if (userProfile.custom_instructions) profileParts.push(`User's custom instructions: ${userProfile.custom_instructions}`);
      if (profileParts.length > 0) {
        finalSystemPrompt += `\n\nUser context:\n${profileParts.join("\n")}`;
      }
    }

    let userMessages: { role: string; content: string }[] = [];
    let systemContent = finalSystemPrompt;

    if (type === "snippets") {
      userMessages = [{ role: "user", content: `Generate a ${language || "JavaScript"} code snippet for: ${description}` }];
    } else if (type === "analysis") {
      userMessages = [{ role: "user", content: `Analyze this code:\n\n${code}` }];
    } else if (type === "converter") {
      userMessages = [{ role: "user", content: `Convert this ${sourceLang} code to ${targetLang}:\n\n${code}` }];
    } else if (type === "terminal" || type === "diff") {
      if (files && type === "diff") {
        const filesWithLines = Object.entries(files).map(([name, content]) => {
          const lines = (content as string).split("\n");
          const numbered = lines.map((l, i) => `${i + 1}: ${l}`).join("\n");
          return `--- ${name} ---\n${numbered}`;
        }).join("\n\n");
        systemContent = finalSystemPrompt + `\n\nAll project files (with line numbers):\n${filesWithLines}\n`;
      } else if (files) {
        const filesContext = Object.entries(files).map(([name, content]) => `--- ${name} ---\n${content}`).join("\n");
        systemContent = finalSystemPrompt + `\nProject files:\n${filesContext}\n`;
      }
      userMessages = messages || [];
    } else if (type === "courses") {
      userMessages = messages || [];
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [{ role: "system", content: systemContent }, ...userMessages],
        stream: shouldStream,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `AI service error: ${response.status}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (shouldStream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    } else {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      return new Response(JSON.stringify({ content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("ai-tools error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
