import importlib

from django.apps import apps
from django.test import TestCase


class DummyIntrospection:
    def __init__(self, tables):
        self._tables = tables

    def table_names(self):
        return list(self._tables)


class DummyConnection:
    def __init__(self, tables):
        self.introspection = DummyIntrospection(tables)


class DummySchemaEditor:
    def __init__(self, tables):
        self.connection = DummyConnection(tables)
        self.created = []

    def create_model(self, model):
        table = model._meta.db_table
        self.created.append(table)
        self.connection.introspection._tables.add(table)


class MigrationUtilityTests(TestCase):
    def test_ensure_accessgroup_tables_creates_missing(self):
        migration = importlib.import_module('core.migrations.0003_accessgroup_tables')
        schema_editor = DummySchemaEditor(set())
        migration.ensure_accessgroup_tables(apps, schema_editor)
        self.assertTrue(schema_editor.created)
