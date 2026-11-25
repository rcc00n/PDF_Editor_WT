import os
from pathlib import Path
import subprocess
import sys
import tempfile

from django.test import SimpleTestCase


class ProductionConfigurationTests(SimpleTestCase):
    def load_settings(self, debug, key=None):
        with tempfile.TemporaryDirectory() as directory:
            env = {k: v for k, v in os.environ.items()
                   if k not in {'DJANGO_SECRET_KEY', 'DJANGO_SETTINGS_MODULE', 'DATABASE_URL'}}
            env.update(DJANGO_DEBUG=debug, DATA_DIR=directory)
            if key is not None:
                env['DJANGO_SECRET_KEY'] = key
            return subprocess.run(
                [sys.executable, '-c', 'import relayforms.settings'],
                cwd=Path(__file__).resolve().parents[2], env=env,
                capture_output=True, text=True, timeout=15,
            )

    def test_production_rejects_missing_placeholder_and_short_keys(self):
        for key in (None, '', '  ', 'insecure-change-me', 'short'):
            with self.subTest(case='invalid production key'):
                result = self.load_settings('false', key)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('Production requires an explicit DJANGO_SECRET_KEY', result.stderr)

    def test_production_accepts_explicit_configuration(self):
        self.assertEqual(self.load_settings('false', 'synthetic-test-only-' * 4).returncode, 0)

    def test_local_debug_can_use_development_fallback(self):
        self.assertEqual(self.load_settings('true').returncode, 0)
