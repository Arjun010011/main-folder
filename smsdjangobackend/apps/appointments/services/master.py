from datetime import datetime, timedelta
from django.db.models import Q
from rest_framework import exceptions
from apps.appointments.models.master import StaffAppointment, StaffAvailability, UserStaffAppointmentMapping
from apps.general.models.holidayCalender import HolidayCalender
from apps.hr.models.timeTable import TimeTableSchedule
from apps.shared.services import SharedService
from datetime import timedelta, date as dt_date
from apps.appointments.serializers import BookAppointmentSerializer,UserStaffAppointmentMappigSerializer
from django.db import transaction
from apps.tenants.services.middlewares import get_current_db_name
from apps.hr.services.staffleave import get_staff_leaves
from apps.hr.models.timeTable import Day
from apps.users.models.user import User
from apps.students.models.student import Student


def create_staff_availablity(self, data):
    if 'staff' not in data or not data['staff'] or \
        'day_of_week' not in data or not data['day_of_week'] or \
        'start_time' not in data or not data['start_time'] or \
        'end_time' not in data or not data['end_time'] or 'availability_status' not in data or not data['availability_status']:
        raise exceptions.ValidationError("staff , date , start time, end time , availability status These are all Mandatory Fields.")
    staff_availability_obj = StaffAvailability.objects.filter(staff_id=data['staff'],start_time__gte=data['start_time'],
                                                              end_time=data['end_time'],day_of_week=data['day_of_week']).values()
    if 'id' in data and data['id']:
        staff_availability_obj=staff_availability_obj.exclude(id=data['id'])
    if staff_availability_obj:
        raise exceptions.ValidationError("Staff Availability is already set for the date and time.")
    serializer = SharedService.add_or_update_data(self,[data])
    return {'data':'Data Saved Successfully','data_list':serializer['data']}

from rest_framework import exceptions

def manage_staff_appointment(self, data):
    appointment_id = data.get("appointment_id")
    action = data.get("action")

    if not appointment_id:
        raise exceptions.ValidationError("appointment_id is required.")
    if not action:
        raise exceptions.ValidationError("Action is required (approve, reschedule, reject).")

    try:
        appointment = StaffAppointment.objects.get(id=appointment_id, is_active=True)
    except StaffAppointment.DoesNotExist:
        raise exceptions.ValidationError("Appointment not found.")

    # 🔹 Approve
    if action == "approve":
        if appointment.status != "Pending":
            raise exceptions.ValidationError("Only pending appointments can be approved.")
        appointment.status = "Scheduled"

    # 🔹 Reschedule
    elif action == "reschedule":
        if appointment.status != "Pending":
            raise exceptions.ValidationError("Only pending appointments can be rescheduled.")

        new_date = data.get("new_date")
        new_start = data.get("new_start_time")
        new_end = data.get("new_end_time")

        if not (new_date and new_start and new_end):
            raise exceptions.ValidationError("New date, start_time, and end_time are required for rescheduling.")

        appointment.appointment_date = new_date
        appointment.start_time = new_start
        appointment.end_time = new_end
        appointment.status = "Rescheduled"

    # 🔹 Reject
    elif action == "reject":
        reason = data.get("reason", "Rejected by staff")
        appointment.status = "Rejected"
        appointment.remarks = reason

    else:
        raise exceptions.ValidationError("Invalid action. Use 'approve', 'reschedule', or 'reject'.")

    appointment.save()
    return {
        "id": appointment.id,
        "status": appointment.status,
        "remarks": appointment.remarks,
        "appointment_date": appointment.appointment_date,
        "start_time": appointment.start_time,
        "end_time": appointment.end_time,
    }

