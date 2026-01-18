from django.conf import settings
from django.urls import include, path, re_path
from django.views.static import serve as static_serve

api_patterns = [
    path('api/', include('core.urls')),
]

media_patterns = [
    # Media is served by Django; use a real media server in production.
    re_path(r'^media/(?P<path>.*)$', static_serve, {'document_root': settings.MEDIA_ROOT}),
]

urlpatterns = [
    *api_patterns,
    *media_patterns,
]
