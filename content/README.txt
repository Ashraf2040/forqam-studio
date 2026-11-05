Daily content folder (optional). The Studio screen's "Get today's content" reads this folder through /content/*.
  index.json                  {"days": ["2026-10-27"]}
  <day>/pack.json             {"packs": [...], "decks": [{"id": "x", "name": "Lesson", "file": "lesson.pptx"}]}
  <day>/lesson.pptx           the files listed in "decks"
It starts empty (no days). You can also set CONTENT_PROXY_BASE in .env to read the same layout from a web folder.
