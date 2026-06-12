---
name: investor-pitch
description: "Build investor pitch decks by scanning the codebase, business docs, and VC evaluations. Creates slide-by-slide narrative with speaker notes. Use when asked to create a pitch deck, investor presentation, or fundraising materials."
---

# Investor Pitch Deck Generator

Scans the codebase, CLAUDE.md, and business documentation to build a compelling investor pitch deck. Outputs slide-by-slide markdown with headlines, body, visual suggestions, and speaker notes.

## Before Starting

Read these files to understand the business:

1. **CLAUDE.md** (root) -- product overview, architecture, team
2. **.planning/docs/business/PRICING_RESEARCH.md** -- pricing, revenue model, unit economics
3. **.planning/docs/business/COMPETITIVE_GAP_ANALYSIS.md** -- competitors, market position
4. **.planning/docs/minimalist-entrepreneur/** -- all ME journey docs + VC evaluations
5. **apps/landing/src/i18n/messages/en.json** -- current positioning and messaging

If any of these don't exist, ask the user for the information.

## Arguments

- No args: full investor deck (12 slides)
- `--sales`: sales deck instead (8 slides)
- `--short`: 5-slide overview (for email attachments)
- `--yc`: YC application format (2-minute pitch)
- `--sequoia`: Sequoia memo format (narrative, not slides)
- `--update`: quarterly investor update (not a pitch)

## Deck Structure (Investor Deck -- 12 Slides)

### Slide 1: Title
- Company name + one-line positioning
- NOT "we're a platform that..." -- the INSIGHT
- Example: "The community platform that actually has a marketplace"

### Slide 2: Problem
- Lead with the customer's pain, not market stats
- Specific: "Organizations stitch together 5-7 tools..."
- Show the cost of the status quo ($$$ and time)

### Slide 3: Solution
- What you built. One sentence.
- Show don't tell: screenshot or demo link
- The "aha" moment for the audience

### Slide 4: Why Now?
- Sequoia's #1 question. Three structural shifts:
  1. What changed technologically?
  2. What changed in buyer behavior?
  3. What changed in the competitive landscape?
- Each shift should be recent (last 2-3 years)

### Slide 5: Market Size (Bottom-Up)
- NEVER lead with top-down TAM
- Bottom-up: how many target customers x price = SAM
- Show the math. Investors respect bottoms-up.
- Include segment breakdown (associations, cooperatives, chambers, etc.)

### Slide 6: Product
- Features that differentiate, not feature dump
- Only show what competitors CAN'T do
- Screenshot or demo video link
- "Our members can sell to each other" > "multi-vendor marketplace"

### Slide 7: Traction
- The most important slide. Investors look here first.
- Metrics: customers, revenue, growth rate, retention
- If early: show progress velocity (built X in Y months)
- Be honest. 2 customers is fine if the product is real.

### Slide 8: Business Model
- How you make money (pricing tiers)
- Unit economics (CAC, LTV, margins)
- Revenue composition (current, not projected)
- The commission alignment story ("we earn when they earn")

### Slide 9: Competition
- Feature matrix showing YOUR unique advantages
- Don't bash competitors -- acknowledge strengths
- Position: "They do X well. Nobody does X + Y + Z. We do."
- Name competitors by name (Circle, Mighty, Skool, Hivebrite)

### Slide 10: Go-to-Market
- How you acquire customers today
- Which channels you'll scale
- Vertical strategy: which niche first, then expand
- Sales motion: self-serve, sales-assisted, or enterprise?

### Slide 11: Team
- Why THIS team can win
- Relevant experience, not resume dump
- The "unfair advantage" of the team
- For solo founders: the AI-agent story IS the team slide

### Slide 12: The Ask
- How much you're raising
- What you'll do with the money (specific milestones)
- Expected runway
- What the company looks like after the raise (customers, revenue)

## Writing Rules

### Headlines
Every slide headline is an INSIGHT, not a label:
- BAD: "Market Size"
- GOOD: "125,000 organizations need community + commerce. Nobody serves them."
- BAD: "Team"
- GOOD: "One founder + AI agents built what funded teams couldn't"

### Body
- 3-5 bullet points max per slide
- Under 30 words per slide body
- Numbers > adjectives ("2 paying customers" > "growing customer base")
- Specific > vague ("mining and agriculture" > "multiple verticals")

### Speaker Notes
- What to SAY, not what's on the slide
- Include objection handling for each slide
- Include the "if they ask..." follow-up data
- Natural language, not bullet points

### VC-Specific Framing (from evaluations)

When building for specific VCs, adjust emphasis:

| VC | Lead With | Emphasize |
|----|-----------|-----------|
| YC | Traction, speed, founder | "Make something people want" |
| Sequoia | Why Now?, market structure | Bottom-up TAM, contrarian insight |
| a16z | Platform effects, AI-native | Network effects, software eating world |
| Kaszek | LATAM impact, capital efficiency | MercadoPago, cooperatives, profitability |
| European | GDPR, grants, sustainability | EU market, Vinnova, capital discipline |
| Angels | Founder conviction, downside risk | Profitable, default alive, low risk |
| Founders Fund | Zero-to-one, contrarian | "What truth do few agree with?" |

## Output Format

```markdown
# [Company] Investor Pitch Deck

**Version:** [date]
**Stage:** [Pre-seed/Seed/Series A]
**Ask:** [amount]

---

## Slide 1: [Title]
**Headline:** [Insight headline]
**Body:**
- [point]
- [point]
**Visual:** [suggestion]
**Speaker Notes:** [what to say]

## Slide 2: [Problem]
...

[Continue for all slides]

---

## Appendix Slides (If Asked)

### A1: Detailed Financial Model
### A2: Customer Case Studies
### A3: Technical Architecture
### A4: Competitive Deep Dive
### A5: Team Bios
```

## Quality Checklist

Before delivering:
- [ ] Every headline tells a story (not a label)
- [ ] One idea per slide
- [ ] Under 30 words per slide body
- [ ] Traction slide uses ACTUAL numbers (not projections)
- [ ] Market size is bottom-up (not top-down TAM)
- [ ] "Why Now?" answers Sequoia's question with structural shifts
- [ ] Competition slide is honest (acknowledges competitor strengths)
- [ ] Ask slide has specific milestones, not vague "growth"
- [ ] Speaker notes include objection handling
- [ ] No fictional metrics (targets clearly labeled as targets)
