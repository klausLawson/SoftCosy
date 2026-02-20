from django.contrib import admin

# Register your models here.
# audit/admin.py (ou dans une app qui gère l'admin)

from django.contrib import admin
from django.utils.html import format_html
from stockmouvement.models import Alert

@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ['titre', 'severite', 'type', 'dateAlerte', 'estLue', 'estResolue']
    list_filter = ['severite', 'type', 'estLue']

    def changelist_view(self, request, extra_context=None):
        alerts = Alert.objects.filter(estLue=False, estResolue=False)
        if alerts.exists():
            messages = []
            for alert in alerts:
                messages.append(f"<strong>{alert.titre}</strong>: {alert.message}")
            extra_context = extra_context or {}
            extra_context['alert_messages'] = messages
        return super().changelist_view(request, extra_context=extra_context)