from django.apps import AppConfig


class StockmouvementConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'stockmouvement'

    def ready(self):
        import stockmouvement.signals