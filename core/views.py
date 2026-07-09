import json
import os
import tempfile
import traceback

import requests as http_requests
from django.http import JsonResponse, StreamingHttpResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from yt_dlp import YoutubeDL


def index(request):
    return render(request, "index.html")


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) "
        "Version/16.0 Mobile/15E148 Safari/604.1"
    ),
    "Referer": "https://www.instagram.com/",
}


def get_ydl_opts():
    """
    ydl_opts میسازه و اگر کوکی توی env بود
    یه فایل موقت میسازه و بهش میده
    """
    opts = {
        "quiet":         True,
        "no_warnings":   True,
        "skip_download": True,
        "http_headers":  HEADERS,
    }

    # ✅ کوکی از environment variable
    cookies_content = os.environ.get("INSTAGRAM_COOKIES", "").strip()

    if cookies_content:
        # یه فایل موقت میسازیم چون yt-dlp فایل میخواد نه string
        tmp = tempfile.NamedTemporaryFile(
            mode="w",
            suffix=".txt",
            delete=False,
            encoding="utf-8"
        )
        tmp.write(cookies_content)
        tmp.close()
        opts["cookiefile"] = tmp.name
    else:
        # اگر env نبود، دنبال فایل توی پروژه بگرد
        BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        local_cookies = os.path.join(BASE_DIR, "cookies.txt")
        if os.path.exists(local_cookies):
            opts["cookiefile"] = local_cookies

    return opts


@csrf_exempt
def download_api(request):
    try:
        if request.method != "POST":
            return JsonResponse({"ok": False, "error": "POST only"})

        data    = json.loads(request.body or "{}")
        url     = data.get("url", "").strip()
        quality = data.get("quality", "best")
        mode    = data.get("mode", "video")

        if not url:
            return JsonResponse({"ok": False, "error": "URL is empty"})

        ydl_opts = get_ydl_opts()

        if mode == "audio":
            return _handle_audio(url, ydl_opts)
        return _handle_video(url, quality, ydl_opts)

    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"ok": False, "error": str(e)})


def _handle_video(url, quality, ydl_opts):
    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    formats = info.get("formats") or []

    merged = [
        f for f in formats
        if f.get("vcodec") not in (None, "none")
        and f.get("acodec") not in (None, "none")
        and f.get("url")
    ]

    if not merged:
        merged = [f for f in formats if f.get("url")]

    if not merged:
        return JsonResponse({"ok": False, "error": "هیچ فرمتی پیدا نشد"})

    height_limit = {"480": 480, "720": 720, "1080": 1080}.get(quality)

    if height_limit:
        filtered = [f for f in merged if (f.get("height") or 9999) <= height_limit]
        pool = filtered if filtered else merged
    else:
        pool = merged

    best = max(pool, key=lambda f: (f.get("height") or 0, f.get("tbr") or 0))
    actual_height = best.get("height")

    return JsonResponse({
        "ok":           True,
        "title":        info.get("title", ""),
        "thumbnail":    info.get("thumbnail", ""),
        "url":          best["url"],
        "quality_note": f"{actual_height}p" if actual_height else "auto",
        "ext":          best.get("ext", "mp4"),
    })


def _handle_audio(url, ydl_opts):
    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    formats = info.get("formats") or []

    candidates = [
        f for f in formats
        if f.get("acodec") not in (None, "none")
        and f.get("url")
    ]

    if not candidates:
        return JsonResponse({"ok": False, "error": "صدایی پیدا نشد"})

    best = max(candidates, key=lambda f: f.get("abr") or f.get("tbr") or 0)

    return JsonResponse({
        "ok":        True,
        "title":     info.get("title", ""),
        "thumbnail": info.get("thumbnail", ""),
        "url":       best["url"],
        "ext":       "mp3",
    })


@csrf_exempt
def proxy_download(request):
    try:
        file_url = request.GET.get("url", "")
        filename = request.GET.get("filename", "instagram.mp4")

        if not file_url:
            return JsonResponse({"ok": False, "error": "URL missing"})

        r = http_requests.get(file_url, headers=HEADERS, stream=True, timeout=60)
        r.raise_for_status()

        if filename.endswith(".mp3"):
            content_type = "audio/mpeg"
        elif filename.endswith(".mp4"):
            content_type = "video/mp4"
        else:
            content_type = r.headers.get("Content-Type", "application/octet-stream")

        response = StreamingHttpResponse(
            r.iter_content(chunk_size=8192),
            content_type=content_type,
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        content_length = r.headers.get("Content-Length")
        if content_length:
            response["Content-Length"] = content_length

        return response

    except Exception as e:
        traceback.print_exc()
        return JsonResponse({"ok": False, "error": str(e)})
