from django.db import models

class GroupType(models.Model):
    name = models.CharField(max_length=255)
