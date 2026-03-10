import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- Wikipedia Search Utility ---
async function searchWikipedia(query: string): Promise<string> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=3&format=json&origin=*`;
    const searchResp = await fetch(searchUrl);
    const searchData = await searchResp.json();
    const results = searchData?.query?.search;
    if (!results || results.length === 0) return `No Wikipedia results found for "${query}".`;

    const title = results[0].title;
    const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=extracts&exintro=true&explaintext=true&exlimit=1&format=json&origin=*`;
    const extractResp = await fetch(extractUrl);
    const extractData = await extractResp.json();
    const pages = extractData?.query?.pages;
    const page = pages ? Object.values(pages)[0] as Record<string, unknown> : null;
    const extract = (page?.extract as string) || "No extract available.";

    let response = `**${title}** (Wikipedia)\n${extract.slice(0, 2000)}\n\nSource: https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
    if (results.length > 1) {
      response += `\n\nRelated articles: ${results.slice(1).map((r: Record<string, unknown>) => r.title).join(', ')}`;
    }
    return response;
  } catch (err) {
    console.error("Wikipedia search error:", err);
    return `Error searching Wikipedia: ${err instanceof Error ? err.message : 'Unknown error'}`;
  }
}

const BUILTIN_WIKI_TOOL = {
  type: "function",
  function: {
    name: "__builtin_wikipedia_search",
    description: "Search Wikipedia for factual information, current events summaries, definitions, biographies, or any topic. Use this when the user asks about real-world knowledge, wants to look something up, or asks for information you're not sure about.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query to look up on Wikipedia" },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { bot_id, api_key, message, history, system_prompt, assistant_mode, assistant_provider, assistant_model, assistant_api_key, custom_instructions, web_search_enabled } = body;

    if (!message) {
      return new Response(
        JSON.stringify({ error: "message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Assistant mode: direct AI call without bot project
    if (assistant_mode) {
      const reply = await handleAssistantMode(message, history || [], system_prompt, assistant_provider, assistant_model, assistant_api_key);
      return new Response(
        JSON.stringify({ reply }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!bot_id) {
      return new Response(
        JSON.stringify({ error: "bot_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch bot project
    const { data: project, error: projectError } = await supabase
      .from("chatbot_projects")
      .select("*")
      .eq("id", bot_id)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: "Bot not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate API key
    if (api_key && project.api_key !== api_key) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let reply = "";

    switch (project.mode) {
      case "standard":
        reply = await handleStandardMode(supabase, project, message, history || [], custom_instructions, web_search_enabled);
        break;
      case "n8n":
        reply = await handleN8nMode(supabase, project, message, history || []);
        break;
      case "advanced_http":
        // Keep legacy bots working: advanced_http behaves like standard chat (tools are already HTTP-based).
        reply = await handleStandardMode(supabase, project, message, history || [], custom_instructions, web_search_enabled);
        break;
      default:
        reply = "Unsupported mode.";
    }

    // Log the conversation
    const sessionId = crypto.randomUUID();
    await supabase.from("chat_logs").insert([
      { project_id: bot_id, session_id: sessionId, role: "user", content: message },
      { project_id: bot_id, session_id: sessionId, role: "assistant", content: reply },
    ]);

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("bot-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleAssistantMode(
  message: string,
  history: Array<{ role: string; content: string }>,
  systemPrompt: string | undefined,
  provider: string | undefined,
  model: string | undefined,
  userApiKey: string | undefined,
): Promise<string> {
  const messages = [
    { role: "system", content: (systemPrompt || "You are a helpful AI assistant.") + "\n\nYou have access to a Wikipedia search tool. When users ask about facts, events, people, places, science, or anything you're not 100% sure about, use the __builtin_wikipedia_search tool to look it up." },
    ...history,
    { role: "user", content: message },
  ];

  const effectiveProvider = (provider || "lovable_ai").toLowerCase();
  const effectiveModel = model || "google/gemini-3-flash-preview";

  // For Anthropic, no tool support in assistant mode for simplicity
  if (userApiKey && effectiveProvider === "anthropic") {
    const apiUrl = "https://api.anthropic.com/v1/messages";
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "x-api-key": userApiKey,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: effectiveModel,
        max_tokens: 4096,
        system: systemPrompt || "You are a helpful AI assistant.",
        messages: [...history, { role: "user", content: message }],
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic error:", response.status, errorText);
      throw new Error(`Anthropic API error: ${response.status}`);
    }
    const data = await response.json();
    return data.content?.[0]?.text || "I couldn't generate a response.";
  }

  // OpenAI-compatible providers (with wiki tool support)
  const apiUrl = userApiKey && effectiveProvider !== "lovable_ai"
    ? getAssistantProviderUrl(effectiveProvider)
    : "https://ai.gateway.lovable.dev/v1/chat/completions";
  const authHeader = userApiKey && effectiveProvider !== "lovable_ai"
    ? `Bearer ${userApiKey}`
    : `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`;

  if (!authHeader.replace('Bearer ', '')) throw new Error("No API key configured.");

  const requestBody: Record<string, unknown> = {
    model: effectiveModel,
    messages,
    tools: [BUILTIN_WIKI_TOOL],
    tool_choice: "auto",
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    if (response.status === 429) return "Rate limit reached. Please try again in a moment.";
    if (response.status === 402) return "Credits exhausted. Please add funds or try again later.";
    const errorText = await response.text();
    console.error("AI error:", response.status, errorText);
    throw new Error("AI service error");
  }

  const data = await response.json();
  const choice = data.choices?.[0];

  // Handle wiki tool call
  if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
    const toolResults: Array<{ role: string; content: string; tool_call_id: string }> = [];
    for (const tc of choice.message.tool_calls) {
      if (tc.function.name === "__builtin_wikipedia_search") {
        let args: Record<string, string> = {};
        try { args = JSON.parse(tc.function.arguments || "{}"); } catch { /* */ }
        const wikiResult = await searchWikipedia(args.query || message);
        toolResults.push({ role: "tool", content: wikiResult, tool_call_id: tc.id });
      } else {
        toolResults.push({ role: "tool", content: "Tool not available.", tool_call_id: tc.id });
      }
    }

    const followUp = await fetch(apiUrl, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ model: effectiveModel, messages: [...messages, choice.message, ...toolResults] }),
    });
    if (!followUp.ok) return "I searched Wikipedia but had trouble processing the result.";
    const followUpData = await followUp.json();
    return followUpData.choices?.[0]?.message?.content || "I couldn't generate a response.";
  }

  return choice?.message?.content || "I couldn't generate a response.";
}

function getAssistantProviderUrl(provider: string): string {
  switch (provider) {
    case "groq": return "https://api.groq.com/openai/v1/chat/completions";
    case "openai": return "https://api.openai.com/v1/chat/completions";
    default: return "https://api.openai.com/v1/chat/completions";
  }
}

async function handleStandardMode(
  supabase: ReturnType<typeof createClient>,
  project: Record<string, unknown>,
  message: string,
  history: Array<{ role: string; content: string }>,
  customInstructions?: string,
  webSearchEnabled?: boolean,
): Promise<string> {
  const { data: activeModel } = await supabase
    .from("chatbot_models")
    .select("*")
    .eq("project_id", project.id)
    .eq("is_active", true)
    .single();

  // Build system prompt with custom instructions
  let sysPrompt = (project.system_prompt as string) || "You are a helpful AI assistant.";
  const allowWebSearch = Boolean(webSearchEnabled ?? (project as any).web_search_enabled);
  if (allowWebSearch) {
    sysPrompt += "\n\nYou have access to a Wikipedia search tool. When users ask about facts, events, people, places, science, history, or anything you're unsure about, use the __builtin_wikipedia_search tool to look it up and provide accurate information.";
  }
  if (customInstructions) {
    sysPrompt += `\n\nAdditional user instructions:\n${customInstructions}`;
  }

  // Fetch knowledge base content
  const { data: kbFiles } = await supabase
    .from("knowledge_files")
    .select("content_text, file_name")
    .eq("project_id", project.id);
  
  const { data: kbPages } = await supabase
    .from("knowledge_web_pages")
    .select("content_text, title, url")
    .eq("project_id", project.id);

  let knowledgeContext = "";
  if (kbFiles && kbFiles.length > 0) {
    knowledgeContext += "\n\n--- Knowledge Base Files ---\n";
    for (const f of kbFiles) {
      if (f.content_text) knowledgeContext += `\n[${f.file_name}]:\n${f.content_text.slice(0, 3000)}\n`;
    }
  }
  if (kbPages && kbPages.length > 0) {
    knowledgeContext += "\n\n--- Knowledge Base Web Pages ---\n";
    for (const p of kbPages) {
      if (p.content_text) knowledgeContext += `\n[${p.title || p.url}]:\n${p.content_text.slice(0, 3000)}\n`;
    }
  }
  if (knowledgeContext) {
    sysPrompt += `\n\nUse the following knowledge base to answer questions when relevant:${knowledgeContext}`;
  }

  // Fetch bot tools to convert to function definitions
  const { data: botTools } = await supabase
    .from("bot_tools")
    .select("*, bot_tool_parameters(*)")
    .eq("project_id", project.id)
    .eq("is_active", true);

  // Build OpenAI-compatible tools array
  const tools: Array<Record<string, unknown>> = allowWebSearch ? [BUILTIN_WIKI_TOOL] : [];
  if (botTools && botTools.length > 0) {
    for (const tool of botTools) {
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      const params = tool.bot_tool_parameters || [];
      for (const p of params) {
        properties[p.param_name] = {
          type: p.param_type || "string",
          description: p.description || p.param_name,
        };
        if (p.required) required.push(p.param_name);
      }
      tools.push({
        type: "function",
        function: {
          name: tool.tool_name.replace(/[^a-zA-Z0-9_-]/g, '_'),
          description: tool.description || tool.tool_name,
          parameters: {
            type: "object",
            properties,
            required,
            additionalProperties: false,
          },
        },
      });
    }
  }

  // Fetch bot variables for context
  const { data: botVars } = await supabase
    .from("bot_variables")
    .select("var_name, default_value, description, scope")
    .eq("project_id", project.id);

  if (botVars && botVars.length > 0) {
    sysPrompt += "\n\nAvailable variables:\n";
    for (const v of botVars) {
      sysPrompt += `- ${v.var_name} (${v.scope}): ${v.description}${v.default_value ? ` [default: ${v.default_value}]` : ''}\n`;
    }
  }

  const messages = [
    { role: "system", content: sysPrompt },
    ...history,
    { role: "user", content: message },
  ];

  // Determine API key and call
  const apiKey = activeModel?.api_key || Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    throw new Error("No API key configured. Please add a model with an API key or contact support.");
  }

  // Credit management: use DevsFlow credits for platform-provided models only.
  // If the user provided their own API key for the active model, we don't charge credits.
  if (!activeModel?.api_key) {
    const provider = String(activeModel?.provider || "lovable_ai").toLowerCase();
    const creditType = provider === "groq" ? "groq" : "advanced";
    const { data: ok, error: creditErr } = await supabase.rpc("use_credit_typed", {
      p_user_id: (project as any).user_id,
      p_type: creditType,
    } as any);
    if (creditErr || !ok) {
      return creditType === "advanced"
        ? "No Advanced AI credits remaining. Please try again tomorrow or upgrade your plan."
        : "No AI credits remaining. Please try again tomorrow or upgrade your plan.";
    }
  }

  // Make the AI call
  const isUserProvider = activeModel?.api_key && (activeModel.provider as string)?.toLowerCase() !== 'lovable_ai';
  const apiUrl = isUserProvider ? getProviderUrl(activeModel.provider as string) : "https://ai.gateway.lovable.dev/v1/chat/completions";
  const authHeader = isUserProvider ? `Bearer ${activeModel.api_key}` : `Bearer ${apiKey}`;
  const modelName = activeModel?.model_name || "google/gemini-3-flash-preview";

  const requestBody: Record<string, unknown> = {
    model: modelName,
    messages,
  };

  // Always include tools (at minimum the built-in Wikipedia search)
  requestBody.tools = tools;
  requestBody.tool_choice = "auto";

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    if (response.status === 429) return "Rate limit reached. Please try again in a moment.";
    if (response.status === 402) return "Credits exhausted. Please add funds or try again later.";
    const errorText = await response.text();
    console.error("AI error:", response.status, errorText);
    throw new Error("AI service error");
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  
  // Handle tool calls
  if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
    const toolResults: Array<{ role: string; content: string; tool_call_id?: string }> = [];
    
    for (const toolCall of choice.message.tool_calls) {
      const fnName = toolCall.function.name;
      let fnArgs: Record<string, unknown> = {};
      try {
        fnArgs = JSON.parse(toolCall.function.arguments || "{}");
      } catch { /* ignore */ }

      // Handle built-in Wikipedia search
      if (fnName === "__builtin_wikipedia_search") {
        const wikiResult = await searchWikipedia((fnArgs.query as string) || message);
        toolResults.push({ role: "tool", content: wikiResult, tool_call_id: toolCall.id });
        continue;
      }

      // Find matching bot tool
      const matchedTool = botTools?.find(t => t.tool_name.replace(/[^a-zA-Z0-9_-]/g, '_') === fnName);
      if (!matchedTool) {
        toolResults.push({ role: "tool", content: JSON.stringify({ error: "Tool not found" }), tool_call_id: toolCall.id });
        continue;
      }

      // Execute the HTTP request
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...((matchedTool.headers as Record<string, string>) || {}),
        };

        // Build URL with query/path params
        let url = matchedTool.request_url;
        const bodyParams: Record<string, unknown> = { ...((matchedTool.body_template as Record<string, unknown>) || {}) };
        
        const params = matchedTool.bot_tool_parameters || [];
        for (const p of params) {
          const val = fnArgs[p.param_name] ?? p.default_value;
          if (p.location === 'query') {
            const sep = url.includes('?') ? '&' : '?';
            url += `${sep}${encodeURIComponent(p.param_name)}=${encodeURIComponent(String(val))}`;
          } else if (p.location === 'header') {
            headers[p.param_name] = String(val);
          } else {
            bodyParams[p.param_name] = val;
          }
        }

        const reqOptions: RequestInit = {
          method: matchedTool.http_method,
          headers,
        };
        if (matchedTool.http_method !== "GET") {
          reqOptions.body = JSON.stringify(bodyParams);
        }

        const toolResp = await fetch(url, reqOptions);
        const toolData = await toolResp.text();
        toolResults.push({ role: "tool", content: toolData.slice(0, 4000), tool_call_id: toolCall.id });
      } catch (err) {
        toolResults.push({ role: "tool", content: JSON.stringify({ error: String(err) }), tool_call_id: toolCall.id });
      }
    }

    // Second call with tool results
    const followUpMessages = [
      ...messages,
      choice.message,
      ...toolResults,
    ];

    const followUp = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: modelName, messages: followUpMessages }),
    });

    if (!followUp.ok) {
      const errorText = await followUp.text();
      console.error("Follow-up AI error:", errorText);
      return "I executed the tool but had trouble processing the result.";
    }

    const followUpData = await followUp.json();
    return followUpData.choices?.[0]?.message?.content || "I executed the requested action.";
  }

  return choice?.message?.content || "I couldn't generate a response.";
}

function getProviderUrl(provider: string): string {
  switch ((provider || "").toLowerCase()) {
    case "openai": return "https://api.openai.com/v1/chat/completions";
    case "groq": return "https://api.groq.com/openai/v1/chat/completions";
    default: return "https://api.openai.com/v1/chat/completions";
  }
}

async function callUserProvider(
  model: Record<string, unknown>,
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const provider = (model.provider as string).toLowerCase();

  if (provider === "lovable_ai") {
    const advancedApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!advancedApiKey) throw new Error("Advanced AI gateway key is not configured");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${advancedApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: model.model_name, messages }),
    });
    if (!response.ok) {
      if (response.status === 429) return "Rate limit reached. Please try again.";
      if (response.status === 402) return "Credits exhausted.";
      throw new Error("AI service error");
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "I couldn't generate a response.";
  }

  const apiUrl = getProviderUrl(provider);
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${model.api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: model.model_name, messages }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`${provider} API error:`, response.status, errorText);
    throw new Error(`${provider} API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "I couldn't generate a response.";
}

