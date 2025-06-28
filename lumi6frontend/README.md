# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/fbd5c451-d047-4e0e-83d2-2edcbc4ab00e

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/fbd5c451-d047-4e0e-83d2-2edcbc4ab00e) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/fbd5c451-d047-4e0e-83d2-2edcbc4ab00e) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

# Lumi6 Platform

## Quick Start Guide

### Prerequisites
- Install Node.js from https://nodejs.org (LTS version recommended)
- Make sure Node.js is properly installed by running `node --version` in PowerShell

### Starting the Application

#### Option 1: Using the Startup Script (Recommended)
1. Open PowerShell
2. Navigate to the project directory: `cd path/to/lumi6frontend`
3. Run the startup script: `.\start.ps1`
4. Open your browser and go to http://localhost:3000

#### Option 2: Manual Setup
If you prefer to run commands manually:

1. Open PowerShell
2. Navigate to the project directory: `cd path/to/lumi6frontend`
3. Add Node.js to PATH: `$env:PATH += ";C:\Program Files\nodejs"`
4. Install dependencies: `& "C:\Program Files\nodejs\npm.cmd" install`
5. Build the project: `& "C:\Program Files\nodejs\npm.cmd" run build`
6. Start the server: `& "C:\Program Files\nodejs\node.exe" server.cjs`
7. Open your browser and go to http://localhost:3000

### Troubleshooting

If you encounter any issues:

1. Verify Node.js installation:
   ```powershell
   & "C:\Program Files\nodejs\node.exe" --version
   ```

2. Check if you're in the correct directory:
   ```powershell
   pwd
   ```
   You should see the path ending with 'lumi6frontend'

3. Common Issues:
   - "npm not recognized": Use `& "C:\Program Files\nodejs\npm.cmd"` instead of `npm`
   - "node not recognized": Use `& "C:\Program Files\nodejs\node.exe"` instead of `node`
   - "Cannot connect to localhost": Make sure you're running the server and no other process is using port 3000
