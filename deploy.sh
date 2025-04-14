#!/bin/bash

# Add all files
git add .

# Commit changes
git commit -m "Deploy to GitHub Pages"

# Push to main branch
git push origin main

echo "Deployment initiated! Check GitHub Actions for progress." 