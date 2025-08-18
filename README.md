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

1. **Build the project**

   ```sh
   pnpm build
   ```

2. **Deploy the project**

   Copy the code to AWS lambda

3. **Register the Webhook**

   ```sh
   curl -X POST "https://api.telegram.org/bot<TELEGRAM_TOKEN>/setWebhook" \
     -d "url=<LAMBDA_FUNCTION_URL>"
     -d "secret_token=<WEBHOOK_TOKEN>"
   ```