def get_staff_available_calendar(self,staff, start_date, end_date):
    calendar = []
    current_year = start_date.year
    start_date = max(start_date, dt_date(current_year, 1, 1))
    end_date = min(end_date, dt_date(current_year, 12, 31))
    holiday_date_range_list = HolidayCalender.get_upcoming_holidays(self, start_date, end_date, False)
    staff_leave_list = get_staff_leaves(self, start_date, end_date)
    working_days = Day.get_staff_working_day(self)
    # appointment_approved_details = StaffAppointment.objects.filter(date__gte=start_date,date__lte=end_date,status='Approved',staff_appointment_staff_appointment_mapping__user__staff=staff).values()
    staff_avaliability = StaffAvailability.objects.filter(staff=staff,start_time__isnull=True).values()
    staff_leave_dict={}
    appointment_dict={}
    notavaliability_dict={}
    for staff_leave in staff_leave_list['data']:
        if staff_leave['fordate'] not in staff_leave_dict:
            staff_leave_dict[staff_leave['fordate']] = staff_leave
    # for appointment in appointment_approved_details:
    #     if appointment['date'] not in appointment_dict:
    #         appointment_dict[appointment['date']] = appointment
    for avaliability in staff_avaliability:
        if avaliability['day_of_week_id'] not in notavaliability_dict and avaliability['availability_status'] == 'Not Available':
            notavaliability_dict[avaliability['day_of_week_id']] = avaliability
    current_date = start_date
    while current_date <= end_date:
        weekday = current_date.strftime("%A")
        day_info = {
            "date": current_date,
            "is_available":True,
            "reason":''
        }

        for holiday_date in holiday_date_range_list:
            if holiday_date['from_date'] <= current_date <= holiday_date['to_date']:
                day_info['is_available'] = False
                day_info['reason'] = "It's Holiday"

        if current_date in staff_leave_dict:
            day_info['is_available'] = False
            day_info['reason'] ='Staff is On leave'

        if weekday not in working_days:
            day_info['is_available'] = False
            day_info['reason'] ='Its Not Working Day'

        if current_date in appointment_dict:
            day_info['is_available'] = False
            day_info['reason'] ='Other Appointment is Scheduled'

        if current_date in notavaliability_dict:
            day_info['is_available'] = False
            day_info['reason'] ='Staff is not available on this date'
        calendar.append(day_info)
        current_date += timedelta(days=1)
    return calendar

def validate_appointment(self, data):
    if 'id' in data and data['id'] and data['status'] == 'Approved' and 'is_status_update' in data and data['is_status_update']:
        appointment_data_obj = StaffAppointment.objects.get(id=data['id'])
        staff_appointment = UserStaffAppointmentMapping.objects.filter(staff_appointment__date=appointment_data_obj.date,
                                                                       staff_appointment__start_time__gte=appointment_data_obj.start_time,
                                                                       staff_appointment__end_time__lte=appointment_data_obj.end_time,
                                                                       status='Approved', user=self.request.user.id)
        if staff_appointment:
            raise exceptions.ValidationError('Appointment is already fixed for this Date and time')
    elif 'is_status_update' not in data or not data['is_status_update']:
        if 'date' not in data or not data['date']:
            raise exceptions.ValidationError('Date is Mandatory')
        if 'start_time' not in data or not data['start_time']:
            raise exceptions.ValidationError('start_time is Mandatory')
        if 'end_time' not in data or not data['end_time']:
            raise exceptions.ValidationError('end_time is Mandatory')
        if 'organizer_list' not in data or not data['organizer_list']:
            raise exceptions.ValidationError('Organizer is Mandatory')
        # For PTM bulk (standards/sections), attenders are resolved from students; no attender_list required
        is_ptm_bulk = (
            data.get('meeting_type') in ('Teachers Parents Meeting', 'Parents Teachers Meeting') and
            data.get('academic_year') and
            data.get('standard_ids')
        )
        if not is_ptm_bulk and ('attender_list' not in data or data['attender_list'] is None):
            raise exceptions.ValidationError('Attender is Mandatory')

