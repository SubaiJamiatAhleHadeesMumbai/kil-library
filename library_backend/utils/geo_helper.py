# utils/geo_helper.py
import urllib.request
import json
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# In-memory cache for IP lookups to eliminate redundant network calls
_GEO_CACHE: Dict[str, Dict[str, str]] = {}


def extract_client_ip(request) -> str:
    """
    Extracts the client IP, prioritizing reverse proxies / Cloudflare headers.
    """
    # 1. Cloudflare header
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip:
        return cf_ip.strip()

    # 2. X-Forwarded-For (first IP in comma-separated list)
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0].strip()
        if ip:
            return ip

    # 3. X-Real-IP
    x_real_ip = request.headers.get("x-real-ip")
    if x_real_ip:
        return x_real_ip.strip()

    # 4. FastAPI client host fallback
    if request.client and request.client.host:
        return request.client.host.strip()

    return "127.0.0.1"


def resolve_geo_location(request_or_ip, ip: str = None) -> Dict[str, str]:
    """
    Resolves country, country_code, region, and city from request headers or IP lookup.
    Can be called as resolve_geo_location(request, ip) or resolve_geo_location(ip).
    """
    if isinstance(request_or_ip, str):
        ip = request_or_ip
        request = None
    else:
        request = request_or_ip
        if not ip:
            ip = extract_client_ip(request) if request else "127.0.0.1"

    # 1. Check Cloudflare direct headers (Instant 0-ms lookup on production)
    if request and hasattr(request, "headers"):
        cf_country = request.headers.get("cf-ipcountry")
        cf_city = request.headers.get("cf-ipcity")

        if cf_country and cf_country != "XX":
            return {
                "country": cf_country,
                "country_code": cf_country,
                "region": request.headers.get("cf-region", "Maharashtra"),
                "city": cf_city or "Mumbai"
            }

    # 2. Check in-memory cache
    if not ip:
        ip = "127.0.0.1"

    if ip in _GEO_CACHE:
        return _GEO_CACHE[ip]

    # 3. Check for Localhost / Private IPs
    if ip in ("127.0.0.1", "localhost", "::1") or ip.startswith(("192.168.", "10.", "172.16.")):
        result = {
            "country": "India",
            "country_code": "IN",
            "region": "Maharashtra",
            "city": "Mumbai"
        }
        _GEO_CACHE[ip] = result
        return result

    # 4. Fallback lightweight lookup with timeout
    try:
        url = f"http://ip-api.com/json/{ip}?fields=status,country,countryCode,regionName,city"
        req = urllib.request.Request(url, headers={"User-Agent": "KilLibraryAnalytics/1.0"})
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                if data.get("status") == "success":
                    result = {
                        "country": data.get("country", "India"),
                        "country_code": data.get("countryCode", "IN"),
                        "region": data.get("regionName", "Maharashtra"),
                        "city": data.get("city", "Mumbai")
                    }
                    _GEO_CACHE[ip] = result
                    return result
    except Exception as e:
        logger.debug(f"Geo-IP lookup notice for {ip}: {e}")

    default_result = {
        "country": "India",
        "country_code": "IN",
        "region": "Maharashtra",
        "city": "Mumbai"
    }
    _GEO_CACHE[ip] = default_result
    return default_result


def parse_device_info(user_agent: str) -> Dict[str, str]:
    """
    Classifies user agent into mobile, tablet, or desktop and identifies browser.
    """
    if not user_agent:
        return {"device_type": "desktop", "browser": "Unknown"}

    ua_lower = user_agent.lower()

    # Device type
    if "ipad" in ua_lower or "tablet" in ua_lower or "playbook" in ua_lower or "silk" in ua_lower:
        device_type = "tablet"
    elif "mobile" in ua_lower or "iphone" in ua_lower or "android" in ua_lower or "phone" in ua_lower:
        device_type = "mobile"
    else:
        device_type = "desktop"

    # Browser
    if "edg" in ua_lower:
        browser = "Microsoft Edge"
    elif "chrome" in ua_lower and "chromium" not in ua_lower:
        browser = "Google Chrome"
    elif "safari" in ua_lower and "chrome" not in ua_lower:
        browser = "Safari"
    elif "firefox" in ua_lower:
        browser = "Mozilla Firefox"
    elif "opera" in ua_lower or "opr" in ua_lower:
        browser = "Opera"
    else:
        browser = "Web Browser"

    return {"device_type": device_type, "browser": browser}
