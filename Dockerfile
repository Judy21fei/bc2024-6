FROM node:16

WORKDIR /bc2024-6

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000 9229

CMD npx nodemon --legacy-watch -- --inspect main.js -h localhost -p 3000 -c ./cache
