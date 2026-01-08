from django.conf import settings
from django.urls import path, include, re_path
from django.views.static import serve as static_serve

urlpatterns = [
    path('api/', include('core.urls')),
]

urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', static_serve, {'document_root': settings.MEDIA_ROOT}),
]
