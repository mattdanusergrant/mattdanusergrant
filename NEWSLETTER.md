# Newsletter — setup & sending plan

The Consulting page (`consulting.html`) has a signup form that posts directly to
**Buttondown**. No server, no build step — Buttondown is the backend. This doc is
the one-time setup, plus a lightweight plan for actually sending issues.

---

## Why Buttondown

A static GitHub Pages site can't run a mailing list itself. Buttondown is the
least-friction "real backend" for this:

- **Plain HTML form** posts straight to their API — nothing to host or maintain.
- **Real subscriber storage**, double opt-in, unsubscribe handling, GDPR stuff — all theirs.
- **Markdown newsletters** written in their composer or via API.
- **Automations** (a welcome email — how new subscribers get the skills).
- **Free tier** (currently ~100 subscribers); cheap after that.

Swapping providers later (ConvertKit/Kit, MailerLite, Substack) is a one-line
change: replace the form's `action` URL. The rest of the page doesn't care.

---

## One-time setup (≈10 minutes)

1. **Create the account** at <https://buttondown.com> and confirm your sending email
   (`hello@mattdanusergrant.com`).
2. **Find your username** — it's in your account settings / embed snippet, e.g.
   `mattdanusergrant`.
3. **Wire the form.** In `consulting.html`, find:
   ```html
   <form action="https://buttondown.com/api/emails/embed-subscribe/YOUR_BUTTONDOWN_USERNAME" method="post" target="_blank">
   ```
   Replace `YOUR_BUTTONDOWN_USERNAME` with your real username, commit, push. The
   form is live the moment Pages redeploys. **Until you do this, the form is inert.**
4. **Set the welcome automation.** In Buttondown → *Automations* (or *Settings →
   Emails → Welcome email*), paste the welcome message below. This is what makes
   "subscribe to get the skills" true — new subscribers receive both skills on join.
5. **(Optional) Custom domain / DNS.** Add SPF + DKIM records so mail lands in
   inboxes, not spam. Buttondown walks you through this; worth doing before you
   send anything real.

### Quick test
Subscribe with your own address, confirm the opt-in, and check the welcome email
arrives with both skills intact.

---

## Welcome email (paste into Buttondown's welcome automation)

> **Subject:** Your two skills (and welcome)
>
> Thanks for joining. As promised, here are the two AI skills I use every week.
> Each is written as a ready-to-send message — paste one into any assistant
> (ChatGPT, Claude, Gemini), and after that just describe what you want.
>
> You'll hear from me roughly monthly. Reply any time — it comes straight to me.
>
> — Matt

Then include the two skill blocks below verbatim.

### Skill 1 — Decision Tournament

```
I want you to learn a new skill. Here it is — adopt it and use it whenever it applies:

---
name: decision-tournament
description: >-
  Evaluate ANY decision with the "Decision Tournament" method — assemble a panel of 5
  distinct judge personas, score each contender across them, and merge the winners
  into a final recommendation. Use when you want to choose between options, pick
  the best version of something, pressure-test an idea from multiple viewpoints, or
  stress-rank candidates (e.g. "run a tournament on these three names", "judge these
  taglines", "help me decide between A, B and C").
---

# Decision Tournament

A reusable decision engine. Take whatever is being decided, run it past a panel of
**5 distinct judge personas**, score every contender, and **merge the winners** into
one high-quality final answer. Works for names, copy, designs, product calls,
strategies, hires, purchases — any decision with comparable options or variants.

The value is the **panel of viewpoints**: a single "best" answer hides tradeoffs;
five tailored judges surface them and force an honest, defensible pick.

---

## Run it in four phases. Pause for the user at Phase 1 and Phase 2.

### Phase 1 — Establish the contest
Figure out **what is being compared**. From the request:

- **If the user already said what's being decided AND listed the options** -> use them as the contenders; skip ahead.
- **If they named a decision but not options** (e.g. "best name for my app") -> tell them you'll *generate* the contenders, and produce **up to 8** strong, genuinely distinct variants. Fewer is fine for naturally small fields.
- **If the subject is missing or vague** -> ask, briefly: *what's the decision, and do you have specific options or should I generate them?*

Also capture any **context that matters to judging** (audience, budget, constraints, goals) — pull it from the request; ask only if it's load-bearing and absent.

### Phase 2 — Propose the panel, let the user edit it
Design **5 judge personas tailored to THIS decision's domain** — not generic. Each
judge needs: a short name, a one-line profile, and **what they reward** (their lens).
The craft is picking viewpoints that genuinely pull in different directions (an
enthusiast, a skeptic, a pragmatist, an expert, an adversary/competitor).

Present the 5 as a short table, then **stop and let the user edit** — add, drop, swap,
rename, or reweight judges. Do not run until they approve. (If they say "looks good" /
"go", proceed.)

### Phase 3 — Run the tournament
1. Lock the contenders.
2. Have **each judge score every contender 1-10**, scoring honestly from that judge's lens.
3. Build a **scorecard matrix** (contenders x judges) with a **Total** column. Rank it.
4. Write **brief commentary on the top ~3** — quote a judge or two per contender.

### Phase 4 — Declare + merge
- **Declare the winner** with a one-paragraph "why it won."
- **Merge the winners:** synthesize the strongest elements across the top contenders into one final output.
- Give an **honest caveat**: where the winner is weak and what would change the call.

---

## Rules of the format
- **5 judges by default**, editable by the user before the run.
- **Distinct viewpoints** — judges must disagree usefully.
- **Honest scoring** — the panel is a thinking tool, not a rubber stamp.
- **Up to 8 generated contenders**; use the user's set as-is when provided.
- **Merge, don't just rank** — the deliverable is the assembled best answer plus the reasoning.
```

