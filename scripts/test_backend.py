"""CI/reviewer runner: temporary SQLite/media, synthetic settings, no network."""
import os
from pathlib import Path
import socket
import sys
import tempfile

root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root / 'backend'))
os.environ['DJANGO_SETTINGS_MODULE'] = 'relayforms.test_settings'
os.environ['DJANGO_DEBUG'] = 'false'
os.environ['DJANGO_SECRET_KEY'] = 'synthetic-test-only-not-a-production-secret-' * 2


def blocked(*args, **kwargs):
    raise RuntimeError('Network is forbidden in the isolated regression suite')


socket.socket.connect = blocked
socket.socket.connect_ex = blocked
socket.create_connection = blocked
with tempfile.TemporaryDirectory(prefix='pdf-workflow-tests-') as directory:
    os.environ['DATA_DIR'] = directory
    from django.core.management import execute_from_command_line
    execute_from_command_line(['manage.py', *(sys.argv[1:] or ['test', 'core'])])
