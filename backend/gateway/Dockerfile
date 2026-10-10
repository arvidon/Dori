FROM node

WORKDIR /app

# Root/backend dependencies
COPY package*.json ./
RUN npm install

# Gateway dependencies
COPY gateway/package*.json ./gateway/
RUN cd gateway && npm install

# Gateway source
COPY gateway ./gateway

# Shared source
COPY shared ./shared

WORKDIR /app/gateway

EXPOSE 8000

CMD ["npm", "start"]