# Pomodify
#### – A customizable Pomodoro productivity tracker. Helps users focus with flexible timers, activity grouping, and progress tracking.

## 📚 Table of Contents
- [🚀 Features](#-features)
- [🌐 Live Demo](#-live-demo)
- [🛠️ Tech Stack](#-tech-stack)
- [📁 Project Folder Structure](#-project-folder-structure)
- [🗂️ Git Workflow Guidelines](#-git-workflow-guidelines)
- [📜 General Coding Guidelines](#-general-coding-guidelines)
- [🧑‍💻 Contributors](#-contributors)
- [📝 Developer Documentation](#-developer-documentation)

## 🚀 Features

- Customizable work/break sessions
- User accounts with authentication
- Activities to categorize sessions
- Session logs & reports with notes
- Responsive UI for web & mobile

## 🌐 Live Demo

> - [Pomidify Web Host](https://pomodify.site/)

## 🔑 Test User Account 
- Use the following credentials to explore the system:
- **Email**: johndoe@gmail.com
- **Password**: JohnDoe@123

## 🛠️ Tech Stack
- **Frontend:** Angular, Tailwind CSS
- **Backend:** Spring Boot, OpenAPI (Swagger), Lombok, MapStruct
- **Database:** PostgreSQL
- **Database Migrations:** Flyway
- **Authentication & Security:** JWT, Spring Security
- **Integrations:** Google Calendar API
- **DevOps & CI/CD:** Docker, GitHub Actions

## 📁 Project Folder Structure
> Example structure:
```
project-root/
├── frontend/         # Angular app
├── backend/          # Spring Boot app
├── docs/             # Documentation
└── README.md
```

## 🗂️ Git Workflow Guidelines

### 🌿 Branch Types and Naming Conventions
| Branch Type | Description                 | Naming Convention      |
|-------------|-----------------------------|-----------------------|
| main        | Production branch           | main                  |
| feature     | New feature development     | feature/              |
| bugfix      | Fixes identified bugs       | bugfix/               |
| docs        | Document related branch     | docs/                 |

### 🔧 Branching Guidelines
- Create a branch from main for any feature, bugfix, or enhancement.
- Use descriptive branch names (e.g., feature/user-authentication).
- Commit often with meaningful messages.
- Keep branches focused; one purpose per branch.
- All feature, bugfix, and docs branches are merged directly into main after approval.

## 📜 General Coding Guidelines
- Follow language-specific style guides
- Write clear, maintainable code
- Add comments where necessary
- Use meaningful variable and function names

## 🧑‍💻 Contributors
- [Hannah Lorainne Genandoy](https://www.linkedin.com/in/hannah-lorainne-genandoy-3b8a1b2b2/) – Project Manager / Developer
- [Daniel Victorioso](https://www.linkedin.com/in/daniel-victorioso-304688292/) – Technical Lead / Developer
- [Ivan Delumen](https://www.linkedin.com/in/ivan-delumen-53982728a/) – UI/UX / Developer
- Gerald Mamasalanang – Tester / Developer
- [Simone Jake Reyes](https://www.linkedin.com/in/simone-jake-reyes-75199234a/) – UI/UX / Developer

## 📝 Developer Documentation
> See the `document/` folder for API docs, architecture diagrams, and more.