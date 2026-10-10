FROM node

WORKDIR /app

# Backend/root dependencies
COPY package*.json ./
RUN npm install

# Auth dependencies
WORKDIR /app/services/agents

COPY services/agents/package*.json ./
RUN npm install

# Auth source
COPY services/agents ./

# Shared code
COPY shared /app/shared

EXPOSE 8002

CMD ["npm", "start"]