def add_appointment_data(self, data):
    if 'student_id' in data and data['student_id']:
        user = User.objects.filter(student=data['student_id']).first()
        appointment_data = {
            'name': data.get('name'),
            'description': data.get('description'),
            'date': data['date'],
            'start_time': data['start_time'],
            'end_time': data['end_time'],
            'meeting_type': 'Teachers Parents Meeting',
            'mode_of_meeting': "Offline Meeting",
        }
        appointment_data['created_by'] = self.request.user.id
        serializer = BookAppointmentSerializer(data=appointment_data)
        serializer.is_valid(raise_exception=True)
        appointment_obj = serializer.save()
        user_list = [
            {
                'user': self.request.user.id,
                'user_type': 'Organizer',
                'staff_appointment': appointment_obj.id,
                'status': "Approved",
            },
            {
                'user': user.id,
                'user_type': 'Attender',
                'staff_appointment': appointment_obj.id,
                'status': "Approved",
            },
        ]
        staff_id = getattr(self.request.user, "staff_id", None)
        day_name = data['date'].strftime("%A") if hasattr(data['date'], 'strftime') else datetime.strptime(str(data['date']), "%Y-%m-%d").strftime("%A")
        staff_availability = StaffAvailability.objects.filter(staff_id=staff_id, day_of_week__name=day_name).first() if staff_id else None
        if staff_availability and staff_availability.availability_status == 'Available':
            staff_availability.availability_status = 'Not Available'
            staff_availability.save()
        mapping_serializer = UserStaffAppointmentMappigSerializer(data=user_list, many=True)
        mapping_serializer.is_valid(raise_exception=True)
        mapping_serializer.save()
        return {"data": {'Data saved successfully'}}

    # Parent Teacher Meeting (bulk): create one meeting and one attender mapping per student for selected standards/sections
    is_ptm_bulk = (
        data.get('meeting_type') in ('Teachers Parents Meeting', 'Parents Teachers Meeting') and
        data.get('academic_year') and
        data.get('standard_ids')
    )
    if is_ptm_bulk:
        academic_year_id = data['academic_year']
        standard_ids = data['standard_ids'] if isinstance(data['standard_ids'], (list, tuple)) else [data['standard_ids']]
        section_ids = data.get('section_ids') or []
        if isinstance(section_ids, (int, str)):
            section_ids = [section_ids]

        # Get all student ids for selected standards (and optionally sections)
        student_rows = Student.get_student_for_standard(
            academic_year_id, standard_ids, section_ids, ['id']
        )
        student_ids = [s['id'] for s in student_rows]
        # Resolve user ids for those students (each student has a linked User)
        attender_user_ids = list(
            User.objects.filter(student_id__in=student_ids).values_list('id', flat=True).distinct()
        )

        appointment_data = {
            'name': data.get('name') or 'Parent Teacher Meeting',
            'description': data.get('description') or '',
            'meeting_type': 'Teachers Parents Meeting',
            'mode_of_meeting': data.get('mode_of_meeting') or 'Offline Meeting',
            'date': data['date'],
            'start_time': data['start_time'],
            'end_time': data['end_time'],
            'created_by': self.request.user.id,
        }
        appointment_serializer = BookAppointmentSerializer(data=appointment_data)
        appointment_serializer.is_valid(raise_exception=True)
        appointment_obj = appointment_serializer.save()

        organizer_list = data.get('organizer_list') or [self.request.user.id]
        if not isinstance(organizer_list, (list, tuple)):
            organizer_list = [organizer_list]

        user_list = []
        for uid in organizer_list:
            user_list.append({
                'user': uid,
                'user_type': 'Organizer',
                'staff_appointment': appointment_obj.id,
                'status': 'Approved',
            })
        for uid in attender_user_ids:
            user_list.append({
                'user': uid,
                'user_type': 'Attender',
                'staff_appointment': appointment_obj.id,
                'status': 'Approved',
            })

        mapping_serializer = UserStaffAppointmentMappigSerializer(data=user_list, many=True)
        mapping_serializer.is_valid(raise_exception=True)
        mapping_serializer.save()
        return {"data": {"message": "Data saved successfully", "appointment_id": appointment_obj.id, "students_count": len(attender_user_ids)}}

    else:
        if 'status' not in data:
            data['status'] = 'Requested'
        validate_appointment(self,data)
        appointment_obj=None
        appointment_data={}
        if 'is_status_update' not in data or not data['is_status_update']:
            fields = [
            "name", "description", "meeting_type", "mode_of_meeting",
            "date", "start_time", "end_time"
            ]

            appointment_data = {
                field: data[field]
                for field in fields
                if field in data and data[field] not in [None, ""]
            }
            appointment_data['created_by'] = self.request.user.id

        from datetime import datetime, time as dt_time

        # Parse date: may be string "YYYY-MM-DD" or already date/datetime
        date_val = data['date']
        if isinstance(date_val, str):
            date_obj = datetime.strptime(date_val, "%Y-%m-%d")
        else:
            date_obj = date_val
        day_name = date_obj.strftime("%A")

        # Parse times: API often sends strings like "09:00:00" or "09:00"
        def to_time(v):
            if v is None:
                return None
            if isinstance(v, dt_time):
                return v
            s = str(v).strip()
            for fmt in ("%H:%M:%S", "%H:%M"):
                try:
                    return datetime.strptime(s, fmt).time()
                except ValueError:
                    continue
            return None

        start_time = to_time(data['start_time'])
        end_time = to_time(data['end_time'])
        if start_time is None or end_time is None:
            raise exceptions.ValidationError("Invalid start_time or end_time format.")

        # StaffAvailability.staff is FK to Staff; get staff_id from current user
        staff_id = getattr(self.request.user, "staff_id", None)
        if staff_id is not None:
            staff_availability = StaffAvailability.objects.filter(
                staff_id=staff_id,
                day_of_week__name=day_name,
                start_time__lt=end_time,
                end_time__gt=start_time,
            ).first()
            if staff_availability and staff_availability.availability_status == "Not Available":
                raise exceptions.ValidationError("Staff is not available for this time slot")
        if 'id' in data and data['id']:
            appointment_obj = StaffAppointment.objects.get(id=data['id'])
        with transaction.atomic(using=get_current_db_name()):
            if appointment_data and not appointment_obj:
                serializer = BookAppointmentSerializer(data = appointment_data)
                serializer.is_valid(raise_exception=True)
                serializer=serializer.save()
                user_list = []
                for organizer in data['organizer_list']:
                    temp_user_list={}
                    temp_user_list['user'] = organizer
                    temp_user_list['user_type'] = 'Organizer'
                    temp_user_list['staff_appointment'] = serializer.id
                    temp_user_list['status'] = "Requested"
                    user_list.append(temp_user_list)
                for attender in data['attender_list']:
                    user_list.append({
                        'user':attender,
                        'user_type':'Attender',
                        'staff_appointment':serializer.id,
                        'status':"Requested"
                    })
                serializer = UserStaffAppointmentMappigSerializer(data=user_list,many=True)
                serializer.is_valid(raise_exception=True)
                serializer = serializer.save()
            elif appointment_data and appointment_obj:
                serializer = BookAppointmentSerializer(data=appointment_data,instance = appointment_obj,partial=True)
                serializer.is_valid(raise_exception=True)
                serializer=serializer.save()
                user_data_list = UserStaffAppointmentMapping.objects.filter(staff_appointment = data['id']).values()
                delete_user_list=[]
                user_data_dict={}
                for user_data in user_data_list:
                    key = user_data['user_type']+str(user_data['user_id'])
                    if key not in user_data_dict:
                        user_data_dict[key] = user_data
                    if user_data['user_id'] not in data['organizer_list'] and user_data['user_type'] == 'Organizer':
                        delete_user_list.append(user_data['id'])
                    if user_data['user_id'] not in data['attender_list'] and user_data['user_type'] == 'Attender':
                        delete_user_list.append(user_data['id'])
                user_list = []
                for organizer in data['organizer_list']:
                    key = 'Organizer'+str(organizer)
                    if key not in user_data_dict:
                        temp_user_list={}
                        temp_user_list['user'] = organizer
                        temp_user_list['user_type'] = 'Organizer'
                        temp_user_list['staff_appointment'] = serializer.id
                        temp_user_list['status'] = "Requested"
                        user_list.append(temp_user_list)
                for attender in data['attender_list']:
                    key = 'Attender'+str(attender)
                    if key not in user_data_dict:
                        user_list.append({
                            'user':attender,
                            'user_type':'Attender',
                            'staff_appointment':serializer.id,
                            'status': "Requested"
                        })
                if user_list:
                    serializer = UserStaffAppointmentMappigSerializer(data=user_list,many=True)
                    serializer.is_valid(raise_exception=True)
                    serializer = serializer.save()
                if delete_user_list:
                    UserStaffAppointmentMapping.objects.filter(id__in=delete_user_list).update(is_active=0)
            if appointment_obj and 'is_status_update' in data and data['is_status_update']:
                update_data = {
                    'status':data['status'],
                    'status_remark':data['status_remark']
                }
                user_staff_appointment = UserStaffAppointmentMapping.objects.filter(staff_appointment = appointment_obj.id,user=self.request.user.id).update(**update_data)
    return {"data":{'Data saved successfully'}}

