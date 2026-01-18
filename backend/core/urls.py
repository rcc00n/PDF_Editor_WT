from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    AccessGroupDetailView,
    AccessGroupListCreateView,
    EmployeeDetailView,
    EmployeeListCreateView,
    FormArchiveView,
    FormDetailView,
    FormListCreateView,
    FormVersionCreateView,
    FormVersionFieldDeleteView,
    FormVersionFieldUpsertView,
    FormVersionPdfUploadView,
    FormVersionPublishView,
    HealthView,
    MeView,
    TicketApproveView,
    TicketAttachmentUploadView,
    TicketDetailView,
    TicketListCreateView,
    TicketSignatureUploadView,
    TicketSubmitView,
)

# Health/auth endpoints.
health_patterns = [
    path('health/', HealthView.as_view()),
]
auth_patterns = [
    path('auth/token/', TokenObtainPairView.as_view()),
    path('auth/refresh/', TokenRefreshView.as_view()),
    path('auth/me/', MeView.as_view()),
]

# Form endpoints.
form_patterns = [
    path('forms/', FormListCreateView.as_view()),
    path('forms/<str:form_id>/', FormDetailView.as_view()),
    path('forms/<str:form_id>/archive/', FormArchiveView.as_view()),
    path('forms/<str:form_id>/versions/', FormVersionCreateView.as_view()),
    path('forms/<str:form_id>/versions/<str:version_id>/publish/', FormVersionPublishView.as_view()),
    path('forms/<str:form_id>/versions/<str:version_id>/pdf/', FormVersionPdfUploadView.as_view()),
    path('forms/<str:form_id>/versions/<str:version_id>/fields/', FormVersionFieldUpsertView.as_view()),
    path('forms/<str:form_id>/versions/<str:version_id>/fields/<str:field_id>/', FormVersionFieldDeleteView.as_view()),
]

# Ticket endpoints.
ticket_patterns = [
    path('tickets/', TicketListCreateView.as_view()),
    path('tickets/<str:ticket_id>/', TicketDetailView.as_view()),
    path('tickets/<str:ticket_id>/submit/', TicketSubmitView.as_view()),
    path('tickets/<str:ticket_id>/approve/', TicketApproveView.as_view()),
    path('tickets/<str:ticket_id>/attachments/', TicketAttachmentUploadView.as_view()),
    path('tickets/<str:ticket_id>/signature/', TicketSignatureUploadView.as_view()),
]

# Employee and group endpoints.
employee_patterns = [
    path('employees/', EmployeeListCreateView.as_view()),
    path('employees/<str:employee_id>/', EmployeeDetailView.as_view()),
]
group_patterns = [
    path('groups/', AccessGroupListCreateView.as_view()),
    path('groups/<str:group_id>/', AccessGroupDetailView.as_view()),
]

urlpatterns = [
    *health_patterns,
    *auth_patterns,
    *form_patterns,
    *ticket_patterns,
    *employee_patterns,
    *group_patterns,
]
