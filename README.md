# Lemonade tutorial + test mock data pack

This pack contains **fictional mock data** for a context-first, board-anchored Kanban product.

It is designed for two uses:
1. **Lemonade tutorial / demo seed data** for mockups, POCs, and walkthroughs.
2. **Unit and functional test fixtures** for front-end, back-end, and QA automation.

## Product rules represented in this pack

- After project creation, **only the directory tree is unlocked**.
- Uploaded documents become **shared project context** for both human collaborators and AI agents.
- The **project planning** section unlocks when the user chooses to continue from context intake.
- The **Kanban board** unlocks only after the planner agent has enough context, produces a summary, and the user approves it.
- Generated tasks begin in **`todo`**.
- Task lifecycle: **`todo -> planning -> doing -> review -> done`**.
- Tasks may move to **`cancelled`** from any active state.
- **`cancelled` counts as closed** for project completion purposes.
- The project can be closed only when **all tasks are `done` or `cancelled`**.

## Directory structure

- `tutorial/`
  - `project_seed.json` – main tutorial seed payload
  - `planner_chat.json` – planner/user chat transcript
  - `board_snapshot_initial.json`
  - `board_snapshot_midway.json`
  - `board_snapshot_complete.json`
  - `documents/`
    - `weather_report.md`
    - `concert_news_article.md`
    - `supplier_contacts.csv`
    - `temp_workers.csv`
    - `lemonade_recipes.json`
    - `permits_checklist.md`
- `unit/`
  - `domain_entities.json` – sample entities and enums
  - `unit_test_fixtures.json` – rule-focused unit test cases
  - `api_mock_responses.json` – sample API payloads for UI wiring
- `functional/`
  - `scenarios.json` – structured functional test scenarios
  - `lemonade_e2e.feature` – Gherkin-style end-to-end scenarios
  - `test_case_matrix.csv` – concise scenario matrix

## Suggested import / usage order

1. Load `tutorial/project_seed.json`
2. Mount the documents under `tutorial/documents/`
3. Use `unit/api_mock_responses.json` to stub UI
4. Use `unit/unit_test_fixtures.json` for domain logic tests
5. Use `functional/scenarios.json` or `functional/lemonade_e2e.feature` for integration/E2E

## Notes

- All names, companies, phone numbers, and emails are fictional.
- Contact details use `example.com` or clearly fake number patterns.
- Dates are intentionally fixed so tests are deterministic.
