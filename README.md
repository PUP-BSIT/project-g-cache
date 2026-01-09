<div align="center">

<img src="pomodify-frontend/src/images/logo.png" alt="Pomodify logo" width="280" />

# ⏲️ Pomodify
### *Your Smart Productivity Companion*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Status: Active Development](https://img.shields.io/badge/Status-Active%20Development-brightgreen.svg?style=for-the-badge)](https://github.com/PUP-BSIT/project-g-cache)
[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_App-5FA9A4?style=for-the-badge)](https://pomodify.site/)

---

*Transform your productivity with AI-powered focus sessions, smart tracking, and seamless organization*

</div>

Pomodify is a customizable Pomodoro productivity tracker designed to help users focus with flexible timers, activity grouping, and comprehensive progress tracking.

## 🚀 What We're Building

| 🎯 Focus Sessions | 📊 Progress Tracking | 🏷️ Activity Groups | 🔐 Secure Accounts |
|:---:|:---:|:---:|:---:|
| Customizable focus sessions | Track & review progress | Organize by context | Your data, protected |
| ⏱️ Flexible timers | 📈 Smart analytics | 🏷️ Easy categorization | 🔒 JWT security |

---

## 📚 Table of Contents

- [🎯 Quick Start](#-quick-start)
- [🚀 Features](#-features)
- [⚙️ Tech Stack](#️-tech-stack)
- [🎨 Design System](#-design-system)
- [📁 Project Structure](#-project-structure)
- [🎯Development](#-development)
- [🧑‍💻 Contributors](#-contributors)
- [🤖 AI-Powered Features](#-ai-powered-features)

---

## 🎯 Quick Start

<div align="center">

### � [**Pomodify Live**](https://pomodify.site/) 🌟

| Badge | � E mail | 🔑 Password |
|:---:|:---|:---|
| 1️⃣ | `hann000345@gmail.com` | `Pomodify@123` |
| 2️⃣ | `simonejake@gmail.com` | `Pomodify@123` |
| 3️⃣ | `ivandelumen@gmail.com` | `Pomodify@123` |
| 4️⃣ | `danielvictorioso@gmail.com` | `Pomodify@123` |
| 5️⃣ | `geraldkasan163@gmail.com` | `Pomodify@123` |

</div>

---

## 🚀 Features

| 🎨 Feature | 📝 Description | 🔧 Tech |
|:---|:---|:---|
| ⏱️ **Customizable Timers** | Flexible work/break sessions tailored to your needs | Angular + RxJS |
| 🔐 **User Authentication** | Secure accounts with JWT & Spring Security | Spring Boot + JWT |
| 🎭 **Activity Grouping** | Organize sessions by category for better context | PostgreSQL + JPA |
| 📊 **Session Tracking** | Log notes, view reports, and monitor progress | Angular Material |
| 📱 **Responsive Design** | Seamless experience on web & mobile devices | SCSS + Angular |
| 🤖 **AI Insights** | Smart suggestions and productivity analytics | Custom AI Integration |
| 📲 **Progressive Web App** | Install as app and push notifications | PWA + Service Workers |

<details>
<summary><strong>🎯 Feature Highlights</strong></summary>

```
🍅 Pomodoro Timer
├── ⏰ Custom work/break intervals
├── 🔔 Smart notifications
├── ⏸️ Pause & resume functionality
└── 📈 Session completion tracking

📊 Analytics Dashboard  
├── 📅 Daily/weekly/monthly views
├── 🎯 Goal setting & tracking
├── 📋 Detailed session logs
└── 🏆 Achievement system

🤖 AI Features
├── ▶️ Session suggestions
├── 📝 Smart note-taking
├── 🎓 Learning blueprints
└── 🔍 Pattern recognition
```

</details>

---

## 🛠️ Tech Stack

<div align="center">

**Frontend Stack**

![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![SCSS](https://img.shields.io/badge/SCSS-CC6699?style=for-the-badge&logo=sass&logoColor=white)
![Material UI](https://img.shields.io/badge/Material_UI-0081CB?style=for-the-badge&logo=material-ui&logoColor=white)

**Backend Stack**

![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)
![Java](https://img.shields.io/badge/Java-ED8B00?style=for-the-badge&logo=java&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=JSON%20web%20tokens&logoColor=white)

**DevOps & Tools**

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)

</div>

<details>
<summary><strong>📋 Detailed Tech Breakdown</strong></summary>

### Frontend
- **Framework:** Angular (v20.3)
- **Styling:** SCSS (component-scoped)
- **UI Library:** Angular Material
- **Testing:** Playwright (E2E), Karma + Jasmine (unit)
- **API Communication:** RxJS, HttpClient

### Backend
- **Framework:** Spring Boot 3
- **Documentation:** OpenAPI (Swagger)
- **Utilities:** Lombok, MapStruct
- **Persistence:** JPA/Hibernate

### Data & Infrastructure
- **Database:** PostgreSQL
- **Migrations:** Flyway
- **Authentication:** JWT + Spring Security
- **External APIs:** Google Calendar
- **Deployment:** Docker, GitHub Actions CI/CD

</details>

## 🎨 Design System

<div align="center">

| 🎨 Primary Color | 🌈 Style | 📱 Approach |
|:---:|:---:|:---:|
| `#5FA9A4` | Modern & Techy | SCSS Components |
| Teal Mint | Clean Typography | Responsive Design |

**Design Philosophy:** Modern interface with clear typography and subtle motion effects.

</div>

---

## 📁 Project Structure

```
project-root/
├── pomodify-frontend/        # Angular app (SCSS styling)
│   ├── src/app/             # Components, services, pages
│   ├── e2e/                 # Playwright tests
│   └── package.json
├── pomodify-backend/         # Spring Boot app
│   ├── src/main/java/       # Application logic
│   ├── src/test/java/       # Unit tests
│   └── pom.xml
├── document/                 # API docs, diagrams, guides
├── deploy-documentation/     # CI/CD & deployment guides
└── README.md
```

---

## 🔧 Development

### 🌿 Branch Types & Naming

| Type | Purpose | Convention |
|------|---------|-----------|
| `main` | Production-ready code | `main` |
| `staging` | Pre-production testing | `staging` |
| `feature` | New features | `feature/descriptive-name` |
| `bugfix` | Bug fixes | `bugfix/issue-description` |
| `docs` | Documentation | `docs/what-changed` |

### ✅ Best Practices

- ✔️ Create branches from `main` for any work
- ✔️ Use descriptive branch names
- ✔️ Commit frequently with clear messages
- ✔️ Keep one feature per branch
- ✔️ Submit a PR and request review before merging

---

## 📜 Code Guidelines

- 🎯 **Style:** Follow language-specific guides (Angular, Java, etc.)
- 📝 **Readability:** Write clear, self-documenting code
- 💬 **Comments:** Add them where logic isn't immediately obvious
- 🏷️ **Naming:** Use meaningful variable and function names
- 🧪 **Testing:** Aim for good test coverage

---

## 🧑‍💻 Contributors

<div align="center">

| 👤 Name | 🎯 Role | 🔗 Links |
|:---:|:---:|:---:|
| **Hannah Lorainne Genandoy** | Project Manager / Developer | [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/hannah-lorainne-genandoy-3b8a1b2b2/) |
| **Daniel Victorioso** | Technical Lead / Developer | [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/daniel-victorioso-304688292/) |
| **Ivan Delumen** | UI/UX / Developer | [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/ivan-delumen-53982728a/) |
| **Gerald Mamasalanang** | DevOps/ Developer | [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/gerald-kasan-mamasalanang-95a306386) |
| **Simone Jake Reyes** | UI/UX / Developer | [![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/simone-jake-reyes-75199234a/) |

</div>

---

## 🤖 AI-Powered Features

Pomodify includes intelligent AI features to enhance productivity:

- 🎯 **Session Suggestions** — Context-aware next-step recommendations for your activities
- 🧠 **Smart Blueprints** — AI-generated study/learning plans with beginner & intermediate levels
- 📝 **Session Notes** — AI-backed suggestions to help you summarize and reflect on work

---

## 📚 Documentation

For detailed guides and technical docs, explore:

- **API Docs:** [pomodify-backend/api-docs](pomodify-backend/api-docs)
- **Architecture & Diagrams:** [document/](document/)
- **CI/CD & Deployment:** [deploy-documentation/](deploy-documentation/)
- **Developer Guide:** [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)

---

<div align="center">

### 🎉 Developed by the PUPT-DIT 3 G-Cache Team

[![Live App](https://img.shields.io/badge/🌐_Live_App-Visit_Now-success?style=for-the-badge)](https://pomodify.site/)
[![Documentation](https://img.shields.io/badge/📖_Documentation-Read_Docs-blue?style=for-the-badge)](document/)
[![Video Demo](https://img.shields.io/badge/🎥_Video_Demo-Watch_Walkthrough-FF0000?style=for-the-badge)](https://youtu.be/sMEqr4PYfWk)
[![Issues](https://img.shields.io/badge/🐛_Issues-Report_Bug-red?style=for-the-badge)](https://github.com/PUP-BSIT/project-g-cache/issues)

<br><br>

![GitHub stars](https://img.shields.io/github/stars/PUP-BSIT/project-g-cache?style=social)
![GitHub forks](https://img.shields.io/github/forks/PUP-BSIT/project-g-cache?style=social)
![GitHub watchers](https://img.shields.io/github/watchers/PUP-BSIT/project-g-cache?style=social)

</div>