# 🔧 Environment Setup Guide

## Required Environment Variables

Create a `.env` file in your `lumi6-backend` directory with the following variables:

```bash
# Database Configuration
DATABASE_URL="postgresql://admin:securepass@localhost:5432/lumi6"

# Authentication
JWT_SECRET="your_very_secure_jwt_secret_at_least_32_characters_long"

# OpenAI Configuration (use your existing API key)
OPENAI_API_KEY="sk-your_actual_openai_api_key_here"

# Whisper Configuration
WHISPER_MODE=api  # Set to 'api' for OpenAI Whisper API (recommended)
LOCAL_WHISPER_URL=http://localhost:8000/transcribe

# Server Configuration
PORT=4000
NODE_ENV=development
```

## Frontend Configuration

Create a `.env` file in your frontend `src` directory:

```bash
# API Configuration
VITE_API_URL=http://localhost:4000
```

## ✅ What's Fixed

1. **Port Mismatch**: All API calls now use port 4000
2. **Whisper Integration**: Ready to use OpenAI API
3. **Report Format**: Enhanced with detailed scoring and transcripts
4. **Error Handling**: Better error messages and loading states

## 🚀 Next Steps

1. Add `WHISPER_MODE=api` to your `.env` file
2. Restart your backend server
3. Test the candidate view functionality - should work now!

## 📊 Report Improvements

The candidate report now includes:
- ✅ **Enhanced Visual Design** - Modern cards and better layout
- ✅ **Detailed Scoring** - Individual metrics with progress bars
- ✅ **AI Feedback** - Direct display of evaluation feedback
- ✅ **Speech Transcript** - Full transcript display
- ✅ **CEFR Reference** - Interactive level guide
- ✅ **Improved PDF Export** - Professional formatting 