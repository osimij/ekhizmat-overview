# eKhizmat — instructions for AI agents

## One design contract

Before any UI/UX work — building or changing pages, styling, "polish", de-cluttering, design review — read [docs/design-guide.md](docs/design-guide.md) and follow it. It is the canonical design contract for every platform; `admin/services.html` is the reference implementation to compare against.

Definition of done for UI changes: `npm run lint:design-system` and `npm test` pass, plus the §11 verification review in the guide.

## Git: never commit `spatial/`

`spatial/` is the user's separate repository (the WebGL blur editor, github.com/osimij/spatial), checked out here only so `npm run art:hero` can read `spatial/dist`. **Never stage or commit it**: not its files, not a new submodule pointer, whatever the request says ("commit everything", "the current state of the project"). `.gitmodules` sets `ignore = all` so `git status` and `git diff` stay quiet about it; that is not permission to add it.

- Stage explicit paths (`git add <files>` or `git add --pathspec-from-file=<list>`), never `git add -A`, `git add .` or `git commit -a`.
- Before every commit, `git diff --cached --name-only` must not list `spatial`; if it does, `git restore --staged spatial`.
- Other agent sessions edit this working tree at the same time: never `git stash`, `git checkout -- .` or `git reset --hard`.
