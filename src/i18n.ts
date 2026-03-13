import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "settings": "Settings",
      "appearance": "Appearance",
      "light": "Light",
      "dark": "Dark",
      "system": "System",
      "textSize": "Text Size",
      "reset": "Reset",
      "scaleMultiplier": "Scale Multiplier",
      "dragSlider": "Drag the slider to find your perfect reading size.",
      "management": "Management",
      "categories": "Categories",
      "manageNames": "Manage names and colors",
      "recurringPayments": "Recurring Payments",
      "editSchedules": "Edit schedules and status",
      "budgets": "Budgets",
      "setLimits": "Set and adjust spending limits",
      "savingsGoals": "Savings Goals",
      "manageTargets": "Manage long-term saving targets",
      "dangerZone": "Danger Zone",
      "resetApp": "Reset App",
      "deleteCheck": "This will permanently delete all your expenses, goals, budgets, and categories. This action cannot be undone.",
      "deleteAllData": "Delete All Data",
      "deleteEverything": "Delete Everything?",
      "wipeDatabase": "This will permanently wipe your local database. Your transactions, budgets, and settings will be gone forever.",
      "yesDelete": "Yes, Delete Everything",
      "waitGoBack": "Wait, Go Back",
      "language": "Language",
      "selectLanguage": "Select Language",
      "english": "English",
      "bangla": "Bangla",
      "dashboard": "Dashboard",
      "expenses": "Expenses",
      "reports": "Reports",
      "totalBalance": "Total Balance",
      "monthlyBudget": "Monthly Budget",
      "spent": "Spent",
      "remaining": "Remaining",
      "recentTransactions": "Recent Transactions",
      "seeAll": "See All",
      "addExpense": "Add Expense",
      "amount": "Amount",
      "category": "Category",
      "note": "Note",
      "date": "Date",
      "save": "Save",
      "cancel": "Cancel"
    }
  },
  bn: {
    translation: {
      "settings": "সেটিংস",
      "appearance": "চেহারা",
      "light": "লাইট",
      "dark": "ডার্ক",
      "system": "সিস্টেম",
      "textSize": "লেখার আকার",
      "reset": "রিসেট",
      "scaleMultiplier": "মাপ মাল্টিপ্লায়ার",
      "dragSlider": "আপনার নিখুঁত পড়ার আকার খুঁজে পেতে স্লাইডারটি টানুন।",
      "management": "ব্যবস্থাপনা",
      "categories": "বিভাগ",
      "manageNames": "নাম এবং রঙ পরিচালনা করুন",
      "recurringPayments": "বারবার পেমেন্ট",
      "editSchedules": "সময়সূচী এবং অবস্থা পরিবর্তন করুন",
      "budgets": "বাজেট",
      "setLimits": "খরচের সীমা নির্ধারণ এবং সমন্বয় করুন",
      "savingsGoals": "সঞ্চয় লক্ষ্য",
      "manageTargets": "দীর্ঘমেয়াদী সঞ্চয় লক্ষ্য পরিচালনা করুন",
      "dangerZone": "বিপদ অঞ্চল",
      "resetApp": "অ্যাপ রিসেট করুন",
      "deleteCheck": "এটি আপনার সমস্ত খরচ, লক্ষ্য, বাজেট এবং বিভাগ স্থায়ীভাবে মুছে ফেলবে। এই কাজটি আর ফিরিয়ে আনা যাবে না।",
      "deleteAllData": "সমস্ত তথ্য মুছে ফেলুন",
      "deleteEverything": "সবকিছু মুছে ফেলবেন?",
      "wipeDatabase": "এটি আপনার লোকাল ডাটাবেস স্থায়ীভাবে মুছে ফেলবে। আপনার লেনদেন, বাজেট এবং সেটিংস চিরতরে হারিয়ে যাবে।",
      "yesDelete": "হ্যাঁ, সবকিছু মুছে ফেলুন",
      "waitGoBack": "অপেক্ষা করুন, ফিরে যান",
      "language": "ভাষা",
      "selectLanguage": "ভাষা নির্বাচন করুন",
      "english": "ইংরেজি",
      "bangla": "বাংলা",
      "dashboard": "ড্যাশবোর্ড",
      "expenses": "খরচ",
      "reports": "রিপোর্ট",
      "totalBalance": "মোট ব্যালেন্স",
      "monthlyBudget": "মাসিক বাজেট",
      "spent": "ব্যয়",
      "remaining": "অবশিষ্ট",
      "recentTransactions": "সাম্প্রতিক লেনদেন",
      "seeAll": "সব দেখুন",
      "addExpense": "খরচ যোগ করুন",
      "amount": "পরিমাণ",
      "category": "বিভাগ",
      "note": "নোট",
      "date": "তারিখ",
      "save": "সংরক্ষণ করুন",
      "cancel": "বাতিল করুন"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    }
  });

export default i18n;
