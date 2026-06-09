# Antigravity AI Agent Guidelines

Welcome, fellow Antigravity agent! This document contains essential context and instructions for working on this project collaboratively. Please read this carefully before making any modifications.

## 🏗️ Architecture Overview
This project is a **Multi-Tenant Guide Editor Portal** developed for "iMettrics", and it consists of both a frontend and a backend in a monorepo structure.

1. **Frontend (Root Level):**
   - **Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Mantine, Tiptap (for the rich text editor).
   - **Hosting:** Firebase Hosting.
   - **Environment Variables:** Uses `.env.development` and `.env.production`.

2. **Backend (`/backend` Directory):**
   - **Tech Stack:** Node.js, Express, TypeScript, Firebase Admin SDK.
   - **Hosting:** Dockerized and deployed natively on **Google Cloud Run** (`us-central1`).
   - **Purpose:** Handles secured operations that cannot be safely done client-side, enforcing multi-tenant isolation.

3. **Database & Auth:**
   - **Google Cloud Platform / Firebase:** Firebase Authentication (via Google Sign-in workspaces), Firestore (NoSQL DB), Firebase Storage.
   - **RBAC (Role-Based Access Control):** The platform strictly enforces access control. Admins (iMettrics) can create/edit/delete, while non-admin clients strictly have read-only access to their isolated workspaces.

## 🚀 CI/CD & Deployment Strategy
The project uses **GitHub Actions** for CI/CD, managing two separate environments:

- **Development (`develop` branch):** Automatically deploys to Firebase Hosting (`imettrics-clients-portal-dev`) and Cloud Run (`imettrics-clients-portal-dev` GCP project). Triggered by `.github/workflows/deploy-dev.yml`.
- **Production (`main` / `master` branches):** Automatically deploys to production Firebase Hosting (`imettrics-clients-portal`) and Cloud Run. Triggered by `.github/workflows/deploy-prod.yml`.

**Important:** Do not attempt to run manual Firebase or Google Cloud deployment commands (`firebase deploy` or `gcloud run deploy`) unless explicitly instructed by the user, as GitHub Actions handles this seamlessly on `push`.

## 🛠️ Execution & Modifications Rules

1. **Monorepo Awareness:**
   - When running `npm install`, `npm run dev`, or installing dependencies for the **Frontend**, do so from the **root directory**.
   - When running commands or installing dependencies for the **Backend**, you must `cd backend` first.

2. **Multi-Tenant Security & Isolation:**
   - Always ensure data isolation! When modifying backend routes or frontend data-fetching logic, verify that clients can only access data belonging to their assigned workspace.
   - Never bypass read-only restrictions for non-admin users in the frontend UI or backend API. Both layers must securely reject unauthorized mutations.

3. **File Modifications:**
   - Do not use generic tools for file operations (like `cat` to write/append in bash). Use specific AI tools like `replace_file_content` or `multi_replace_file_content`.
   - Before modifying Firebase Security Rules (`firestore.rules` or `storage.rules`), carefully analyze the impact on tenant data isolation.

4. **Style & Components:**
   - Use Tailwind CSS and Mantine components by default.
   - Maintain the modern, premium aesthetic established in the portal. Validate changes against responsive layouts.

## 🧪 Testing and Verification
- Even though automated tests might not be fully configured yet, rely on careful Typescript compilation checking (`tsc -b`).
- Ask the user to verify UI changes in their browser if you are altering complex visual components (like the Tiptap editor or dashboards).

Good luck, and build something awesome!
