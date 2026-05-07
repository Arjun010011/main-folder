from django.db import models


class Country(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class State(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=255)
    country = models.ForeignKey(Country, null=True, blank=True, on_delete=models.SET_NULL)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class District(models.Model):
    name = models.CharField(max_length=255)
    state = models.ForeignKey(State, on_delete=models.CASCADE)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class City(models.Model):
    name = models.CharField(max_length=255)
    district = models.ForeignKey(District, on_delete=models.CASCADE)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class MapAddress(models.Model):
    address_one_map = models.CharField(max_length=255, blank=True)
    address_two_map = models.CharField(max_length=255, blank=True)
    city_map = models.CharField(max_length=255)
    district_map = models.CharField(max_length=255)
    state_map = models.CharField(max_length=255)
    country_map = models.CharField(max_length=255)
    pincode_map = models.IntegerField(null=True)
    latitude_map = models.DecimalField(max_digits=22, decimal_places=16, null=True, blank=True)
    longitude_map = models.DecimalField(max_digits=22, decimal_places=16, null=True, blank=True)

    def __str__(self):
        return self.address_one_map