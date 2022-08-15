FROM python:3.10-slim-buster

WORKDIR /app

COPY requirements.txt .
RUN pip3 install -r requirements.txt

COPY main.py .

ENTRYPOINT ["python3", "/app/main.py"]