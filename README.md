# 🩺 Health Report Analyzer

You can take a look at this project at - [Website](https://health-report-analyzer-client.vercel.app/)

> **Upload your lab reports (PDF/image) and get your health data automatically extracted into organized tables with trend analysis. No more manual data entry!**

<img src="https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif" width="100%">

**📊 Project Insights**
<table align="center">
    <thead align="center">
        <tr>
            <td><b>🌟 Stars</b></td>
            <td><b>🍴 Forks</b></td>
            <td><b>🐛 Issues</b></td>
            <td><b>🔔 Open PRs</b></td>
            <td><b>🔕 Closed PRs</b></td>
            <td><b>🛠️ Languages</b></td>
        </tr>
     </thead>
    <tbody>
         <tr>
            <td><img alt="Stars" src="https://img.shields.io/github/stars/Rajput-xv/Health-Report-Analyzer?style=flat&logo=github"/></td>
            <td><img alt="Forks" src="https://img.shields.io/github/forks/Rajput-xv/Health-Report-Analyzer?style=flat&logo=github"/></td>
            <td><img alt="Issues" src="https://img.shields.io/github/issues/Rajput-xv/Health-Report-Analyzer?style=flat&logo=github"/></td>
            <td><img alt="Open PRs" src="https://img.shields.io/github/issues-pr/Rajput-xv/Health-Report-Analyzer?style=flat&logo=github"/></td>
            <td><img alt="Closed PRs" src="https://img.shields.io/github/issues-pr-closed/Rajput-xv/Health-Report-Analyzer?style=flat&color=critical&logo=github"/></td>
            <td><img alt="Languages Count" src="https://img.shields.io/github/languages/count/Rajput-xv/Health-Report-Analyzer?style=flat&color=green&logo=github"></td>
        </tr>
    </tbody>
</table>

</div>
<img src="https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif" width="100%">

## What It Does
- Upload lab reports and get instant data extraction
- View results in clean, sortable tables
- Track trends over time
- Secure login and data storage

<img src="https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif" width="100%">

## Supported Tests
Cholesterol, Blood Sugar, Blood Count, Vitamins, Thyroid, and more.

<div align="center">
  <img src="https://user-images.githubusercontent.com/74038190/212284115-f47cd8ff-2ffb-4b04-b5bf-4d1c14c0247f.gif" width="1000">
</div>

## Tech Stack
React + Node.js + MongoDB + OCR

<div align="center">
  <img src="https://user-images.githubusercontent.com/74038190/212284115-f47cd8ff-2ffb-4b04-b5bf-4d1c14c0247f.gif" width="1000">
</div>

## Quick Start
**Prerequisites:** Node.js + MongoDB

```bash
# Install everything
npm run install-all

# Start the app
npm run dev
```
<div align="center">
  <img src="https://user-images.githubusercontent.com/74038190/212284115-f47cd8ff-2ffb-4b04-b5bf-4d1c14c0247f.gif" width="1000">
</div>

Open http://localhost:3000 and start uploading your reports!

<div align="center">
  <img src="https://user-images.githubusercontent.com/74038190/212284115-f47cd8ff-2ffb-4b04-b5bf-4d1c14c0247f.gif" width="1000">
</div>

## Environment Setup
When you fork this repository, you'll need to set up the following environment variables:

### Client (.env file in /client directory)
```properties
# Development API URL - use localhost during development
VITE_API_URL=http://localhost:5001/api

# Firebase configuration - create your Firebase project at https://console.firebase.google.com/
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
VITE_FIREBASE_MEASUREMENT_ID="your-measurement-id"
```

### Server (.env file in /server directory)
```properties
PORT=5001
NODE_ENV=development
# Generate a strong random string for JWT_SECRET (use a secure generator)
JWT_SECRET=your-secure-random-string
SESSION_EXPIRE=7d
# Create a MongoDB Atlas cluster or use local MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/health-report?retryWrites=true&w=majority
# Set to your frontend URL, use localhost during development
FRONTEND_URL=http://localhost:3000

# For password reset functionality
EMAIL_USER=your-email@gmail.com
# Create an app password if using Gmail: https://myaccount.google.com/apppasswords
EMAIL_PASS=your-app-password
```

### How to get these credentials:
1. **Firebase**: [Create a Firebase project](https://console.firebase.google.com/) and get your web app credentials
2. **MongoDB**: [Set up a MongoDB Atlas cluster](https://www.mongodb.com/cloud/atlas/register) or use a local MongoDB instance
3. **JWT Secret**: Generate a secure random string using a tool like [RandomKeygen](https://randomkeygen.com/)
4. **Email (for password reset)**: Use your Gmail account and [create an app password](https://myaccount.google.com/apppasswords)

<div align="center">
  <img src="https://user-images.githubusercontent.com/74038190/212284115-f47cd8ff-2ffb-4b04-b5bf-4d1c14c0247f.gif" width="1000">
</div>

## Common Issues
- **No data extracted?** Try PDF instead of image
- **Can't connect?** Make sure MongoDB is running
- **Slow upload?** Large files take time to process

<div align="center">
  <img src="https://user-images.githubusercontent.com/74038190/212284115-f47cd8ff-2ffb-4b04-b5bf-4d1c14c0247f.gif" width="1000">
</div>

## Security
Your files are processed in memory only - never saved to disk. JWT authentication keeps your data secure.

<div align="center">
  <img src="https://user-images.githubusercontent.com/74038190/212284115-f47cd8ff-2ffb-4b04-b5bf-4d1c14c0247f.gif" width="1000">
</div>

*Disclaimer: For informational purposes only. Always consult healthcare professionals for medical advice.*

<img src="https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif" width="100%">

## 📜 License
Licensed under the [MIT License](https://github.com/Rajput-xv/Health-Report-Analyzer/blob/main/LICENSE).

<div align="center">
  <img src="https://user-images.githubusercontent.com/74038190/212284115-f47cd8ff-2ffb-4b04-b5bf-4d1c14c0247f.gif" width="1000">
</div>

## 💡 Suggestions & Feedback

If you have ideas for improving Health Report Analyzer, feel free to reach out with feedback or feature suggestions!

***If you find this project helpful, please give it a star! ⭐***

<div align="center">
  <img src="https://user-images.githubusercontent.com/74038190/212284115-f47cd8ff-2ffb-4b04-b5bf-4d1c14c0247f.gif" width="1000">
</div>

**📬 Contact**
For questions, suggestions, or collaboration, reach out via [LinkedIn](https://www.linkedin.com/in/yash-rajput-xv/) or [open an issue](https://github.com/Rajput-xv/Health-Report-Analyzer/issues)!

<img src="https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif" width="100%">

<h1 align="center"><img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Glowing%20Star.png" alt="Glowing Star" width="25" height="25" /> Give us a Star and let's make magic! <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Glowing%20Star.png" alt="Glowing Star" width="25" height="25" /></h1>
<p align="center">
    <a href="#top">
        <img src="https://img.shields.io/badge/Back%20to%20Top-000000?style=for-the-badge&logo=github&logoColor=white" alt="Back to Top">
    </a><br>
     <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Mirror%20Ball.png" alt="Mirror Ball" width="150" height="150" />
</p>

<img src="https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif" width="100%">

<div align="center">
  <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=600&size=24&duration=3000&pause=1000&color=00C853&center=true&vCenter=true&width=700&lines=Thanks+for+visiting+Health-Report-Analyzer!+🙌;Star+the+repo+✅;Share+it+with+others+🌍;Happy+Coding+✨!" alt="Thanks Banner Typing SVG" />
</div>

<img src="https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif" width="100%">

<h2>Project Admin:</h2>
<table>
<tr>
<td align="center">
<a href="https://github.com/Rajput-xv/Health-Report-Analyzer"><img src="https://avatars.githubusercontent.com/u/114978813?v=4" height="140px" width="140px" alt="Rajput"></a><br><sub><b>YASH VERMA</b><br><a href="https://www.linkedin.com/in/yash-rajput-xv/"><img src="https://github-production-user-asset-6210df.s3.amazonaws.com/73993775/278833250-adb040ea-e3ef-446e-bcd4-3e8d7d4c0176.png" width="45px" height="45px"></a></sub>
</td>
</tr>
</table>

<img src="https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif" width="100%">

**Made with ❤️ by YASH VERMA ❤️**
[Watch Demo](https://health-report-analyzer-client.vercel.app/)

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=65&section=footer"/>
</p>

<div align="center">
    <a href="#top">
        <img src="https://img.shields.io/badge/Back%20to%20Top-000000?style=for-the-badge&logo=github&logoColor=white" alt="Back to Top">
    </a>
</div>

>Stay consistent. Keep the streak alive. 🔥
