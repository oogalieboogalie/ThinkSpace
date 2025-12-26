# ThinkSpace 🚀

**AI-Powered Startup Strategy Desktop App**

An open-source Tauri desktop application that transforms startup strategy knowledge into interactive, AI-powered tools.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)

![ThinkSpace Hero](hero.png)

---

## ✨ Features

### Interactive Modules

- **🚀 Growth Hacker Assistant** — Personalized growth tactics, Product Hunt launch plans, Reddit strategy
- **💰 Pricing Optimizer** — Visual pricing calculator, A/B test simulator, psychology-based recommendations
- **🎤 VC Pitch Analyzer** — Upload pitch deck, get red/green flag analysis, improve answers
- **🧠 Behavioral Design Auditor** — User flow analysis, habit loop optimizer
- **📈 K-Factor Calculator** — Viral coefficient calculator, growth projections
- **🤖 Algorithm Dashboard** — Monitor SEO, social algorithms, content optimization
- **👥 Community Scout** — Find niche communities, engagement strategies
- **📰 PR Strategist** — Press release templates, journalist finder
- **🔍 Competitive Intelligence** — Track competitors, analyze job postings
- **🌍 Regional Insights** — Market research, localization checklists

### Tech Highlights

- 🖥️ Native desktop app (Windows, macOS, Linux)
- 💾 Local-first data storage (SQLite)
- 🔒 Privacy-focused — your data stays on your machine
- ⚡ Fast native performance via Tauri/Rust
- 🎨 Modern UI with dark mode

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, TailwindCSS |
| Backend | Tauri (Rust), SQLite |
| AI | Claude API (bring your own key) |
| Cloud (optional) | Supabase |

---

## 📦 Quick Start

### Prerequisites

- Node.js 18+
- Rust ([install](https://rustup.rs))
- Tauri CLI: `cargo install tauri-cli`

### Development

```bash
# Install dependencies
npm install

# Create your .env from example
cp .env.example .env
# Add your API keys to .env

# Run development server
npm run tauri dev
```

### Build

```bash
# Build for your current platform
npm run tauri build

# Outputs:
# Windows: .exe installer
# macOS: .dmg + .app
# Linux: .deb + .AppImage
```

---

## ⚙️ Configuration

Copy `.env.example` to `.env` and configure:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

Built with [Tauri](https://tauri.app), [React](https://react.dev), and [Anthropic Claude](https://anthropic.com).

---

**Made with ❤️ for founders, by founders**