def get_available_staff_timings(self):
    date = self.request.GET.get('date')
    date = datetime.strptime(date, "%Y-%m-%d")
    day = date.strftime("%A")
    staff_id = self.request.GET.get('staff_id')
    staff_availability = self.get_queryset().filter(day_of_week__name=day).values()
    staff_availability_dict={'global':[]}
    for staff in staff_availability:
        if not staff['staff_id']:
            if 'global' not in staff_availability_dict:
                staff_availability_dict['global'] = []
            staff_availability_dict['global'].append(staff)
        else:
            if staff['staff_id'] == staff_id:
                if staff['staff_id'] not in staff_availability_dict:
                    staff_availability_dict[staff['staff_id']] = []
                staff_availability_dict[staff['staff_id']].append(staff)
    if staff_id in staff_availability_dict:
        return staff_availability_dict[staff['staff_id']]
    else:
        return staff_availability_dict['global']
    
def get_staff_appointment(self):
    now=datetime.now()
    time=now.time()
    date=now.date()
    queryset = self.get_queryset()
    if not self.request.user.is_superuser:
        queryset=self.get_queryset().filter(staff_appointment_user_staff_appointment_mapping__user=self.request.user.id)
    serializer = self.get_serializer(queryset, many=True)
    appointment_data ={'data':serializer.data}
    summary_dict = {'total_appointments':0,'approved_appointments':0,'rejected_appointments':0,'attended_appointments':0,'Requested_appointments':0}
    if self.request.GET.get('get_summary'):
        for staff in appointment_data['data']:
            for user in staff['user_data']:
                if user['user'] == self.request.user.id:
                    summary_dict['total_appointments']+=1
                    if user['status'] == 'Approved':
                        summary_dict['approved_appointments']+=1
                    if user['status'] == 'Rejected':
                        summary_dict['rejected_appointments']+=1
                    if user['status'] == 'Requested':
                        summary_dict['Requested_appointments']+=1
                    if user['status'] == 'Approved' and datetime.strptime(staff['date'], "%Y-%m-%d").date()<=date and staff['end_time']<=time:
                        summary_dict['attended_appointments']+=1
        return summary_dict
    data, count, next_page, previous_page = SharedService.custom_pagination(self, appointment_data['data'],
                                                                                10,
                                                                                1)
    return {'data':data,'count':count,'next_page':next_page,'previous_page':previous_page}


def staff_appointment_detail(self, kwargs):
    appointment_id = kwargs['pk']
    data = []

    try:
        appointment = StaffAppointment.objects.get(created_by=appointment_id)
        serializer = BookAppointmentSerializer(appointment)
        data = [serializer.data]
    except StaffAppointment.DoesNotExist:
        data = []

    return {'data': data}