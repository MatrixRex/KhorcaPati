# <img src="public/icon-512.png" width="48" height="48" alt="KhorcaPati Logo" align="center"> KhorcaPati (খরচাপাতি)

[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-orange?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

**KhorcaPati** is a premium, privacy-first personal finance manager designed for speed, beauty, and offline-ready accessibility. It empowers you to track expenses, manage recurring bills, and reach your savings goals with a stunning, glassmorphic user interface.

[**🚀 Explore the Live App**](https://matrixrex.github.io/KhorcaPati/)

---

## ✨ Key Features

### 💎 Premium Design & UX
- **Stunning Aesthetics**: Experience a modern UI with mesh gradients, glassmorphism, and smooth micro-animations.
- **Dynamic Themes**: Support for Dark, Light, and System modes with a custom font scaling system for accessibility.
- **Responsive Layout**: Designed for mobile-first experience but works flawlessly on desktop.

### 🧠 Smart Tracking
- **NLP Power**: Type natural notes like "Grocery: Rice 2kg, Oil 1L" and the app auto-parses quantities and items for granular tracking.
- **Collection Mode**: Organize related expenses into nested "Collections" (perfect for trips, projects, or events).
- **Recurring Payments**: Stay on top of bills (rent, subscriptions) with automatic next-due date calculations and tracking.

### 🎯 Financial Intelligence
- **Savings Goals**: Visualize your journey towards big purchases with dedicated progress trackers.
- **Budget Management**: Set and track limits for different categories to stay within your means.
- **Insightful Reports**: Deep-dive into your spending habits with categorized charts and trend visualizations.

### 🔒 Privacy & Performance
- **Local-First**: All data is stored locally on your device via IndexedDB (Dexie.js). No cloud sync means maximum privacy.
- **PWA Ready**: Install as a native-like app on your home screen with full offline support.
- **Fast & Lightweight**: Built with Vite and React 19 for instantaneous performance.
- **Data Portability**: Easily export your data to JSON or import from backups.

---

## 📲 PWA Installation Guide

Installing **KhorcaPati** on your device gives you an app-like experience with offline access and a dedicated home screen icon.

### 🍎 For iOS (iPhone/iPad)
1. Open [KhorcaPati](https://matrixrex.github.io/KhorcaPati/) in **Safari**.
2. Tap the **Share** button 📤 (the square with an upward arrow).
3. Scroll down and select **"Add to Home Screen"**.
4. Tap **Add** to confirm.

### 🤖 For Android
1. Open [KhorcaPati](https://matrixrex.github.io/KhorcaPati/) in **Chrome**.
2. Tap the **Three Dots** menu icon in the top-right corner.
3. Select **"Install App"** or **"Add to Home Screen"**.
4. Follow the on-screen prompts to install.

### 💻 For Desktop (Chrome/Edge/Safari)
1. Navigate to the [KhorcaPati](https://matrixrex.github.io/KhorcaPati/) website.
2. In the address bar, look for the **Install Icon** (usually a computer with a down arrow).
3. Click **Install**.
4. On macOS Safari, use **File > Add to Dock**.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4.0](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/)
- **State**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Database**: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) via [Dexie.js](https://dexie.org/)
- **Animations**: [Tailwind Animate](https://github.com/jamiebuilds/tailwindcss-animate) + [Lucide Icons](https://lucide.dev/)
- **I18n**: [i18next](https://www.i18next.com/) (English & Bangla)

---

## 🚀 Development Setup

### Prerequisites
- **Node.js**: v18 or later
- **Package Manager**: [pnpm](https://pnpm.io/) (highly recommended)

### Getting Started
1. **Clone the repo:**
   ```bash
   git clone https://github.com/MatrixRex/KhorcaPati.git
   cd KhorcaPati
   ```
2. **Install dependencies:**
   ```bash
   pnpm install
   ```
3. **Run development server:**
   ```bash
   pnpm dev
   ```
4. **Build for production:**
   ```bash
   pnpm build
   ```

---

## 📂 Project Structure

- `src/components`: UI components organized by feature (budgets, expenses, goals, items, recurring).
- `src/pages`: Main view components (Dashboard, Settings, Reports, etc.).
- `src/stores`: Zustand state stores for UI, Settings, and Data.
- `src/db`: Dexie database schema and management logic.
- `src/parsers`: Custom NLP logic for smart input notes.
- `src/lib`: Core utilities for data management, formatting, and PWA setup.

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for details.

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/MatrixRex">MatrixRex</a>
</p>
