from datetime import timedelta, datetime, timezone
from knox.models import AuthToken
from django.core.management.base import BaseCommand, CommandParser

class Command(BaseCommand):
        
    def handle(self, *args, **options):
        now = datetime.now()
        new_expiry = now + timedelta(days=3000)
        app_token_threshold = timedelta(days=30)

        tokens = AuthToken.objects.filter(expiry__gt=now)  # not expired
        updated_count = 0

        for token in tokens:
            if (token.expiry - token.created) > app_token_threshold:
                token.expiry = new_expiry
                token.save(update_fields=['expiry'])
                updated_count += 1
                print(f"✅ Token {token.digest[:10]}... extended to {new_expiry}")

        print(f"🎯 Total updated app tokens: {updated_count}")
