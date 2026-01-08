release: python manage.py migrate --run-syncdb && python manage.py seed_initial
web: gunicorn relayforms.wsgi --log-file - --bind 0.0.0.0:$PORT
