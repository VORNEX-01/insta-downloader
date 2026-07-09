from django.urls import path
from . import views

urlpatterns = [
    path("",                  views.index,          name="index"),
    path("api/download/",     views.download_api,   name="download_api"),
    path("api/proxy/",        views.proxy_download, name="proxy_download"),
]