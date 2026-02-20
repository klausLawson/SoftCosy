# audit/serializers.py
from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True, allow_null=True)

    class Meta:
        model = AuditLog
        fields = [
            'id',
            'user',
            'user_email',
            'action',
            'enitity',
            'object_id',
            'perform_at',
            'user_agent',
            # data_before et data_after → optionnels car souvent volumineux
        ]
        read_only_fields = fields  # tout en lecture seule