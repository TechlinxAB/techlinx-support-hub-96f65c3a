
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

#### 4. Running the Application

##### Option 1: Using Vite's built-in server on port 80 (requires root)

```bash
# You'll need to run this with sudo to bind to port 80
sudo npm run dev
```

##### Option 2: Using a process manager (recommended for production)

Install PM2:
```bash
npm install -g pm2
```

Create a PM2 configuration file (ecosystem.config.js):
```bash
echo 'module.exports = {
  apps: [{
    name: "techlinx-helpdesk",
    script: "npm",
    args: "run dev",
    env: {
      NODE_ENV: "production",
    }
  }]
}' > ecosystem.config.js
```

Start the application with PM2:
```bash
pm2 start ecosystem.config.js
```

#### 5. Configuring aaPanel Reverse Proxy

In the aaPanel web interface:

1. Go to the "Website" section
2. Click on "Add site" or select an existing site
3. In the proxy settings, add a new reverse proxy:
   - Source address: The path you want to expose (e.g., `/helpdesk`)
   - Target URL: `http://192.168.0.102:80` (local IP and port where the app is running)
   - Check "Enable" for HTTPS if needed
   - Save the configuration

### Post-Deployment Configuration

After deployment, you need to update the Base URL in the application settings to match your local IP address:

1. Log in to the application with admin credentials
2. Navigate to the Settings section
3. Find and update the "Base URL" to match your new IP address (e.g., http://192.168.0.102)
4. Save the settings

### Updating the Application

When you need to update the application, follow these steps:

```bash
cd ~/techlinx-helpdesk
git pull
npm install --legacy-peer-deps
npm run build
# Restart the service (if using PM2)
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
# Restart the service (if using PM2)
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

#### Permission Issues with Port 80

Port 80 requires root privileges. If you get permission denied errors, you have a few options:

1. Use sudo to start the service (not recommended for production)
2. Use setcap to allow Node.js to bind to privileged ports:
   ```bash
   sudo setcap cap_net_bind_service=+ep $(which node)
   ```
3. Use a reverse proxy like Nginx (included in aaPanel) to forward traffic from port 80 to another port (e.g., 3000)

#### Application Shows Blank Page or 404

This is often due to routing issues. Check that your reverse proxy configuration in aaPanel is correctly set up.

#### API Connection Issues

If the application is having trouble connecting to the Supabase backend:

1. Check the browser console for CORS errors
2. Verify that your local IP address (192.168.0.102) is allowed in the Supabase project CORS settings

#### Permission Issues

If you encounter permission issues:

```bash
# Ensure the application files are owned by helpdesk-user
sudo chown -R helpdesk-user:helpdesk-user ~/techlinx-helpdesk
```

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
