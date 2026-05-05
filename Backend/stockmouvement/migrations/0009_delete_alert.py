from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('stockmouvement', '0008_add_product_to_stockmovement'),
    ]

    operations = [
        migrations.DeleteModel(
            name='Alert',
        ),
    ]
