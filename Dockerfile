FROM mcr.microsoft.com/playwright:focal

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Install Playwright browsers
RUN npx playwright install chromium

EXPOSE 3000
CMD ["node", "server.js"] 