async function handleN8nMode(
  supabase: ReturnType<typeof createClient>,
  project: Record<string, unknown>,
  message: string,
  history: Array<{ role: string; content: string }>,
): Promise<string> {
  if (!project.webhook_url) {
    return "n8n webhook URL is not configured. Please set it in the chatbot builder.";
  }

  try {
    const { data: vars } = await supabase
      .from("bot_variables")
      .select("var_name, description, default_value, scope, bot_writable")
      .eq("project_id", project.id);

    const defaults: Record<string, unknown> = {};
    (vars || []).forEach((v: any) => {
      if (v.default_value != null && v.default_value !== "") defaults[v.var_name] = v.default_value;
    });

    const response = await fetch(project.webhook_url as string, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        history,
        bot_id: project.id,
        bot_name: project.bot_name,
        slug: (project as any).slug || null,
        variables: vars || [],
        variable_defaults: defaults,
        expected_response: {
          reply: "string (required)",
          set_vars: "object (optional) - only variables marked bot_writable should be set",
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`n8n webhook returned ${response.status}`);
    }

    const data = await response.json();
    return data.reply || data.response || data.output || data.message || JSON.stringify(data);
  } catch (error) {
    console.error("n8n webhook error:", error);
    return "Error connecting to the workflow. Please check your webhook URL.";
  }
}

