# Build the React/Vite frontend first.
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Run Flask + the sensor simulator from one container.
FROM python:3.12-slim
WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

COPY food_safety_poc/requirements.txt /app/food_safety_poc/requirements.txt
RUN pip install --no-cache-dir -r /app/food_safety_poc/requirements.txt

COPY food_safety_poc /app/food_safety_poc
COPY --from=frontend-build /app/dist /app/dist

EXPOSE 10000

CMD ["sh", "-c", "python food_safety_poc/sensor_simulator.py & exec gunicorn --chdir food_safety_poc app:app --bind 0.0.0.0:${PORT:-10000} --workers 1 --threads 4 --timeout 120"]
