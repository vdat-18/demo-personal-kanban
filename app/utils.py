"""Utility functions for data formatting and processing."""


def format_project_report_markdown(report_data: dict) -> str:
    """
    Converts a structured project report dictionary into a Markdown string
    suitable for display in the React frontend.
    """
    # Prepare parts before f-string to avoid backslash error in Python < 3.12
    scope_str = "\n".join(f"- {s}" for s in report_data["scope"])
    constraints_str = "\n".join(f"- {c}" for c in report_data["constraints"])
    tasks_str = "\n".join(f"- {t}" for t in report_data["suggested_tasks"])

    # Convert ProjectReport JSON to markdown for the React frontend
    return f"""# {report_data["title"]}

## Goal
{report_data["goal"]}

## Scope of Work
{scope_str}

## Constraints
{constraints_str}

## Suggested Next Steps
{tasks_str}
"""
