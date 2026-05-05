from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = "Supprime toutes les données de test sauf les utilisateurs."

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirmer la suppression sans prompt interactif',
        )

    def handle(self, *args, **options):
        if not options['confirm']:
            self.stdout.write(self.style.WARNING(
                '\nATTENTION : Cette commande va supprimer TOUTES les données '
                '(produits, stocks, ventes, achats, inventaires).\n'
                'Les utilisateurs seront conservés.\n'
                'Relancer avec --confirm pour exécuter.\n'
            ))
            return

        tables = [
            'saleline',
            'sale',
            'stockmovement',
            'stock',
            'variant',
            'product',
            'category',
            'purchaseline',
            'purchase',
            'inventoryline',
            'inventorycount',
            'systemsettings',
        ]

        with connection.cursor() as c:
            c.execute(
                f"TRUNCATE TABLE {', '.join(tables)} RESTART IDENTITY CASCADE;"
            )

        self.stdout.write(self.style.SUCCESS(
            f'{len(tables)} tables vidées. Utilisateurs conservés.'
        ))
