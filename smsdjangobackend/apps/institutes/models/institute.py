from django.db import models

from apps.shared.models.document import Document

class Institute(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=255, null=True, blank=True)
    trust_name = models.CharField(max_length=255, null=True, blank=True)
    tel_num = models.CharField(max_length=255)
    tel_num_2 = models.CharField(max_length=255, blank=True, null=True)
    type = models.CharField(max_length=255, blank=True, null=True)
    gstin_num = models.CharField(max_length=255, blank=True, null=True)
    board_name = models.CharField(max_length=255, blank=True, null=True)
    fax_num = models.CharField(max_length=255, blank=True, null=True)
    logo = models.OneToOneField(Document, related_name='institute_logo', blank=True, null=True,
                                on_delete=models.SET_NULL)
    company_id = models.IntegerField()
    enquiry_format = models.CharField(max_length=255, default='enquiry')
    application_format = models.CharField(
        max_length=255, default='application')
    admission_format = models.CharField(max_length=255, default='admission')
    quiz_instructions = models.CharField(
        max_length=3000, default='')
    dise_code = models.CharField(max_length=100, null=True, blank=True)
    email = models.CharField(max_length=100, null=True, blank=True)
    website_link = models.CharField(max_length=100, null=True, blank=True)
    token = models.CharField(max_length=100, null=True, blank=True)
    app_data = models.JSONField(null=True,blank=True) #validate
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    social_links = models.JSONField(
        default=dict,
        blank=True,
        help_text="Key-value pairs like instagram, whatsapp, phone, website"
    )

    def get_institute(self, standard_id=None):
        from apps.classes.models import InstituteAdresses
        from apps.institutes.serializers import InstituteAddressReadSerializer
        filter_query = {'is_active':True}
        if standard_id:
            filter_query['standard__in'] = standard_id
        queryset = InstituteAdresses.objects.filter(**filter_query)
        if not queryset: #show default address when address not there
            queryset = InstituteAdresses.objects.filter(is_active=True)
        institute_data = Institute.objects.first()
        address_data = InstituteAddressReadSerializer(queryset, many=True)
        if institute_data and address_data.data:
            institute_data.institute_address = address_data.data[0]
            for address in address_data.data:
                institute_data.address = address['map_address_data']['address_one_map']
                institute_data.city = address['map_address_data']['city_map']
                institute_data.address_line_one = address['map_address_data']['address_one_map']
                institute_data.latitude = address['map_address_data']['latitude_map']
                institute_data.longitude = address['map_address_data']['longitude_map']
                if address['map_address_data']['address_two_map']:
                    institute_data.address += ' '+address['map_address_data']['address_two_map']
                    institute_data.address_line_two = address['map_address_data']['address_two_map']
                institute_data.pincode =  address['map_address_data']['pincode_map']
        return institute_data

class ServiceTagList(models.Model):
    device_for = (
        ('1', 'Student School'),
        ('2', 'Staff School'),
        ('3', 'Standard Section Student')
    )
    machine_name = models.CharField(max_length=255, null=True, blank=True)
    serivce_tag_id = models.CharField(max_length=255)
    token = models.CharField(max_length=255)
    subscription_type = models.CharField(max_length=255)
    expiry_date = models.CharField(max_length=255)
    device_for = models.CharField(max_length=20, choices=device_for)
    is_active = models.BooleanField(default=True)

class InstitutePocMapping(models.Model):
    institute = models.ForeignKey(Institute, related_name='institute_poc_institute', null=True, blank=True,
        on_delete=models.SET_NULL)
    poc = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    start_date = models.DateField(null=True)
    end_date = models.DateField(null=True)
