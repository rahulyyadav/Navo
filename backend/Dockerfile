FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.lock ./
RUN pip install --no-cache-dir -r requirements.lock && useradd --create-home navo
COPY app ./app
USER navo
EXPOSE 8000
CMD ["python", "-m", "app.serve"]