async function handleAdvancedHttpMode(
  supabase: ReturnType<typeof createClient>,
  project: Record<string, unknown>,
  message: string
): Promise<string> {
  const { data: actions } = await supabase
    .from("custom_actions")
    .select("*")
    .eq("project_id", project.id)
    .eq("is_active", true);

  if (!actions || actions.length === 0) {
    return "No custom actions configured. Please add actions in the chatbot builder.";
  }

  const matchedAction = actions.find((action: Record<string, unknown>) => {
    const trigger = (action.trigger_condition as string).toLowerCase();
    return message.toLowerCase().includes(trigger);
  });

  if (!matchedAction) {
    return "I couldn't find a matching action for your request. Available triggers: " +
      actions.map((a: Record<string, unknown>) => a.trigger_condition).join(", ");
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((matchedAction.headers as Record<string, string>) || {}),
    };

    const reqBody = matchedAction.http_method !== "GET"
      ? JSON.stringify({
          ...(matchedAction.body_template as Record<string, unknown> || {}),
          message,
        })
      : undefined;

    const response = await fetch(matchedAction.request_url as string, {
      method: matchedAction.http_method as string,
      headers,
      body: reqBody,
    });

    const data = await response.json();
    return data.reply || data.response || data.result || JSON.stringify(data);
  } catch (error) {
    console.error("HTTP action error:", error);
    return "Error executing the action. Please check your configuration.";
  }
}
