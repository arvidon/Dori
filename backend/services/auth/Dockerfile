FROM node

WORKDIR /app

# Backend/root dependencies
COPY package*.json ./
RUN npm install

# Auth dependencies
WORKDIR /app/services/auth

COPY services/auth/package*.json ./
RUN npm install

# Auth source
COPY services/auth ./

# Shared code
COPY shared /app/shared

EXPOSE 8001

CMD ["npm", "start"]