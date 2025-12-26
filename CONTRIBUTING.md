# Contributing to ThinkSpace

First off, thank you for considering contributing to ThinkSpace! 🎉

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/oogalieboogalie/ThinkSpace/issues)
2. If not, create a new issue with:
   - A clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Your environment (OS, Node version, etc.)

### Suggesting Features

Open an issue with the `enhancement` label describing:
- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

### Pull Requests

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm run test`
5. Commit with a clear message: `git commit -m "Add amazing feature"`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

## Development Setup

```bash
# Prerequisites
# - Node.js 18+
# - Rust (for Tauri)
# - Tauri CLI: cargo install tauri-cli

# Install dependencies
npm install

# Run in development
npm run tauri dev

# Build for production
npm run tauri build
```

## Code Style

- TypeScript for frontend
- Rust for backend (Tauri)
- Use Prettier for formatting
- Follow existing patterns in the codebase

## Questions?

Feel free to open an issue or reach out!
