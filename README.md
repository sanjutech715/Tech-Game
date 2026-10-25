# Tech-Game

## Run locally

1. Install Node.js.
2. Create a local `.admin-pin` file containing the admin PIN on one line. This file is ignored by Git; do not commit it.
3. Start the server with `node server.js`.
4. Open `http://localhost:3001/` for students or `http://localhost:3001/admin` for the admin dashboard.

Student records are saved in `data.json`, which is also ignored by Git.

## Automatic push in VS Code

The workspace pushes to the configured `origin` after a commit made in VS Code. Review and commit changes from Source Control as usual; command-line commits do not trigger VS Code's post-commit push setting.
