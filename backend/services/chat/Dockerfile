FROM node

WORKDIR /app

# Backend/root dependencies
COPY package*.json ./
RUN npm install

# Auth dependencies
WORKDIR /app/services/chat

COPY services/chat/package*.json ./
RUN npm install

# Auth source
COPY services/chat ./

# Shared code
COPY shared /app/shared

EXPOSE 8002

CMD ["npm", "start"]