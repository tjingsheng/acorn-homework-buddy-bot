# Acorn Homework Buddy Bot

Sends automated reminders about upcoming assignments or homework.

## Development Setup

This setup guide walks you through installing and configuring the development environment for the project. By the end of this guide, you will have a fully functional local development setup with all necessary services running. Please follow each step carefully to ensure everything is correctly configured.

1. **Prerequisites**

   Ensure you have the following installed on your system:

   - [**Docker**](https://www.docker.com/products/docker-desktop/) - The #1 containerization software for developers and teams
   - [**Node.js**](https://nodejs.org/en/download/) - JavaScript runtime environment
   - [**pnpm**](https://pnpm.io/installation/) - A fast and disk space-efficient package manager for JavaScript.

2. **Clone the repository:**

   ```sh
   git clone https://github.com/tjingsheng/acorn-homework-buddy-bot.git
   ```

3. **Set up environment variables:**

   Create your local dev environment file by copying the example provided:

   ```sh
   cp .env.example .env
   ```

4. **Install dependencies:**

   Run the following to install all dependencies:

   ```sh
   pnpm install
   ```

5. **Start the development environment:**

   ```sh
   pnpm dev
   ```

## Deployment

### To deploy the bot on an AWS EC2 instance quickly.

1. **Set up SSH Configuration**

   Follow the steps below with the suggested alias

2. **Run the deployment script**

   ```sh
   pnpm ec2
   ```

### To deploy the bot on an AWS EC2 instance manually.

1. **Install dependencies**

   ```sh
   pnpm install
   ```

2. **Build the project locally**

   ```sh
   pnpm build
   ```

3. **Upload the build and environment file to EC2**

   ```sh
   scp ./dist/index.js acorn:~
   scp .env acorn:~
   ```

4. **SSH into the EC2 instance**

   ```sh
   ssh acorn
   ```

5. **Start or restart the bot using PM2**

   - To start the bot:

     ```sh
     pm2 start index.js --name acorn-homework-buddy-bot
     ```

   - To restart the bot after updates:

     ```sh
     pm2 restart acorn-homework-buddy-bot
     ```

6. **(Optional) Save and enable auto-start on reboot**

   ```sh
   pm2 save
   pm2 startup
   ```

   Then run the command PM2 prints to complete the setup.

## SSH Configuration

To simplify connecting to the EC2 instance, you can configure an SSH alias named `acorn`.

1. **Move your EC2 `.pem` key to the `.ssh` directory (if not already done)**

   ```sh
   mv ~/Downloads/acorn-homework-buddy-bot.pem ~/.ssh/
   chmod 400 ~/.ssh/acorn-homework-buddy-bot.pem
   ```

2. **Edit your SSH config file**

   Open or create `~/.ssh/config`:

   ```sh
   vim ~/.ssh/config
   ```

3. **Add the following block (replace values accordingly)**

   ```ini
   Host acorn
       HostName ec2-XX-XX-XX-XX.ap-southeast-1.compute.amazonaws.com
       User ec2-user
       IdentityFile ~/.ssh/acorn-homework-buddy-bot.pem
   ```

   - `HostName`: Your EC2 instance's public DNS or IP address
   - `User`: Use `ec2-user` for Amazon Linux, `ubuntu` for Ubuntu
   - `IdentityFile`: Full path to your `.pem` key file

4. **Save and close the file**

   In vim, use the command `:wq`

5. **Test the SSH alias**

   ```sh
   ssh acorn
   ```

   If successful, you’ll connect without typing the full address again.
