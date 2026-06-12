---
name: roundtable
description: |
  Run a structured multi-agent roundtable to solve a challenge.
  Orchestrates Claude, ChatGPT (via API), and Gemini (via API) with distinct roles.
  Maximizes creative divergence first, then converges without collapsing novelty.
  Use when facing complex decisions, architecture choices, or strategic problems.
  Requires: Task tool, OPENAI_API_KEY and GOOGLE_AI_API_KEY environment variables.
---

# Multi-Agent Roundtable (Coordinator Instructions)

You are the **COORDINATOR** for a roundtable discussion. Your job is to:
1. Parse the user's request
2. Delegate the ENTIRE roundtable to a specialized subagent
3. Present the final output to the user

**CRITICAL: You must NOT execute the roundtable yourself. Spawn a subagent to keep your context clean.**

## Arguments Provided

$ARGUMENTS

## Step 1: Parse Arguments

**If arguments provided above:**
- Extract the **Challenge** from the argument text
- Infer **Constraints** from conversation context and codebase knowledge
- Infer **Context** from the current repo/project
- Default **Output mode** to `portfolio` unless specified (e.g., `--mode=decision`)

**If no arguments (empty or blank):**
- Ask the user for Challenge, Constraints, Context, and Output mode using AskUserQuestion

**Parsing hints:**
- `/do-roundtable How should we architect checkout?` → Challenge = "How should we architect checkout?"
- `/do-roundtable checkout architecture --mode=decision` → Challenge = "checkout architecture", Mode = decision
- `/do-roundtable` → Interactive mode, ask for inputs

## Step 2: Gather Context (Quick)

Before spawning the subagent, quickly gather essential context:
- Read CLAUDE.md if not already in context
- Read AGENT_HANDOVER.md if relevant
- Note any relevant conversation history

## Step 3: Spawn Roundtable Orchestrator Subagent

**MANDATORY: Use the Task tool to spawn a general-purpose subagent that will handle the entire roundtable.**

