from django.db import models
from django.core.exceptions import ValidationError
from apps.staffs.models.staff import Staff
from apps.students.models.student import Student
from apps.users.models.user import User
from apps.hr.models.timeTable import Day


# ===== Allowed Values =====
MEETING_TYPE = [
    {"id": 1, "name": "One on One Meeting", "label": "One on One Meeting"},
    {"id": 2, "name": "Teachers Parents Meeting", "label": "Teachers Parents Meeting"},
    {"id": 3, "name": "Other", "label": "Other"}
]

MODE_OF_MEETING = [
    {"id": 1, "name": "Online Meeting", "label": "Online Meeting"},
    {"id": 2, "name": "Offline Meeting", "label": "Offline Meeting"},
]

STATUS = [
    {"id": 1, "name": "Requested", "label": "Requested"},
    {"id": 2, "name": "Approved", "label": "Approved"},
    {"id": 3, "name": "Rejected", "label": "Rejected"},
]

USER_TYPE = [
    {"id": 1, "name": "Organizer", "label": "Organizer"},
    {"id": 2, "name": "Attender", "label": "Attender"},
]

AVAILABILITY_STATUS = [
    {"id": 1, "name": "Available", "label": "Available"},
    {"id": 2, "name": "Not Available", "label": "Not Available"},
]


def get_allowed_names(option_list):
    return [item["name"] for item in option_list]


class StaffAppointment(models.Model):
    name = models.CharField(max_length=200, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    meeting_type = models.CharField(max_length=200, null=True, blank=True)
    mode_of_meeting = models.CharField(max_length=200, null=True, blank=True)
    date = models.DateField(null=True, blank=True)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="user_staff_appointment", null=True, blank=True)
    is_active = models.BooleanField(default=True)   
    is_manual = models.BooleanField(default=True) 
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def clean(self):
        if self.meeting_type and self.meeting_type not in get_allowed_names(MEETING_TYPE):
            raise ValidationError({"meeting_type": f"Invalid meeting_type '{self.meeting_type}'"})

        if self.mode_of_meeting and self.mode_of_meeting not in get_allowed_names(MODE_OF_MEETING):
            raise ValidationError({"mode_of_meeting": f"Invalid mode_of_meeting '{self.mode_of_meeting}'"})

    def save(self, *args, **kwargs):
        self.full_clean()  # run clean() before saving
        super().save(*args, **kwargs)


class UserStaffAppointmentMapping(models.Model):
    staff_appointment = models.ForeignKey(StaffAppointment,on_delete=models.CASCADE, related_name="staff_appointment_user_staff_appointment_mapping", null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="user_user_staff_appointment_mapping", null=True, blank=True)
    user_type = models.CharField(max_length=200, blank=True, null=True)
    remarks = models.CharField(max_length=200, blank=True, null=True)
    remark_given_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="remarkgivenby_user_staff_appointment_mapping", null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)  
    status = models.CharField(max_length=200, blank=True, null=True)
    status_remark = models.CharField(max_length=200, blank=True, null=True)


    def clean(self):
        if self.user_type and self.user_type not in get_allowed_names(USER_TYPE):
            raise ValidationError({"user_type": f"Invalid user_type '{self.user_type}'"})
        
        if self.status and self.status not in get_allowed_names(STATUS):
            raise ValidationError({"status": f"Invalid status '{self.status}'"})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

class StaffAvailability(models.Model):
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name="staff_staff_availability", null=True, blank=True)
    day_of_week = models.ForeignKey(Day, on_delete=models.CASCADE, related_name="dayofweek_staff_availability", null=True, blank=True)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    availability_status = models.CharField(max_length=200, blank=True, null=True)

    def clean(self):
        if self.availability_status and self.availability_status not in get_allowed_names(AVAILABILITY_STATUS):
            raise ValidationError({
                "availability_status": f"Invalid availability_status '{self.availability_status}'"
            })

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)