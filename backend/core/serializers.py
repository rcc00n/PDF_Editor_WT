from __future__ import annotations

from typing import Any, Optional

from django.db.models.fields.files import FieldFile
from django.utils import timezone
from rest_framework import serializers
from rest_framework.request import Request

from .models import (
    AccessGroup,
    Attachment,
    Employee,
    FormTemplate,
    FormVersion,
    Ticket,
    TicketApprovalState,
    TicketStatus,
)


def build_file_url(request: Optional[Request], file_field: Optional[FieldFile]) -> Optional[str]:
    """Build absolute URL for a file field, or return None if empty."""
    if not file_field:
        return None
    url = file_field.url
    return request.build_absolute_uri(url) if request else url


class FormVersionSerializer(serializers.ModelSerializer):
    fieldCount = serializers.SerializerMethodField()
    publishedAt = serializers.DateTimeField(source='published_at', read_only=True)
    pdf = serializers.SerializerMethodField()

    class Meta:
        model = FormVersion
        fields = ['id', 'version', 'status', 'fieldCount', 'publishedAt', 'pdf', 'fields']

    def get_fieldCount(self, obj: FormVersion) -> int:
        return len(obj.fields or [])

    def get_pdf(self, obj: FormVersion) -> Optional[dict[str, str]]:
        if not obj.pdf:
            return None
        request: Optional[Request] = self.context.get('request')
        return {
            'name': obj.pdf_name or obj.pdf.name.rsplit('/', 1)[-1],
            'mime': obj.pdf_mime or 'application/pdf',
            'url': build_file_url(request, obj.pdf),
        }


class FormTemplateSerializer(serializers.ModelSerializer):
    versions = FormVersionSerializer(many=True)

    class Meta:
        model = FormTemplate
        fields = ['id', 'name', 'subtitle', 'versions']


class AttachmentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = Attachment
        fields = ['id', 'name', 'mime', 'url']

    def get_url(self, obj: Attachment) -> Optional[str]:
        request: Optional[Request] = self.context.get('request')
        return build_file_url(request, obj.file)


class TicketSerializer(serializers.ModelSerializer):
    formId = serializers.CharField(source='form_id', read_only=True)
    versionId = serializers.CharField(source='version_id', read_only=True)
    assignedTo = serializers.CharField(source='assigned_to', read_only=True)
    assignedAt = serializers.DateTimeField(source='assigned_at', read_only=True)
    approvalState = serializers.CharField(source='approval_state', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    lastError = serializers.CharField(source='last_error', read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)
    signature = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = [
            'id', 'title', 'formId', 'versionId', 'assignedTo', 'assignedAt',
            'status', 'approvalState', 'values', 'attachments', 'signature',
            'lastError', 'updatedAt'
        ]

    def get_signature(self, obj: Ticket) -> Optional[dict[str, Any]]:
        if not obj.signature_signer and not obj.signature_file:
            return None
        request: Optional[Request] = self.context.get('request')
        return {
            'signer': obj.signature_signer or '',
            'url': build_file_url(request, obj.signature_file) if obj.signature_file else None,
        }


class TicketUpdateSerializer(serializers.Serializer):
    """Partial update serializer for Ticket with validated status choices."""

    title = serializers.CharField(required=False)
    assignedTo = serializers.CharField(required=False)
    # Validate against model enums to reject invalid values.
    status = serializers.ChoiceField(choices=TicketStatus.choices, required=False)
    approvalState = serializers.ChoiceField(choices=TicketApprovalState.choices, required=False)
    values = serializers.DictField(required=False)
    signature = serializers.DictField(required=False, allow_null=True)

    # Map incoming camelCase keys to model snake_case attributes.
    _FIELD_MAP: dict[str, str] = {
        'title': 'title',
        'assignedTo': 'assigned_to',
        'status': 'status',
        'approvalState': 'approval_state',
        'values': 'values',
    }

    def update(self, instance: Ticket, validated_data: dict[str, Any]) -> Ticket:
        for api_key, model_attr in self._FIELD_MAP.items():
            if api_key in validated_data:
                setattr(instance, model_attr, validated_data[api_key])

        if 'signature' in validated_data:
            sig = validated_data['signature'] or {}
            instance.signature_signer = sig.get('signer', '')

        instance.updated_at = timezone.now()
        instance.save()
        return instance


class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ['id', 'name', 'email', 'role', 'phone', 'active']


class AccessGroupSerializer(serializers.ModelSerializer):
    employeeIds = serializers.PrimaryKeyRelatedField(source='employees', many=True, queryset=Employee.objects.all(), required=False)
    formIds = serializers.PrimaryKeyRelatedField(source='forms', many=True, queryset=FormTemplate.objects.all(), required=False)
    includeAllEmployees = serializers.BooleanField(source='include_all_employees', required=False)
    includeAllForms = serializers.BooleanField(source='include_all_forms', required=False)
    excludedEmployeeIds = serializers.PrimaryKeyRelatedField(source='excluded_employees', many=True, queryset=Employee.objects.all(), required=False)
    excludedFormIds = serializers.PrimaryKeyRelatedField(source='excluded_forms', many=True, queryset=FormTemplate.objects.all(), required=False)

    class Meta:
        model = AccessGroup
        fields = ['id', 'name', 'description', 'includeAllEmployees', 'includeAllForms', 'employeeIds', 'formIds', 'excludedEmployeeIds', 'excludedFormIds']