```yaml
Tool: Task
Parameters:
  subagent_type: "general-purpose"
  description: "Execute roundtable discussion"
  prompt: |
    # Roundtable Orchestrator

    You are the **MEDIATOR** in a structured roundtable discussion between multiple AI agents.
    Execute the full roundtable process and return ONLY the final synthesized output.

    ## Challenge
    [INSERT CHALLENGE HERE]

    ## Constraints
    [INSERT CONSTRAINTS HERE]

    ## Context
    [INSERT CONTEXT HERE]

    ## Output Mode
    [INSERT MODE: decision | portfolio | exploration]

    ## Your Mission

    Execute ALL phases of the roundtable internally:
    1. Role Assignment
    2. Independent Generation (parallel via API calls)
    3. Signal Weighting
    4. Cross-Examination
    5. Synthesis
    6. Resolution

    Return ONLY the final output document. Do NOT include intermediate steps, scores, or raw agent responses.

    ---

    ## DETAILED EXECUTION INSTRUCTIONS

    ### Agents Available

    | Agent | Method | Best For |
    |-------|--------|----------|
    | Claude | Task (subagent) | Technical depth, codebase-aware |
    | ChatGPT | OpenAI API (curl) | Broad knowledge, creative |
    | Gemini | Google AI API (curl) | Research, alternative perspective |

    ### API Configuration

    **Required Environment Variables (in root `.env` file):**
    - `OPENAI_API_KEY` - For ChatGPT API calls
    - `GEMINI_API_KEY` - For Gemini API calls

    **Load and check availability first:**
    ```bash
    export OPENAI_API_KEY=$(grep '^OPENAI_API_KEY=' .env | cut -d'=' -f2 | tr -d '"') && \
    export GEMINI_API_KEY=$(grep '^GEMINI_API_KEY=' .env | cut -d'=' -f2 | tr -d '"') && \
    echo "OpenAI: ${OPENAI_API_KEY:+configured}" && echo "Gemini: ${GEMINI_API_KEY:+configured}"
    ```

    If keys are missing, fall back to using 3 Claude subagents with different personas.

    ### Orchestration Rules

    1. **Agents must not see each other's responses until debate phase**
    2. **Each agent gets ONE distinct role** (no overlap)
    3. **No majority voting** - quality over consensus
    4. **Outliers preserved** if justified with evidence
    5. **Max 3 rounds** - terminate on convergence or timeout

    ---

    ### Phase 1 — Role Assignment

    Assign each agent ONE role based on the challenge:

    | Role | Focus | Typical Assignment |
    |------|-------|-------------------|
    | **Explorer** | Novel ideas, non-obvious angles, "what if" | Gemini |
    | **Realist** | Constraints, feasibility, risks, blockers | Claude (codebase-aware) |
    | **Optimizer** | Performance, cost, scalability, efficiency | ChatGPT |
    | **Challenger** | Attack assumptions, edge cases, failure modes | Rotate |

    **Role assignment prompt template:**
    ```
    You are the [ROLE] in a roundtable discussion.

    Your focus: [ROLE DESCRIPTION]

    Challenge: [CHALLENGE]
    Constraints: [CONSTRAINTS]
    Context: [CONTEXT]

    Provide your analysis with this structure:
    1. THESIS (1 sentence - your core position)
    2. CORE IDEA (2-3 paragraphs - your proposed approach)
    3. ASSUMPTIONS (bullet list - what must be true)
    4. RISKS (bullet list - what could go wrong)
    5. BLIND SPOTS (what others might miss that you see)

    Be opinionated. Take a clear stance. Do not hedge.
    ```

    ### Phase 2 — Independent Generation (PARALLEL API CALLS)

    Execute all three agents in parallel using the Bash tool.

    #### Agent 1: Claude (Realist) - Use Task tool
    ```yaml
    Tool: Task
    Parameters:
      subagent_type: "general-purpose"
      model: "haiku"
      prompt: |
        You are the REALIST in a roundtable discussion.
        [Full prompt with challenge, constraints, context]
    ```

    #### Agent 2: ChatGPT (Optimizer) - OpenAI API
    ```yaml
    Tool: Bash
    Parameters:
      command: |
        export OPENAI_API_KEY=$(grep '^OPENAI_API_KEY=' .env | cut -d'=' -f2 | tr -d '"') && \
        curl -s https://api.openai.com/v1/chat/completions \
          -H "Authorization: Bearer $OPENAI_API_KEY" \
          -H "Content-Type: application/json" \
          -d '{
            "model": "gpt-4o",
            "messages": [
              {
                "role": "system",
                "content": "You are the OPTIMIZER in a roundtable discussion. Focus on performance, cost, scalability, and efficiency."
              },
              {
                "role": "user",
                "content": "[FULL PROMPT WITH CHALLENGE, CONSTRAINTS, CONTEXT]"
              }
            ],
            "temperature": 0.7,
            "max_tokens": 2000
          }' | jq -r '.choices[0].message.content'
    ```

    #### Agent 3: Gemini (Explorer) - Google AI API
    ```yaml
    Tool: Bash
    Parameters:
      command: |
        export GEMINI_API_KEY=$(grep '^GEMINI_API_KEY=' .env | cut -d'=' -f2 | tr -d '"') && \
        curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=$GEMINI_API_KEY" \
          -H "Content-Type: application/json" \
          -d '{
            "contents": [{
              "parts": [{
                "text": "You are the EXPLORER in a roundtable discussion. Focus on novel ideas, non-obvious angles, and creative what-if scenarios.\n\n[FULL PROMPT WITH CHALLENGE, CONSTRAINTS, CONTEXT]"
              }]
            }],
            "generationConfig": {
              "temperature": 0.8,
              "maxOutputTokens": 8000
            }
          }' | jq -r '.candidates[0].content.parts[0].text'
    ```

    **IMPORTANT: Run all 3 API calls in parallel (single message with multiple Bash tool calls).**

    #### Fallback: Claude-Only Mode

    If API keys are not available, use 3 Claude subagents with distinct personas:
    - **Claude-Explorer**: "Think divergently, prioritize novel and unconventional ideas"
    - **Claude-Realist**: "Be skeptical, focus on constraints, risks, and practical blockers"
    - **Claude-Optimizer**: "Maximize efficiency, minimize complexity, focus on performance"

    ### Phase 3 — Signal Weighting (Internal)

    Score each proposal:

    | Criteria | Weight | 1-5 Scale |
    |----------|--------|-----------|
    | **Novelty** | 20% | How original? |
    | **Feasibility** | 30% | Can we build this? |
    | **Impact** | 30% | Value if it works? |
    | **Risk** | 20% | Downside? Reversible? |

    ### Phase 4 — Cross-Examination (Bounded)

    Each agent critiques ONE other proposal (use same API method as Phase 2):
    - Claude critiques → ChatGPT's proposal
    - ChatGPT critiques → Gemini's proposal
    - Gemini critiques → Claude's proposal

    **Cross-examination prompt:**
    ```
    Another agent proposed the following approach:

    THESIS: [Their thesis]
    APPROACH: [Their core idea]
    ASSUMPTIONS: [Their assumptions]

    Your task:
    1. Identify the STRONGEST aspect of this proposal
    2. Identify the WEAKEST aspect (be specific)
    3. Propose ONE constructive improvement or hybrid idea
    4. State what you would STEAL from this for your own approach

    Do not repeat criticisms. Be constructive.
    ```

    ### Phase 5 — Synthesis (Internal)

    **Step 1: Cluster by approach**
    **Step 2: Generate options**
    **Step 3: Evaluate against constraints**

    ### Phase 6 — Resolution

    Produce the final output based on **Output mode**:

    ---

    #### Mode: `decision`

    ```markdown
    ## Roundtable Decision

    ### Challenge
    [Original challenge]

    ### Recommended Approach
    **[Option name]**

    [2-3 sentence description]

    ### Why This Option
    - [Reason 1]
    - [Reason 2]
    - [Reason 3]

    ### Key Risk
    [Single biggest risk and mitigation]

    ### Fallback
    If [condition], pivot to [alternative approach]

    ### Dissenting View
    [Preserved outlier perspective, if valuable]

    ### Next Actions
    1. [Immediate step]
    2. [Validation step]
    3. [First milestone]
    ```

    ---

    #### Mode: `portfolio`

    ```markdown
    ## Roundtable Portfolio

    ### Challenge
    [Original challenge]

    ### Options to Pursue

    #### Option 1: [Name] ⭐ Primary
    [Description]
    - **Effort:** [Low/Medium/High]
    - **Risk:** [Low/Medium/High]
    - **Upside:** [Description]
    - **Start with:** [First action]

    #### Option 2: [Name]
    [Description]
    - **Effort:** [Low/Medium/High]
    - **Risk:** [Low/Medium/High]
    - **Upside:** [Description]
    - **Start with:** [First action]

    #### Option 3: [Name] (Experimental)
    [Description]
    - **Effort:** [Low/Medium/High]
    - **Risk:** [Low/Medium/High]
    - **Upside:** [Description]
    - **Start with:** [First action]

    ### Hybrid Potential
    [How options could combine]

    ### Decision Criteria
    When to pick each:
    - Option 1 if: [condition]
    - Option 2 if: [condition]
    - Option 3 if: [condition]

    ### Next Actions
    1. [Parallel track 1]
    2. [Parallel track 2]
    3. [Decision point milestone]
    ```

    ---

    #### Mode: `exploration`

    ```markdown
    ## Roundtable Exploration

    ### Challenge
    [Original challenge]

    ### Solution Space Map

    #### Approach Category A: [Name]
    [Description of this family of solutions]
    - Variant 1: [Description]
    - Variant 2: [Description]
    - Key tradeoff: [What you give up]

    #### Approach Category B: [Name]
    [Description]
    - Variant 1: [Description]
    - Variant 2: [Description]
    - Key tradeoff: [What you give up]

    #### Approach Category C: [Name]
    [Description]
    - Variant 1: [Description]
    - Variant 2: [Description]
    - Key tradeoff: [What you give up]

    ### Frontier Ideas (High Novelty)
    - [Idea 1]: [Why interesting, why risky]
    - [Idea 2]: [Why interesting, why risky]

    ### Key Uncertainties
    - [Uncertainty 1]: Resolves toward [A or B]
    - [Uncertainty 2]: Resolves toward [C or D]

    ### Recommended Exploration Path
    1. [What to validate first]
    2. [What to prototype]
    3. [Decision point]

    ### What We Learned
    [Synthesis of key insights from the roundtable]
    ```

    ---

    ## IMPORTANT: Output Requirements

    **Return ONLY the final formatted output document.**

    Do NOT include:
    - Raw agent responses
    - Intermediate scoring tables
    - Phase-by-phase logs
    - Your internal reasoning

    The coordinator will present your output directly to the user.
```

