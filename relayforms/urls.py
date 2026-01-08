import os
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include

urlpatterns = [
    path('api/', include('core.urls')),
]

if settings.DEBUG or os.getenv('SERVE_MEDIA', '').lower() in {'1', 'true', 'yes'}:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
