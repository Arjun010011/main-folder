import requests
from django import template
from googletrans import Translator

register = template.Library()

@register.filter
def get_item(dictionary, key):
    """Custom filter to get dict key with spaces"""
    return dictionary.get(key, "")

translator = Translator()

def google_transliterate(text, lang_code="kn"):
    """Transliterate a single piece of text safely using Google Input Tools API"""
    if not text:
        return ""
    try:
        url = "https://inputtools.google.com/request"
        params = {
            "text": text,
            "itc": f"{lang_code}-t-i0-und",
            "num": 5,
            "cp": 0,
            "cs": 1,
            "ie": "utf-8",
            "oe": "utf-8",
        }
        response = requests.get(url, params=params, timeout=5)
        data = response.json()
        if data[0] == "SUCCESS":
            return data[1][0][1][0]  # top suggestion
        return None
    except Exception:
        return None
    
    
@register.filter(name="to_kannada")
def to_kannada(value):
    if not value:
        return ""
    try:
        parts = [p.strip() for p in str(value).split(",")]
        transliterated_parts = []
        for part in parts:
            result = google_transliterate(part)
            if not result:  
                try:
                    t_result = translator.translate(str(part), src='en', dest='kn')
                    result = t_result.pronunciation or t_result.text
                except Exception:
                    result = part  
            transliterated_parts.append(result)
        return ", ".join(transliterated_parts)
    except Exception:
        return str(value)



@register.filter
def get_item(dictionary, key):
    """Get dict item by key"""
    if isinstance(dictionary, dict):
        return dictionary.get(key, [])
    return []

@register.filter
def get_by_class(list_of_dicts, class_name):
    """Find dict in list where dict['class'] == class_name"""
    if not isinstance(list_of_dicts, (list, tuple)):
        return {"collectable": 0, "collected": 0, "balance": 0}
    for d in list_of_dicts:
        if d.get("class") == class_name:
            return d
    return {"collectable": 0, "collected": 0, "balance": 0}

@register.filter
def sum_field(data, field):
    """Sum a field across list of dicts"""
    if isinstance(data, list):
        return sum(d.get(field, 0) for d in data)
    return 0



ROMAN_MAP = {
    1: "I", 2: "II", 3: "III", 4: "IV", 5: "V",
    6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X"
}

@register.filter
def to_standard_display(value):
    """Convert standards 1-10 to Roman numerals, leave others (e.g., Nursery, LKG, UKG) as-is"""
    if not value:
        return value
    val = str(value).replace("Standard", "").strip().title()  
    if val.isdigit():
        num = int(val)
        if num in ROMAN_MAP:
            return ROMAN_MAP[num]
        return str(num)
    
    return val

