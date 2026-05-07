import cv2
import numpy as np
import requests
import logging
from io import BytesIO
from PIL import Image, ImageEnhance, ImageOps
from django.core.files.base import ContentFile
from apps.shared.services import UploadTypeService

logger = logging.getLogger(__name__)

try:
    from rembg import remove
    REMBG_AVAILABLE = True
except:
    REMBG_AVAILABLE = False


class PassportProcessor:
    def __init__(self, target_size=(300, 300)):
        self.width, self.height = target_size

    # -------------------------
    # DOWNLOAD
    # -------------------------
    def download_image(self, url):
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        return Image.open(BytesIO(resp.content)).convert("RGB")

    # -------------------------
    # AI BACKGROUND REMOVAL (BEST)
    # -------------------------
    def remove_background_ai(self, pil_img, bgcolor):
        try:
            output = remove(pil_img)  # RGBA output
            output = output.convert("RGBA")

            bg = Image.new("RGBA", output.size, self.hex_to_rgba(bgcolor))
            final = Image.alpha_composite(bg, output)

            return final.convert("RGB")

        except Exception as e:
            logger.warning(f"AI BG removal failed: {e}")
            return None

    # -------------------------
    # FALLBACK: IMPROVED GRABCUT
    # -------------------------
    # -------------------------
    # FALLBACK: IMPROVED GRABCUT (production-safe)
    # -------------------------
    def remove_background_grabcut(self, pil_img, bgcolor):
        cv_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        h, w = cv_img.shape[:2]

        gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)

        mask = np.zeros((h, w), np.uint8)

        if len(faces) > 0:
            # Use largest detected face as foreground
            x, y, fw, fh = max(faces, key=lambda f: f[2] * f[3])
            mask[y:y+fh, x:x+fw] = cv2.GC_FGD

            # Probable foreground around face
            x1 = max(0, x - int(fw * 0.5))
            x2 = min(w, x + fw + int(fw * 0.5))
            y2 = min(h, y + int(fh * 3))
            mask[y:y2, x1:x2] = cv2.GC_PR_FGD
        else:
            # No face detected → use center fallback mask
            logger.warning("Face not detected, using fallback mask")
            x1, x2 = int(w * 0.25), int(w * 0.75)
            y1, y2 = int(h * 0.2), int(h * 0.8)
            mask[y1:y2, x1:x2] = cv2.GC_PR_FGD

        # Everything else is probable background
        mask[mask == 0] = cv2.GC_PR_BGD

        # Initialize GrabCut models
        bgdModel = np.zeros((1, 65), np.float64)
        fgdModel = np.zeros((1, 65), np.float64)

        # Run GrabCut
        cv2.grabCut(cv_img, mask, None, bgdModel, fgdModel, 5, cv2.GC_INIT_WITH_MASK)

        # Extract mask for final blending
        mask2 = np.where(
            (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD),
            1.0,
            0.0
        )

        # Clean + smooth edges
        kernel = np.ones((3, 3), np.uint8)
        mask2 = cv2.morphologyEx(mask2, cv2.MORPH_CLOSE, kernel, iterations=2)
        mask2 = cv2.GaussianBlur(mask2, (5, 5), 0)

        alpha = mask2[:, :, np.newaxis]

        bg_color = self.hex_to_bgr(bgcolor)
        background = np.full(cv_img.shape, bg_color, dtype=np.float32)

        foreground = cv_img.astype(np.float32) * alpha
        final = foreground + background * (1 - alpha)
        final = final.astype(np.uint8)

        # Optional smoothing
        final = cv2.bilateralFilter(final, 5, 50, 50)

        return Image.fromarray(cv2.cvtColor(final, cv2.COLOR_BGR2RGB))



    # -------------------------
    # MAIN BG REMOVAL (HYBRID)
    # -------------------------
    def remove_background(self, pil_img, bgcolor):
        if REMBG_AVAILABLE:
            result = self.remove_background_ai(pil_img, bgcolor)
            if result is not None:
                return result

        return self.remove_background_grabcut(pil_img, bgcolor)

    # -------------------------
    # COLOR HELPERS
    # -------------------------
    def hex_to_rgba(self, hex_color):
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4)) + (255,)

    def hex_to_bgr(self, hex_color):
        hex_color = hex_color.lstrip('#')
        rgb = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
        return (rgb[2], rgb[1], rgb[0])

    # -------------------------
    # FACE CROP
    # -------------------------
    def get_passport_crop(self, image):
        cv_img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )

        faces = face_cascade.detectMultiScale(
            cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY),
            1.3,
            5
        )

        if len(faces) > 0:
            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])

            pad_w = int(w * 0.5)
            pad_h = int(h * 0.7)

            x1 = max(0, x - pad_w)
            y1 = max(0, y - int(h * 0.6))
            x2 = min(image.width, x + w + pad_w)
            y2 = min(image.height, y + h + pad_h)

            return image.crop((x1, y1, x2, y2))

        return ImageOps.fit(image, (self.width, self.height))


# -------------------------
# UPLOAD
# -------------------------
def upload_to_django(instance, pil_image):
    buffer = BytesIO()
    pil_image.save(buffer, format="JPEG", quality=90, optimize=True)
    buffer.seek(0)

    django_file = ContentFile(buffer.read(), name="passport.jpg")
    django_file.content_type = "image/jpeg"

    return UploadTypeService.upload_file(instance, {"file": django_file})


# -------------------------
# PIPELINE
# -------------------------
# -------------------------
# PIPELINE: PROCESS AND UPLOAD (production-safe)
# -------------------------
def process_and_upload(self, image_url, crop, bgremove, bgcolor="#FFFFFF"):
    try:
        proc = PassportProcessor()

        # Download
        img = proc.download_image(image_url)

        # Crop to face if requested
        if crop == 1:
            img = proc.get_passport_crop(img)

        # Standardize size before BG removal
        img = ImageOps.fit(img, (512, 512), Image.Resampling.LANCZOS)

        # Remove background if requested
        if bgremove == 1:
            img = proc.remove_background(img, bgcolor)

        # Final resize + enhance
        img = img.resize((300, 300), Image.Resampling.LANCZOS)
        img = ImageEnhance.Sharpness(img).enhance(1.5)

        # Upload
        return upload_to_django(self, img)

    except Exception as e:
        logger.error(f"Processing failed: {e}")

        # Friendly warning for missing face
        if "Face not detected" in str(e):
            return {
                "success": False,
                "message": "Face not detected. Please upload a clear ID photo."
            }

        # Raise for other unexpected errors
        raise Exception(f"Processing failed: {str(e)}")