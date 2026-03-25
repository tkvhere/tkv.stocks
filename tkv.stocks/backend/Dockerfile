FROM python:3.11-slim
WORKDIR /usr/src/app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Normalize line endings for shell scripts copied from Windows hosts
RUN if [ -f /usr/src/app/start.sh ]; then sed -i 's/\r$//' /usr/src/app/start.sh || true; fi
CMD ["python", "-u", "app/__init__.py"]
