from wsgiref.simple_server import demo_app
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.classes.models import Subject, StandardSectionMapping
from apps.institutes.models.visitor import Reason
from apps.shared.models import Document
from apps.staffs.models import Staff
from apps.students.models import Student
from apps.users.models import User


class Diary(models.Model):
    HWStatus = (
        ('Not Completed', 'Not Completed'),
        ('Completed', 'Completed'),
        ('Evaluated', 'Evaluated')
    )
    title = models.CharField(max_length=255, null=True, blank=True)
    description = models.CharField(max_length=510, null=True, blank=True)
    subject = models.ForeignKey(Subject, related_name='subject_diary', null=True, blank=True, on_delete=models.SET_NULL)
    is_student = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    marks = models.FloatField(null=True)
    due_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=15, choices=HWStatus, blank=True, null=True)
    created_user = models.ForeignKey(User, related_name='user_diary', null=True, blank=True, on_delete=models.SET_NULL)
    is_student_can_update = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class StandardSectionDiary(models.Model):
    diary = models.ForeignKey(Diary, related_name='diary_standard', null=True, blank=True, on_delete=models.SET_NULL)
    standard_section = models.ForeignKey(StandardSectionMapping, related_name='standard_diary', null=True,
                                         blank=True, on_delete=models.PROTECT)


class StaffDiary(models.Model):
    diary = models.ForeignKey(Diary, related_name='diary_staff', null=True, blank=True, on_delete=models.SET_NULL)
    staff = models.ForeignKey(Staff, related_name='staff_diary', null=True, blank=True, on_delete=models.SET_NULL)
    view = models.BooleanField(default=False)
    update = models.BooleanField(default=False)
    evaluate = models.BooleanField(default=False)

class StudentDiary(models.Model):
    HWStatus = (
        ('Not Completed', 'Not Completed'),
        ('Submitted', 'Submitted'),
        ('Resubmit', 'Resubmit'),
        ('Completed', 'Completed'),)
    status = models.CharField(max_length=15, choices=HWStatus, blank=True, null=True)
    marks = models.FloatField(null=True)
    diary = models.ForeignKey(Diary, related_name='diary_student', null=True, blank=True, on_delete=models.SET_NULL)
    student = models.ForeignKey(Student, related_name='student_diary', null=True, blank=True, on_delete=models.SET_NULL)
    read_time = models.DateTimeField(null=True, blank=True)

class StudentDiarySubjectMapping(models.Model):
    student_diary = models.ForeignKey(StudentDiary, on_delete=models.SET_NULL, null=True, blank=True, related_name='student_diary_subject_mapping_student_diary') 
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True, related_name='student_diary_subject_mapping_subject')

class StudentDiaryTitleMapping(models.Model):
    student_diary = models.ForeignKey(StudentDiary, on_delete=models.SET_NULL, null=True, blank=True, related_name='student_diary_title_mapping_student_diary') 
    diary_title = models.ForeignKey(Reason, on_delete=models.SET_NULL, null=True, blank=True, related_name='student_diary_title_mapping_diary_title')

class StudentDiaryRemarkMapping(models.Model):
    student_diary = models.ForeignKey(StudentDiary, on_delete=models.SET_NULL, null=True, blank=True, related_name='student_diary_remark_mapping_student_diary') 
    remark = models.ForeignKey(Reason, on_delete=models.SET_NULL, blank=True, null=True)

@receiver(post_save, sender=StudentDiary, dispatch_uid="update_diary_status")
def after_save(sender, instance, **kwargs):
    student_diary_list = dict(set(StudentDiary.objects.filter(diary=instance.diary).values_list('status', 'id')))
    if student_diary_list:
        status = 'Not Completed' #for tracking whether all student compelted
        if 'Not Completed' in student_diary_list:
            status = 'Not Completed'
        elif 'Resubmit' in student_diary_list:
            status = 'Not Completed'
        elif 'Completed' in student_diary_list:
            status = 'Completed'
        Diary.objects.filter(id=instance.diary_id).update(
            status=status
        )


class DocumentDiary(models.Model):
    diary = models.ForeignKey(Diary, related_name='diary_document', null=True, blank=True, on_delete=models.SET_NULL)
    user = models.ForeignKey(User, related_name='user_document_diary', null=True, blank=True, on_delete=models.SET_NULL)
    to_user = models.ForeignKey(User, related_name='to_user_document_diary', null=True, blank=True,
                                on_delete=models.SET_NULL)
    comment = models.CharField(max_length=255, null=True, blank=True)
    document = models.ForeignKey(Document, related_name='document_diary', blank=True, null=True,
                                 on_delete=models.SET_NULL)
    from_diary = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
