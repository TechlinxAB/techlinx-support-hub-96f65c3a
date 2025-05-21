
# Techlinx Helpdesk

## Project info

**URL**: https://lovable.dev/projects/80450ba2-c1fd-4148-b4a9-aa60bba380e9

## Deployment Guide for Linux Servers with aaPanel

This guide will walk you through the process of deploying the Techlinx Helpdesk frontend application on a Linux server with aaPanel, running on a local IP (192.168.0.102) using the helpdesk-user account.

### Prerequisites

Before you begin, ensure your Linux server has the following installed:

1. **Git** - To clone the repository
   ```bash
   sudo apt update
   sudo apt install git
   ```

2. **Node.js and npm** - Required for building the application
   ```bash
   # Using NVM (recommended)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
   source ~/.bashrc
   nvm install 20  # Install Node.js v20 (LTS)
   nvm use 20      # Use Node.js v20
   
   # Alternative: Direct installation
   sudo apt update
   sudo apt install nodejs npm
   ```

### Deployment Steps

#### 1. Clone the Repository

```bash
# Login as helpdesk-user or switch to that user
su - helpdesk-user

# Navigate to home directory
cd ~

# Clone the repository
git clone <YOUR_REPOSITORY_URL> techlinx-helpdesk

# Navigate to project directory
cd techlinx-helpdesk
```

#### 2. Install Dependencies

```bash
npm install --legacy-peer-deps
```

#### 3. Build the Application

```bash
npm run build
```
This will create a `dist` folder containing the compiled application.

#### 4. Running the Application with PM2 (Recommended for Production)

Install PM2 globally:
```bash
npm install -g pm2
```

Start the application using PM2 with Vite's preview server:
```bash
# Navigate to the project directory
cd ~/techlinx-helpdesk

# Start the application using PM2 with Vite's preview server
pm2 start npm --name "techlinx-helpdesk" -- run preview -- --port 8080 --host
```

Alternatively, if you prefer to use a static file server:
```bash
# Install serve globally
npm install -g serve

# Use PM2 to run serve for the dist directory
# CORRECT COMMAND:
pm2 start --name "techlinx-helpdesk" npx -- serve -s ~/techlinx-helpdesk/dist -l 8080
```

Setup PM2 to start on system boot:
```bash
pm2 startup
# Follow the instructions that PM2 outputs

pm2 save
```

PM2 Useful Commands:
```bash
# View logs
pm2 logs techlinx-helpdesk

# Restart the application
pm2 restart techlinx-helpdesk

# Stop the application
pm2 stop techlinx-helpdesk

# View status of all applications
pm2 status
```

#### 5. Configuring aaPanel Reverse Proxy

In the aaPanel web interface:

1. Go to the "Website" section
2. Click on "Add site" or select an existing site
3. In the proxy settings, add a new reverse proxy:
   - Source address: The path you want to expose (e.g., `/helpdesk`)
   - Target URL: `http://192.168.0.102:8080` (local IP and port where the app is running)
   - Check "Enable" for HTTPS if needed
   - Save the configuration

### Post-Deployment Configuration

After deployment, you need to update the Base URL in the application settings to match your local IP address:

1. Log in to the application with admin credentials
2. Navigate to the Settings section
3. Find and update the "Base URL" to match your new IP address (e.g., http://192.168.0.102:8080)
4. Save the settings

### Updating the Application

When you need to update the application, follow these steps:

```bash
cd ~/techlinx-helpdesk
git pull
npm install --legacy-peer-deps
npm run build
pm2 restart techlinx-helpdesk
```

#### Optional: Create an Update Script

Create a script file to simplify updates:

```bash
nano ~/techlinx-helpdesk/update.sh
```

Add the following content:

```bash
#!/bin/bash
echo "Updating Techlinx Helpdesk..."
cd ~/techlinx-helpdesk
git pull
npm install --legacy-peer-deps
npm run build
pm2 restart techlinx-helpdesk
echo "Update completed: $(date)"
```

Make it executable:

```bash
chmod +x ~/techlinx-helpdesk/update.sh
```

Now you can update by running:

```bash
~/techlinx-helpdesk/update.sh
```

### Troubleshooting

#### PM2 Issues

If you encounter issues with PM2:

1. Check the PM2 logs:
   ```bash
   pm2 logs techlinx-helpdesk
   ```

2. Try restarting the PM2 daemon:
   ```bash
   pm2 kill
   pm2 start techlinx-helpdesk
   ```

3. Ensure PM2 has the correct permissions:
   ```bash
   # Make sure the helpdesk-user owns all the files
   sudo chown -R helpdesk-user:helpdesk-user ~/techlinx-helpdesk
   ```

#### Application Shows Blank Page or 404

This is often due to routing issues. Check that your reverse proxy configuration in aaPanel is correctly set up.

#### API Connection Issues

If the application is having trouble connecting to the Supabase backend:

1. Check the browser console for CORS errors
2. Verify that your local IP address (192.168.0.102) is allowed in the Supabase project CORS settings

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (for backend services)

## How can I edit this code?

There are several ways of editing your application.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will be reflected in the repository.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i --legacy-peer-deps

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

