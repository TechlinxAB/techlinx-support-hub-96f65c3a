
# Techlinx Helpdesk

## Project info

**URL**: https://lovable.dev/projects/80450ba2-c1fd-4148-b4a9-aa60bba380e9

## Deployment Guide for Linux Servers

This guide will walk you through the process of deploying the Techlinx Helpdesk frontend application on a Linux server while maintaining the existing Supabase backend.

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

3. **Nginx** - Web server to serve the static files
   ```bash
   sudo apt update
   sudo apt install nginx
   ```

### Deployment Steps

#### 1. Clone the Repository

```bash
# Navigate to your desired location
cd /var/www

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

#### 4. Configure Nginx

Create a new Nginx site configuration:

```bash
sudo nano /etc/nginx/sites-available/techlinx-helpdesk
```

Add the following configuration (adjust as needed):

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your actual domain

    root /var/www/techlinx-helpdesk/dist;
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

Enable the site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/techlinx-helpdesk /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

#### 5. Set Up SSL (Recommended)

Using Certbot for Let's Encrypt SSL:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Post-Deployment Configuration

After deployment, you need to update the Base URL in the application settings:

1. Log in to the application with admin credentials
2. Navigate to the Settings section
3. Find and update the "Base URL" to match your new domain
4. Save the settings

### Updating the Application

When you need to update the application, follow these steps:

```bash
cd /var/www/techlinx-helpdesk
git pull
npm install  # In case dependencies have changed
npm run build
```

#### Optional: Create an Update Script

Create a script file to simplify updates:

```bash
nano /var/www/techlinx-helpdesk/update.sh
```

Add the following content:

```bash
#!/bin/bash
echo "Updating Techlinx Helpdesk..."
cd /var/www/techlinx-helpdesk
git pull
npm install
npm run build
echo "Update completed: $(date)"
```

Make it executable:

```bash
chmod +x /var/www/techlinx-helpdesk/update.sh
```

Now you can update by running:

```bash
sudo /var/www/techlinx-helpdesk/update.sh
```

### Troubleshooting

#### Application Shows Blank Page or 404

This is often due to routing issues. Ensure your Nginx configuration has the correct `try_files` directive that redirects all requests to `index.html`.

#### API Connection Issues

If the application is having trouble connecting to the Supabase backend:

1. Check the browser console for CORS errors
2. Verify that your domain is allowed in the Supabase project CORS settings

#### Permission Issues

If you encounter permission issues:

```bash
sudo chown -R www-data:www-data /var/www/techlinx-helpdesk
```

#### Nginx Logs

Check Nginx logs for troubleshooting:

```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

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
