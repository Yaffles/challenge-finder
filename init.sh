#!/bin/bash
mkdir -p src/{components,pages/api,pages/map,styles,utils,lib} public/images prisma scripts
touch .env.local src/pages/_app.js src/styles/globals.css README.md
echo "Initialized project structure!"
