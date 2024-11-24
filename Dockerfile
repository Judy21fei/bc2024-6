# Використовуємо офіційний образ Node.js
FROM node:18

# Встановлюємо робочу директорію
WORKDIR /app

# Копіюємо файл package.json і встановлюємо залежності
COPY package*.json ./
RUN npm install

# Копіюємо всі файли проекту в контейнер
COPY . .

# Вказуємо порт, на якому буде працювати ваш сервер
EXPOSE 3001

# Команда для запуску програми
CMD ["npm", "start"]
