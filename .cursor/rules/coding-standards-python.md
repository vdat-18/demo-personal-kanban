# Coding Standards — Python

> Personal Python coding standards for AI-assisted development.
> All AI tools (Kilo Code, Cursor, Claude, Windsurf, etc.) must follow these rules when generating or modifying Python code.

---

## Formatting

- Use **ruff** for formatting and linting (configured in `pyproject.toml`)
- Line length: **120**
- Target Python version: **3.11+**
- Import order: stdlib → third-party → local (enforced by ruff `I` rules)

---

## Documentation

- **Concise docstring** at the top of every file, every `class`, and every `def`
- Prefer **one-liner style** when the intent is clear:
  ```python
  """Parse raw input and return a validated Project model."""
  ```
- Do NOT repeat type hints already declared in the signature:
  ```python
  # ❌ Bad
  def get_user(user_id: str) -> User:
      """Get user by ID.

      Args:
          user_id (str): The user ID.
      Returns:
          User: The user object.
      """

  # ✅ Good
  def get_user(user_id: str) -> User:
      """Fetch and return a user by ID, raising 404 if not found."""
  ```

---

## Type Hints

- **All** function signatures must have type hints (parameters + return type)
- Use `X | None` over `Optional[X]` (Python 3.10+ union syntax)
- Use `list[X]` / `dict[K, V]` over `List[X]` / `Dict[K, V]`

---

## Error Handling

- **Do NOT** use `try/except` as a silent fallback:
  ```python
  # ❌ Bad — hides bugs
  try:
      result = process(data)
  except Exception:
      result = None

  # ✅ Good — let it propagate or handle specifically
  result = process(data)
  ```
- Only catch exceptions when you have an **explicit, intentional recovery strategy**
- Use **narrow** except clauses: `except ValueError` not `except Exception`
- If you must suppress, log it first:
  ```python
  except ValueError as e:
      logger.warning(f"Skipping invalid entry: {e}")
  ```

---

## Logging

- Use **loguru** exclusively — never `print()` or stdlib `logging`
- Import pattern: `from loguru import logger`
- Log levels:
  - `logger.debug()` — detailed internals, off in production
  - `logger.info()` — key lifecycle events
  - `logger.warning()` — unexpected but recoverable state
  - `logger.error()` — failures that affect correctness
- Include context in messages: `logger.info(f"Project {project_id} canvas synced")`

---

## General

- No unused imports — ruff will catch these (`F401`)
- No magic numbers — use named constants or config values
- Prefer **explicit** over implicit
- Keep functions small and single-purpose
- Avoid mutable default arguments: `def f(items: list | None = None)`