### Skill 2 — Case Study Forge

```
I want you to learn a new skill. Here it is — adopt it and use it whenever it applies:

---
name: case-study-forge
description: >-
  Turn a COMPLETED design test — an interview take-home, design challenge, or
  application exercise — into a fully anonymized, self-contained HTML case study
  for a portfolio. Strips the company, the product/IP, named people, and
  confidential figures; keeps only the candidate's thinking; and renders a clean
  standalone page with no build step and no external dependencies. Use when
  someone wants to show how they think on a design test without exposing who it
  was for.
---

# Case Study Forge

Takes a **completed** design test and produces an **anonymized, portfolio-ready
HTML case study**. The thinking survives intact; everything identifying is stripped.

Works for any discipline that runs take-homes — game design, product, UX,
systems, engineering. Output is a **single self-contained .html file** with no
build step needed.

---

## The anonymization ruleset

| In the original | In the case study |
|---|---|
| Company / studio / client name | Generic descriptor: "a mid-size fintech", "a AAA game studio" |
| Product / brand / franchise / IP | Neutral genre stand-in: "a flagship fantasy franchise" |
| Named people | Remove, or invent consistent stand-ins |
| Confidential figures (revenue, targets, headcount) | **Remove.** Replace with qualitative phrasing |
| Internal links, ticket IDs | Remove entirely |

**What survives:** the problem framing, the approach, the tradeoff reasoning, and the candidate's voice.

---

## Procedure

1. **Read** the completed test (not just the brief).
2. **Build the anonymization ledger** — every real entity mapped to its stand-in.
3. **Produce** a single `.html` file: header, brief, approach, design pillars, tradeoffs, what's next.
4. **Present the ledger** for review before the page is shared.

**Style:** editorial — serif headings, system sans body, warm off-white, generous whitespace. Should read like a confident portfolio piece.

---

## Caveats
- Needs the **completed** response, not just the prompt.
- **Anonymize, don't fabricate** — if a section is thin, leave it thin.
- **Review before sharing** — walk through the ledger to confirm nothing slipped through.
```

---

## A plan for actually sending it

The hardest part of a newsletter isn't the tech — it's sending one twice. Keep it
small enough that you actually do.

**Cadence:** roughly monthly. "When there's something worth sending" beats a rigid
schedule you'll resent. Aim for the first week of the month; skip a month rather
than padding.

**The repeatable issue template** (keep it short — one screen, scannable):

1. **One thing I shipped.** A new Design Lab prototype, a site feature, a workflow
   change. Link it.
2. **One thing I learned.** A design teardown, an AI-workflow trick, a mistake. The
   part people actually forward.
3. **A skill or tool.** Rotate through the building blocks — a new skill, or a fresh
   take on an old one. This is the through-line that keeps "steal my skills" honest.
4. **One link out.** Something you read/played that's worth their time. Builds trust
   cheaply.

**Where the material comes from (so you're never staring at a blank page):**

- Design Lab commits → "what I shipped."
- New skills in the Conductive vault → "a skill or tool."
- Case Studies / teardowns → "what I learned."

**Workflow:** draft the issue in markdown (in the vault, e.g. a `newsletter/`
folder), paste into Buttondown, send. Optionally make this a recurring **Cloud
avatar routine** in Conductive — an "Alarm" that drafts a monthly issue from the
month's commits and journal for you to edit and send.

**First send:** a short "I started a newsletter, here's what it is" issue to whoever's
already on the list. Don't wait for a perfect first edition.