## Step 4: Present Results

When the subagent returns, present the final output to the user directly.

**DO NOT:**
- Summarize or re-process the output
- Add your own commentary (unless asked)
- Show any intermediate context

**DO:**
- Present the roundtable output as-is
- Offer to clarify or dive deeper if the user asks

---

## Example Execution Flow

```
User: /do-roundtable How should we architect the checkout flow?

You (Coordinator):
1. Parse: Challenge = "How should we architect the checkout flow?", Mode = portfolio
2. Gather: Read CLAUDE.md context, note it's a multi-tenant commerce platform
3. Spawn: Task(subagent_type="general-purpose", prompt="[Full roundtable instructions]")
4. Wait: Subagent executes all 6 phases internally (using API calls, not browser)
5. Present: Display the returned Roundtable Portfolio document

Your context remains clean. The roundtable work happened in the subagent.
```

---

## Setup Requirements

### Environment Variables

Add these to the root `.env` file:

```bash
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
```

### Fallback Behavior

If API keys are not set, the roundtable will automatically fall back to using 3 Claude subagents with different personas (Explorer, Realist, Optimizer). This still provides diverse perspectives without external API dependencies.

---

## Why This Architecture

| Benefit | Explanation |
|---------|-------------|
| **Fast execution** | Direct API calls instead of browser automation |
| **Reliable** | No DOM scraping or UI changes to break |
| **Parallel** | All 3 agents queried simultaneously |
| **Graceful fallback** | Works without external APIs using Claude personas |
| **Clean coordinator context** | All intermediate roundtable data stays in subagent |
| **High quality** | Uses gpt-4o and gemini-3-pro-preview for best results |
