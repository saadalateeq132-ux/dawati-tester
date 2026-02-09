#!/bin/bash

echo "================================================"
echo "🚀 Vertex AI Testing System - Setup"
echo "================================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. Current: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Check gcloud
if ! command -v gcloud &> /dev/null; then
    echo "⚠️  gcloud CLI not found. You'll need it for Vertex AI."
    echo "   Install from: https://cloud.google.com/sdk/docs/install"
    echo ""
else
    echo "✅ gcloud CLI detected"
    echo ""
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ npm install failed"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Install Playwright browsers
echo "🌐 Installing Playwright browsers..."
npx playwright install chromium

if [ $? -ne 0 ]; then
    echo "❌ Playwright browser installation failed"
    exit 1
fi

echo "✅ Playwright browsers installed"
echo ""

# Setup .env
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env created - please edit with your configuration"
else
    echo "ℹ️  .env already exists"
fi

echo ""

# Create directories
echo "📁 Creating directories..."
mkdir -p baselines
mkdir -p artifacts
mkdir -p reports

echo "✅ Directories created"
echo ""

# Check Google Cloud auth
echo "🔑 Checking Google Cloud authentication..."

if gcloud auth application-default print-access-token &> /dev/null; then
    echo "✅ Google Cloud authenticated"
    PROJECT=$(gcloud config get-value project 2>/dev/null)
    if [ -n "$PROJECT" ]; then
        echo "   Project: $PROJECT"
    fi
else
    echo "⚠️  Not authenticated with Google Cloud"
    echo ""
    echo "Run these commands:"
    echo "  1. gcloud auth application-default login"
    echo "  2. gcloud config set project YOUR_PROJECT_ID"
fi

echo ""
echo "================================================"
echo "✅ Setup Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your configuration"
echo "  2. Authenticate with Google Cloud (if not done):"
echo "     gcloud auth application-default login"
echo "  3. Run a test:"
echo "     npm test"
echo ""
echo "Documentation: README.md"
echo "================================================"
