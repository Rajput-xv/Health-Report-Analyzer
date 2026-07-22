# 🩺 Health Report Analyzer

Upload a lab report (PDF or image) and get your results pulled into clean, sortable tables - with trends tracked over time, so you're not copying numbers by hand.

🔗 **Try it:** https://health-report-analyzer-client.vercel.app

![Stars](https://img.shields.io/github/stars/Rajput-xv/Health-Report-Analyzer?style=flat&logo=github)
![Forks](https://img.shields.io/github/forks/Rajput-xv/Health-Report-Analyzer?style=flat&logo=github)
![Issues](https://img.shields.io/github/issues/Rajput-xv/Health-Report-Analyzer?style=flat&logo=github)
![Open PRs](https://img.shields.io/github/issues-pr/Rajput-xv/Health-Report-Analyzer?style=flat&logo=github)
![License](https://img.shields.io/github/license/Rajput-xv/Health-Report-Analyzer?style=flat)

---

## What it does

- **Reads your reports** - OCR pulls values straight out of a PDF or photo
- **Organizes them** - everything lands in clean, sortable tables
- **Shows trends** - see how each marker moves over time with charts
- **Explains them** - plain-language summaries powered by Google Gemini
- **Keeps them private** - personal accounts with email or Google sign-in

Works with cholesterol/lipid panels, blood sugar (HbA1c), complete blood count (CBC), vitamins, thyroid, and more.

## Tech stack

- **Frontend** - React + Vite, React Router, Tailwind, Chart.js, i18next, PWA
- **Backend** - Node/Express, MongoDB (Mongoose), JWT + Firebase auth
- **Processing** - Tesseract.js OCR, pdf-parse, Sharp, Google Gemini

## Quick start

You'll need **Node.js** and a **MongoDB** connection string.

```bash
npm run install-all   # install root + client + server
npm run dev           # client on :3000, server on :5001
```

Open http://localhost:3000 and upload a report.

## Environment variables

**`client/.env`**

```properties
VITE_API_URL=http://localhost:5001/api

# Firebase - for Google sign-in (https://console.firebase.google.com)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

**`server/.env`**

```properties
# Required
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/health-report
JWT_SECRET=a-long-random-string
SESSION_EXPIRE=7d
FRONTEND_URL=http://localhost:3000
GEMINI_API_KEY=your-gemini-key          # https://aistudio.google.com/apikey

# Optional - enable per feature
# Google sign-in:   FIREBASE_SERVICE_ACCOUNT (JSON)  - or  FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
# Password reset:   EMAIL_USER, EMAIL_PASS           (Gmail app password)
# Contact form:     WEB3FORMS_ACCESS_KEY
# Pro plans:        GUMROAD_* keys                   (see server/routes/payments.js)
```

## Common issues

- **Nothing extracted?** Photos vary a lot - a clear PDF gives the best results.
- **Can't connect?** Check that MongoDB is running and `MONGODB_URI` is correct.
- **Google login failing?** The server needs Firebase Admin credentials (see above).

## Security & disclaimer

Uploaded files are processed in memory and never written to disk. Passwords are hashed with bcrypt, and sessions use JWT.

> ⚠️ **For informational purposes only.** This is not medical advice - always talk to a healthcare professional about your results.

## License

MIT - see [LICENSE](LICENSE).

## Contact

Built by **Yash Verma**. Found a bug or have an idea? [Open an issue](https://github.com/Rajput-xv/Health-Report-Analyzer/issues) or say hi on [LinkedIn](https://www.linkedin.com/in/yash-rajput-xv/).

If it saved you some typing, a ⭐ means a lot.
