#!/bin/bash

# Install dependencies
echo "Installing dependencies..."
pnpm install || { echo "❌ Install failed"; exit 1; }

# Build the bot
echo "Building project..."
pnpm build || { echo "❌ Build failed"; exit 1; }

# Upload files to EC2 using SSH alias 'acorn'
echo "Uploading files to EC2..."
scp ./dist/index.js acorn:~ || exit 1
scp .env acorn:~ || exit 1

# Restart the bot via SSH + PM2
echo "Restarting bot on EC2..."
ssh acorn 'pm2 restart acorn-homework-buddy-bot || pm2 start index.js --name acorn-homework-buddy-bot'

echo "Deployment complete."
