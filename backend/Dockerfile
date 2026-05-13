FROM node:20-alpine

RUN apk add --no-cache python3 make g++ sqlite

WORKDIR /app

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY . .

RUN mkdir -p /app/data /app/uploads

EXPOSE 1208

CMD ["node", "src/index.js"]
