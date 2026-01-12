from django.db import migrations


def ensure_accessgroup_tables(apps, schema_editor):
    AccessGroup = apps.get_model('core', 'AccessGroup')
    existing = set(schema_editor.connection.introspection.table_names())

    if AccessGroup._meta.db_table not in existing:
        schema_editor.create_model(AccessGroup)
        existing = set(schema_editor.connection.introspection.table_names())

    for m2m in (AccessGroup.employees.through, AccessGroup.forms.through):
        table = m2m._meta.db_table
        if table not in existing:
            schema_editor.create_model(m2m)
            existing.add(table)


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0002_accessgroup_all_except'),
    ]

    operations = [
        migrations.RunPython(ensure_accessgroup_tables, migrations.RunPython.noop),
    ]
