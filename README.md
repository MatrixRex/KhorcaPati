# `<img src="public/icon-512.png" width="48" height="48" alt="KhorcaPati Logo" vertical-align="middle">` KhorcaPati

[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

**KhorcaPati** (খরচাপাতি) is a premium, local-first personal finance manager designed for speed, beauty, and offline-ready accessibility. It empowers you to track expenses, manage recurring bills, and reach your savings goals with a stunning user interface.

[**Explore the Live Site**](https://matrixrex.github.io/KhorcaPati/)

---

## ✨ Features

- **💎 Premium Aesthetics**: Dynamic mesh gradients, glassmorphism, and smooth micro-animations for a state-of-the-art feel.
- **⚡ Smart Input**: Effortlessly track items within a single note. Type "Grocery: Rice 2kg, Oil 1L" and let the app auto-parse quantities for you.
- **📅 Recurring Payments**: Never miss a bill. Manage electricity, rent, or subscriptions with automatic next-due date calculations.
- **🎯 Savings Goals**: Visualize your financial journey with dedicated progress trackers for your big purchases.
- **📦 Collection Mode**: Organize related expenses into nested "Collections" for projects, trips, or events.
- **📱 PWA Ready**: Install it on your home screen. It works offline and syncs your data locally using IndexedDB.
- **📊 Insightful Reports**: Clean visualizations of your spending habits across categories.

---

## 📖 User Guide

### 📲 Installing the PWA

KhorcaPati is a Progressive Web App (PWA), meaning you can install it on your device for an app-like experience and offline access.

#### **On Mobile (iOS & Android)**

1. Open [KhorcaPati](https://matrixrex.github.io/KhorcaPati/) in your browser (Safari on iOS, Chrome on Android).
2. **iOS**: Tap the **Share** button (square with arrow) and select **"Add to Home Screen"**.
3. **Android**: Tap the **Three Dots** (menu) and select **"Install App"** or **"Add to Home Screen"**.

#### **On Desktop (Chrome & Edge)**

1. Navigate to the site.
2. Click the **Install Icon** at the right end of the address bar.
3. Confirm by clicking **"Install"**.

### 💡 How to Use

- **Quick Entry**: Use the smart input bar at the top to quickly add items without needing an expense record first.
- **Smart Parsing**: Type something like `Rice 2kg, Oil 1L` in the note field of an expense. The app automatically extracts these for item-level tracking.
- **Collections**: Toggle **"Collection"** when adding a record to create a parent entry for nested expenses (useful for trips or project budgeting).
- **Recurring Bills**: Set an interval (Daily, Monthly, etc.) in the Recurring form to track fixed costs and get reminders for upcoming dues.

---

## 🛠️ Tech Stack

- **Core**: React 19 + TypeScript
- **Styling**: Tailwind CSS + Shadcn UI
- **Database**: IndexedDB via [Dexie.js](https://dexie.org/)
- **Animations**: Lucide React + Tailwind Animate
- **State Management**: Zustand
- **Build Tool**: Vite

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Latest LTS)
- [pnpm](https://pnpm.io/) (Recommended)

### Local Development

1. **Clone the repository:**

   ```bash
   git clone https://github.com/MatrixRex/KhorcaPati.git
   cd KhorcaPati
   ```
2. **Install dependencies:**

   ```bash
   pnpm install
   ```
3. **Start the development server:**

   ```bash
   pnpm dev
   ```
4. **Build for production:**

   ```bash
   pnpm build
   ```

---

## 📂 Project Structure

- `src/components`: Reusable UI components and feature-specific forms.
- `src/pages`: Main application views (Dashboard, Goals, Reports, etc.).
- `src/stores`: State management using Zustand.
- `src/db`: Database schema and Dexie configuration.
- `src/parsers`: Natural language parsing for smart inputs.

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

Built with ❤️ by [MatrixRex](https://github.com/MatrixRex)
