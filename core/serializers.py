from rest_framework import serializers
from django.utils import timezone
from .models import FormTemplate, FormVersion, Ticket, Attachment


def build_file_url(request, file_field):
    if not file_field:
        return None
    url = file_field.url
    if request is not None:
        return request.build_absolute_uri(url)
    return url


class FormVersionSerializer(serializers.ModelSerializer):
    fieldCount = serializers.SerializerMethodField()
    publishedAt = serializers.DateTimeField(source='published_at', required=False, allow_null=True)
    pdf = serializers.SerializerMethodField()

    class Meta:
        model = FormVersion
        fields = ['id', 'version', 'status', 'fieldCount', 'publishedAt', 'pdf', 'fields']

    def get_fieldCount(self, obj):
        return len(obj.fields or [])

    def get_pdf(self, obj):
        if not obj.pdf:
            return None
        request = self.context.get('request')
        return {
            'name': obj.pdf_name or obj.pdf.name.rsplit('/', 1)[-1],
            'mime': obj.pdf_mime or 'application/pdf',
            'url': build_file_url(request, obj.pdf)
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

    def get_url(self, obj):
        request = self.context.get('request')
        return build_file_url(request, obj.file)


class TicketSerializer(serializers.ModelSerializer):
    formId = serializers.CharField(source='form_id')
    versionId = serializers.CharField(source='version_id')
    assignedTo = serializers.CharField(source='assigned_to')
    assignedAt = serializers.DateTimeField(source='assigned_at')
    approvalState = serializers.CharField(source='approval_state')
    updatedAt = serializers.DateTimeField(source='updated_at')
    lastError = serializers.CharField(source='last_error', required=False, allow_blank=True)
    attachments = AttachmentSerializer(many=True, read_only=True)
    signature = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = [
            'id', 'title', 'formId', 'versionId', 'assignedTo', 'assignedAt',
            'status', 'approvalState', 'values', 'attachments', 'signature',
            'lastError', 'updatedAt'
        ]

    def get_signature(self, obj):
        if not obj.signature_signer and not obj.signature_file:
            return None
        request = self.context.get('request')
        return {
            'signer': obj.signature_signer or '',
            'url': build_file_url(request, obj.signature_file) if obj.signature_file else None
        }


class TicketUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(required=False)
    assignedTo = serializers.CharField(required=False)
    status = serializers.CharField(required=False)
    approvalState = serializers.CharField(required=False)
    values = serializers.DictField(required=False)
    signature = serializers.DictField(required=False, allow_null=True)

    def update(self, instance: Ticket, validated_data):
        if 'title' in validated_data:
            instance.title = validated_data['title']
        if 'assignedTo' in validated_data:
            instance.assigned_to = validated_data['assignedTo']
        if 'status' in validated_data:
            instance.status = validated_data['status']
        if 'approvalState' in validated_data:
            instance.approval_state = validated_data['approvalState']
        if 'values' in validated_data:
            instance.values = validated_data['values']
        if 'signature' in validated_data:
            sig = validated_data['signature'] or {}
            instance.signature_signer = sig.get('signer', '')
        instance.updated_at = timezone.now()
        instance.save()
        return instance
