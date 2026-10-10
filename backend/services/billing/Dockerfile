FROM node

WORKDIR /app

# Backend/root dependencies
COPY package*.json ./
RUN npm install

# Auth dependencies
WORKDIR /app/services/billing

COPY services/billing/package*.json ./
RUN npm install

# Auth source
COPY services/billing ./

# Shared code
COPY shared /app/shared

EXPOSE 8004

CMD ["npm", "start"]