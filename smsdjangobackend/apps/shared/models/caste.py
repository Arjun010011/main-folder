from django.db import models


class Nationality(models.Model):
    name = models.CharField(max_length=255)
    codename=models.CharField(max_length=255,null=True)
    is_active = models.BooleanField(default=True)


class Religion(models.Model):
    name = models.CharField(max_length=255)
    codename=models.CharField(max_length=255,null=True)
    nationality = models.ForeignKey(Nationality, related_name='religion', null=True, blank=True,
                                    on_delete=models.SET_NULL)
    is_active = models.BooleanField(default=True)


class Category(models.Model):
    name = models.CharField(max_length=255)
    codename=models.CharField(max_length=255,null=True)
    religion = models.ForeignKey(Religion, related_name='category', null=True, blank=True, on_delete=models.SET_NULL)
    is_active = models.BooleanField(default=True)


class Caste(models.Model):
    name = models.CharField(max_length=255)
    codename=models.CharField(max_length=255,null=True)
    category = models.ForeignKey(Category, related_name='caste', null=True, blank=True, on_delete=models.SET_NULL)
    religion = models.ForeignKey(Religion, related_name='religion_caste', null=True, blank=True,
                                 on_delete=models.SET_NULL)
    is_active = models.BooleanField(default=True)
