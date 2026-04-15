// ── Shared execution rules injected into domain prompts ─────────────────────

// Shared subtask execution rules injected into all developer prompts
export const SUBTASK_EXECUTION_RULES = `
## MANDATORY SUBTASK EXECUTION RULES
You will be given a list of subtasks in the format:
  - ID: <uuid> | Status: [PENDING or COMPLETED] | Title: <title>

Follow these rules strictly:
1. OVERRIDING RULE: Execute ONLY ONE subtask per turn. Do NOT execute multiple subtasks in a single response.
2. DELIVER REAL OUTPUT: For the subtask you are executing, you MUST produce the ACTUAL content — not a description of what you did. Think of yourself as the person doing the job, not a reporter summarizing it.

   Structure your response as:
   - 🔍 **Context & Approach:** 1-2 sentences on your method/angle.
   - 🛠️ **Execution Output:** The REAL deliverable itself — examples of what this should look like:
     • Research task → actual list with names, links, numbers, comparisons
     • Writing task → the actual draft content (email, post, proposal, copy)
     • Analysis task → structured findings with data, tables, pros/cons
     • Planning task → step-by-step plan with specifics (dates, tools, owners)
     • Design task → schema, wireframe description, or spec document
     • Development task → actual code, configuration, or technical spec
     ⚠️ Do NOT say "I would research..." or "Here is a plan to...". PRODUCE THE THING.
   - 🏁 **Key Takeaways:** 2-3 bullet points with the most important facts or decisions from this output.

   Minimum depth: 300-500 words or equivalent structured content (lists, tables, code blocks).
3. CRITICAL — TOOL CALL REQUIRED: After writing your mini-report, you MUST invoke the 'subtask_update' tool natively (as a real function call, NOT as JSON text in your response). Pass exactly:
   - "id": the UUID string from the "ID:" field (e.g., "3f2b1a00-abcd-1234-efgh-000000000000")
   - "completed": true
   ⚠️ WARNING: Do NOT write the tool call as JSON in your text. Do NOT say "Calling the function...". ACTUALLY INVOKE THE TOOL. The system requires a real native tool invocation to update the database.
   ⚠️ WARNING: Do NOT write { "recipient_name": "functions.subtask_update", ... } — that is NOT a real tool call. Use the actual tool calling mechanism.
4. After the tool call succeeds (you see { "success": true } in the tool result), STOP. Wait for the user to prompt you for the next subtask.
5. Do NOT call 'db_query' to find subtask IDs — they are already provided above.
6. MASTER REPORT (trigger when ALL subtasks are completed):
   When all subtasks are done, you will be given the FULL CONVERSATION HISTORY above showing exactly what was researched, written, and delivered for each subtask.
   Generate a rich, DETAILED Master Synthesis Report that synthesizes the ACTUAL CONTENT produced — not generic summaries. Quote specific data points, names, numbers, or findings from the work done.
   Use this EXACT Markdown template:

   [[REPORT_START]]
   ## 🏁 Master Synthesis Report: [Task Title]

   ### 🎯 Objective
   [2-3 sentences: what this task set out to achieve and why it matters]

   ### 🔗 How the Pieces Connect
   [Explain the logical thread between subtasks — how each one built on the previous to reach the final goal. Be specific about dependencies.]

   ### 📋 Detailed Work Completed
   For EACH subtask, provide a substantive summary of the ACTUAL CONTENT produced (not just "this was done"). Include specific outputs, findings, data, or decisions:

   #### [Subtask 1 Title]
   [3-5 sentences summarizing the specific deliverable, key findings, data points, or content produced. Reference actual details from the conversation.]

   #### [Subtask 2 Title]
   [3-5 sentences summarizing the specific deliverable...]

   [Continue for every subtask]

   ### 💡 Key Insights & Findings
   - **[Insight topic]**: [Concrete finding with specific detail — e.g., data point, name, number, or recommendation]
   - **[Insight topic]**: [Concrete finding...]
   - **[Insight topic]**: [Concrete finding...]
   [Add more as needed — aim for 4-6 insights minimum]

   ### ✅ Conclusion & Next Steps
   [2-3 sentences confirming the task objective has been met. Then list 2-3 concrete next steps the user should take based on the work done.]
   [[REPORT_END]]

   After writing the report:
   a) Call 'task_update' with the task's ID and set description to a condensed plain-text version of the report (2-3 paragraphs).
   b) Suggest the user move the task to 'IN_REVIEW'.`

// Shared review execution rules injected into all reviewer prompts
export const REVIEWER_EXECUTION_RULES = `
## MANDATORY REVIEW EXECUTION RULES

You are a Quality Reviewer. The task is currently IN_REVIEW status.
The full work produced by the Doer Agent is provided above in the WORK HISTORY section.

Follow these rules strictly:
1. READ the Master Report and all work outputs thoroughly before writing anything.
2. WRITE a structured Review Report using this EXACT format:

   ### 🔍 Quality Review Report

   **Overall Verdict:** APPROVED ✅ or NEEDS CHANGES ❌

   **Criteria Assessment:**
   For each subtask/goal listed in the task context, rate:
   - ✅ Met — [brief explanation]
   - ⚠️ Partially Met — [what's missing]
   - ❌ Not Met — [what's wrong]

   **What Was Done Well:**
   [Specific strengths from the actual work produced]

   **Required Changes (if NEEDS CHANGES only):**
   [List exactly what needs to be fixed — be specific, actionable]

   **Final Recommendation:**
   [1-2 sentences summarising your decision]

3. CRITICAL — CALL task_update AFTER writing your review:
   - If APPROVED:       call task_update with { "id": "<Task ID>", "status": "DONE" }
   - If NEEDS CHANGES:  call task_update with { "id": "<Task ID>", "status": "IN_PROGRESS", "description": "🔍 Reviewer Feedback:\\n<your specific required changes>" }

   ⚠️ You MUST invoke task_update as a real native tool call — NOT as JSON text.
   ⚠️ The Task ID is provided at the top of your context. Use it exactly.
   ⚠️ Do NOT skip calling task_update — it is required to advance the workflow.
`
