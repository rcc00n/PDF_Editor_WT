from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='accessgroup',
            name='include_all_employees',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='accessgroup',
            name='include_all_forms',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='accessgroup',
            name='excluded_employees',
            field=models.ManyToManyField(blank=True, related_name='excluded_from_access_groups', to='core.employee'),
        ),
        migrations.AddField(
            model_name='accessgroup',
            name='excluded_forms',
            field=models.ManyToManyField(blank=True, related_name='excluded_from_access_groups', to='core.formtemplate'),
        ),
    ]
