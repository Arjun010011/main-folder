from rest_framework import exceptions
from django.db import models
from django.db.models import JSONField

from apps.institutes.models.academicYear import AcademicYear
from apps.classes.models.standard import Standard
from apps.store.models.master import Stock
from apps.students.models import Student
from apps.students.models.student import StudentGroup

term = (
    ('Term1', 'Term1'),
    ('Term2', 'Term2'),
    ('Term3', 'Term3'),
    ('Term4', 'Term4'),
    ('Term5', 'Term5'),
    ('Term6', 'Term6'),
    ('Term7', 'Term7'),
    ('Term8', 'Term8'),
    ('Term9', 'Term9'),
    ('Term10', 'Term10'),
    ('Term11', 'Term11'),
    ('Term12', 'Term12'),
    ('Term13', 'Term13'),
    ('Term14', 'Term14'),
    ('Term15', 'Term15'),
    ('Term16', 'Term16'),
    ('Term17', 'Term17'),
    ('Term18', 'Term18'),
    ('Term19', 'Term19'),
    ('Term20', 'Term20'))


class FeeGroup(models.Model):
    name = models.CharField(max_length=255, unique=True)
    code_name = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class FeeType(models.Model):
    name = models.CharField(max_length=255, unique=True)
    codename = models.CharField(max_length=255, null=True, blank=True)
    is_feature = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def get_predefined_code_names(self):
        return ['store', 'custom']
    
    def __str__(self):
        return '%s' % (self.name)

