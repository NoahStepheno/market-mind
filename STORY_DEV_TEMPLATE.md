STORY_ID = 2-4

Create an agent team to run my BMAD pipeline for story ${STORY_ID}.
Each step MUST run in its own teammate (fresh context) and execute
strictly in sequence — do not start the next step until the previous
one completes successfully. If any step fails, stop the entire pipeline
immediately and report which step failed and why.

The pipeline steps with strict dependencies:

Step 1: /bmad-bmm-create-story ${STORY_ID} yolo
→ Creates the story definition. No dependencies.

Step 2: /bmad-tea-testarch-atdd ${STORY_ID} yolo  
 → Generates ATDD test architecture. Depends on Step 1.

Step 3: /bmad-bmm-dev-story ${STORY_ID} yolo
→ Develops the story implementation. Depends on Step 2.

Step 4: /bmad-bmm-code-review ${STORY_ID} yolo, auto accept and fix all the issues
→ Runs code review on the implementation. Depends on Step 3.

Step 5: /bmad-tea-testarch-trace ${STORY_ID} yolo
→ Traces test architecture coverage. Depends on Step 4.

Rules:

- Spawn ONE teammate per step, only after the previous step completes.
- Each teammate runs its slash command with "yolo" mode (auto-approve).
- Do NOT run any steps in parallel.
- Act as coordinator only (delegate mode) — do not execute steps yourself.
- After each step completes, confirm success before spawning the next teammate.
- On failure: report the failed step, the error, and stop. Do not continue.
- After all 5 steps complete, provide a summary of the full pipeline run.
