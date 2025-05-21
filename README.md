
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

3. **Nginx** (already installed if you're using aaPanel)

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
npm install
```

#### 3. Build the Application

```bash
npm run build
```
This will create a `dist` folder containing the compiled application.

#### 4. Configure Nginx through aaPanel

While aaPanel provides a GUI for Nginx configuration, you can also directly edit the configuration file:

```bash
sudo nano /www/server/panel/vhost/nginx/your-website-config.conf
```

Add or modify the configuration to point to the application:

```nginx
server {
    listen 80;
    server_name 192.168.0.102;  # Local IP address

    root /home/helpdesk-user/techlinx-helpdesk/dist;
    index index.html;

    # Important for Single Page Applications
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Optional: Add cache headers for static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Security headers (optional but recommended)
    add_header X-Content-Type-Options "nosniff";
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
}
```

After saving the configuration, restart Nginx through aaPanel or via command line:

```bash
sudo /etc/init.d/nginx restart
```

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
npm install  # In case dependencies have changed
npm run build
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
npm install
npm run build
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

#### Application Shows Blank Page or 404

This is often due to routing issues. Ensure your Nginx configuration has the correct `try_files` directive that redirects all requests to `index.html`.

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

#### Nginx Logs

Check Nginx logs for troubleshooting:

```bash
sudo tail -f /www/wwwlogs/your-website-error.log
sudo tail -f /www/wwwlogs/your-website-access.log
```

Or through the aaPanel interface under the website management section.

### Monitoring and Maintenance

Consider setting up basic monitoring for your server:

```bash
sudo apt install htop
```

For log rotation and management:

```bash
sudo apt install logrotate
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

