"""Entrypoint for the Agno service."""

import uvicorn

from src.config import HOST, PORT


def main():
    uvicorn.run("src.app:app", host=HOST, port=PORT, reload=True)


if __name__ == "__main__":
    main()
