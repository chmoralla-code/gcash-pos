# GCash POS 🏧

Offline Android POS app for recording GCash cash-in/cash-out transactions with automatic fee calculation, income analytics, and Telegram monitoring.

## ✨ Features

- **📊 Dashboard** — Real-time today's income monitoring with transaction list
- **💸 Record Sales** — Quick cash-in/cash-out recording with auto fee calculation
- **⚙️ Fee Settings** — Configure custom fee tiers per amount range
- **📈 Analytics** — Today, Yesterday, 15 Days, Monthly, Yearly income tracking
- **🤖 Telegram Monitoring** — Automatic daily income reports sent to your Telegram
- **💾 Auto Backup** — Automatic backup on every transaction, export/restore support

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI (`npm i -g expo-cli`) or use `npx expo`

### Install & Run
```bash
npm install
npx expo start
```

### Build APK
```bash
npx expo run:android
# or build with EAS
npx eas build -p android --profile preview
```

## 📱 Screens

| Screen | Description |
|--------|-------------|
| **Dashboard** | Today's total income, transaction list, quick send to Telegram |
| **Record Sale** | Select type (cashin/cashout), enter amount, auto-calculates fee |
| **Analytics** | Multi-period income breakdown with bar chart visualization |
| **Fee Settings** | Configure cash-in & cash-out fee tiers by amount range |
| **Telegram** | Setup bot token, chat ID, enable auto daily reporting |

## 🔧 Tech Stack

- **React Native** (Expo SDK 56)
- **expo-router** — File-based navigation
- **expo-sqlite** — Local SQLite database
- **expo-file-system** — Backup & restore
- **react-native-chart-kit** — Analytics charts

## 📄 License

MIT