class FeeStandardMapping(models.Model):
    isApproved = (('0', 'Not Approved'),
                  ('1', 'Approved'),
                  ('2', 'Rejected'),)
    isMandatory = (('0', 'Not Mandatory'),
                   ('1', 'Mandatory'),)
    studentType = (
        ('Day Scholar', 'Day Scholar'),
        ('Residential', 'Residential')
    )
    Gender = (
        ('Boy', 'Boy'),
        ('Girl', 'Girl'),
        ('Other', 'Other'),
    )
    academic_year = models.ForeignKey(AcademicYear, related_name='standard_year', null=True, blank=True,
                                      on_delete=models.SET_NULL)
    standard = models.ForeignKey(Standard, related_name='fee_types', null=True, blank=True, on_delete=models.SET_NULL)
    fee_type = models.ForeignKey(FeeType, null=True, blank=True, on_delete=models.SET_NULL)
    amount = models.FloatField(null=True)
    is_mandatory = models.CharField(default='0', max_length=1, choices=isMandatory)
    sub_fee_type = JSONField(null=True)
    is_approved = models.CharField(default='0', max_length=1, choices=isApproved)
    student_type = models.CharField(max_length=12, choices=studentType, blank=True, null=True, default='Day Scholar')
    student_group = models.ForeignKey(StudentGroup, null=True, blank=True, on_delete=models.SET_NULL, related_name='fee_standard_mapping_student_group')
    fee_group = models.ForeignKey(FeeGroup, on_delete=models.CASCADE ,related_name='fee_standard_mapping_fee_group', blank=True, null=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    receipt_alias = models.CharField(max_length=20, blank=True, null=True)
    gender = models.CharField(max_length=5, choices=Gender, blank=True, null=True)
    is_new_student = models.BooleanField(null=True)

    def __str__(self):
        return '%s %s' % (self.standard.name, self.fee_type.name)

class FeePlan(models.Model):
    standard_fee = models.ForeignKey(FeeStandardMapping, related_name='standard_fee', null=True,
                                     blank=True, on_delete=models.SET_NULL)
    terms = models.CharField(max_length=10, choices=term, blank=True, null=True)
    term_alias = models.CharField(max_length=255, null=True, blank=True)
    is_amount = models.BooleanField(default=True)
    is_permission_to_edit = models.BooleanField(default=True)#used to tell the user have the permission to edit
    rate = models.FloatField(null=True)
    payment_start_date = models.DateField(blank=True, null=True)
    payment_end_date = models.DateField(blank=True, null=True)
    term_start_date = models.DateField(blank=True, null=True)
    term_end_date = models.DateField(blank=True, null=True)
    # student_feature = models.ManyToManyField(Student, blank=True, related_name='student_feature')
    fee_fine_rate = models.FloatField(null=True, blank=True)
    fee_fine_frequency_in_days = models.IntegerField(null=True, blank=True)
    max_fee_fine_rate = models.FloatField(null=True, blank=True)
    hide_from_app = models.BooleanField(null=True,blank=True)
    sequence = models.IntegerField(null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return '%s %s %s' % (self.standard_fee.fee_type, self.standard_fee.standard.name, self.terms)

class FeeplanStudentFeature(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, null=True, blank=True, related_name='fee_plan_student_feature_student')
    fee_plan = models.ForeignKey(FeePlan, on_delete=models.CASCADE, null=True, blank=True, related_name='fee_plan_student_feature_fee_plan')
    amount = models.FloatField(null=True, blank=True, default=0)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class FeeStandardMappingItemSellingPrice(models.Model):
    fee_standard_mapping = models.ForeignKey(FeeStandardMapping, related_name='fee_standard_mapping_item_selling_price_fee_standard_mapping', null=True, blank=True, on_delete=models.SET_NULL)
    stock = models.ForeignKey(Stock, related_name='fee_standard_mapping_item_selling_price_stock', null=True, blank=True, on_delete=models.SET_NULL)
    selling_price = models.FloatField(null=True)#including both the quantity
    quantity = models.FloatField(default=1)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

#Enable the item for the student - instead of many to many have create the new table
class StudentStoreMapping(models.Model):
    fee_standard_mapping_item_selling = models.ForeignKey(FeeStandardMappingItemSellingPrice,
        related_name='student_store_mapping_fee_standard_mapping_item_selling',
        on_delete = models.SET_NULL, null=True
    )
    student = models.ForeignKey(Student, blank=True, related_name='student_store_mapping_student', on_delete=models.SET_NULL, null=True)
    issued_quantity = models.FloatField(default=0)
    quantity = models.FloatField(default=1)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def delete(self, *args, **kwargs):
        from apps.store.models.dataEntry import ItemSoldDetails
        if ItemSoldDetails.objects.filter(student_store_mapping=self.id).exists():
            raise exceptions.ValidationError('Item already sold')
        super(StudentStoreMapping, self).delete(*args, **kwargs)

    def get_store_amount_for_students(self, student_ids):
        fee_standard_mapping_item_selling_ids = set()
        return_student_store_mapping = {}
        student_store_mapping_data = StudentStoreMapping.objects.filter(
            student__in=student_ids
        ).values(
            'fee_standard_mapping_item_selling', 'student', 'issued_quantity', 'quantity', 'id'
        )
        for student_store in student_store_mapping_data:
            fee_standard_mapping_item_selling_ids.add(student_store['fee_standard_mapping_item_selling'])
        fee_standard_mapping_item_selling_price = {fee['id'] : fee for fee in FeeStandardMappingItemSellingPrice.objects.filter(
            id__in=fee_standard_mapping_item_selling_ids
        ).values('selling_price', 'quantity', 'stock', 'id')}
        for student_store in student_store_mapping_data:
            student_store['fee_standard_mapping_item_selling_data'] = fee_standard_mapping_item_selling_price[student_store['fee_standard_mapping_item_selling']]
            if student_store['student'] not in return_student_store_mapping:
                return_student_store_mapping[student_store['student']] = {'item_selling_list': {}, 'total_amount': 0, 'quantity_price': 0}
            quantity_price = (student_store['fee_standard_mapping_item_selling_data']['selling_price']/student_store['fee_standard_mapping_item_selling_data']['quantity'])
            return_student_store_mapping[student_store['student']]['total_amount'] += (quantity_price*student_store['quantity'])
            return_student_store_mapping[student_store['student']]['item_selling_list'][student_store['fee_standard_mapping_item_selling']] = student_store
        return student_store_mapping_data

class StudentStoreMappingLog(models.Model):
    student_store_mapping = models.ForeignKey(StudentStoreMapping, on_delete=models.SET_NULL, null=True, blank=True)
    is_addition = models.BooleanField(default=True)
    current_assigned_quantity = models.IntegerField()
    current_issued_quantity = models.IntegerField()
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)