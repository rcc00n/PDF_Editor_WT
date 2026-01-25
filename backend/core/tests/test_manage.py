import importlib.util
from pathlib import Path
from unittest import mock

from django.test import SimpleTestCase


class ManagePyTests(SimpleTestCase):
    def test_manage_import_error_message(self):
        manage_path = Path(__file__).resolve().parents[2] / 'manage.py'
        spec = importlib.util.spec_from_file_location('manage_test', manage_path)
        manage = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(manage)

        real_import = __import__

        def guarded_import(name, globals=None, locals=None, fromlist=(), level=0):
            if name == 'django.core.management':
                raise ImportError('no django')
            return real_import(name, globals, locals, fromlist, level)

        self.assertIsNotNone(guarded_import('json'))
        with mock.patch('builtins.__import__', side_effect=guarded_import):
            with self.assertRaises(ImportError) as ctx:
                manage.main()
        self.assertIn("Couldn't import Django", str(ctx.exception))
