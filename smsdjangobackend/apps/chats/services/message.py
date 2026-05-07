

import datetime
from rest_framework import exceptions
from django.db import transaction
from django.db.models import Q, Count, CharField, Value
from django.db.models.functions import Concat
from django.contrib.auth.models import Group


from apps.chats.models.chat import Conversation, ConversationStandardSectionMapping, MessageUserDetail, UserConversationMapping, Message
from apps.chats.serializers import ChatStudentSearchSerializer, ChatStudentSerializer, ChatUserReadSearchSerializer, ChatUserReadSerializer, ConversationDetailedReadSerializer, ConversationReadSerializer, ConversationSerializer, ConversationStandardSectionMappingSerializer, MessageIndividualSerializer, MessageReadSerializer, MessageSerializer, UserConversationMappingReadSerializer, UserConversationMappingSerializer
from apps.classes.models.enrollment import Enrollment, StudentStandardMapping
from apps.institutes.models.academicYear import AcademicYear
from apps.notification.services.notification_service import send_notification
from apps.shared.models.configuration import TransactionIdTracking
from apps.shared.services import FormdefinitionService, SharedService
from apps.shared.services_shared.common import get_full_name, save_transaction_tracking
from apps.staffs.models.staff import Staff
from apps.staffs.models.staff_standard import StaffStandardMapping
from apps.students.models.student import Student
from apps.students.serializers import StudentSerializer
from apps.students.services.student import get_student_current_standard_section_name, get_students_for_standard_or_section
from apps.tenants.services.middlewares import get_current_db_name
from apps.users.models.user import User
from apps.users.serializers import UserGroupSerializer

"If conversation presents return conversation id if not return none"
def get_one_to_one_conversation_user_ids_mapping(from_user, to_user):
    user_conversation_data = UserConversationMapping.objects.filter(
            user__in=[from_user, to_user], conversation__conversation_type=1, is_active=True
    ).values('user', 'conversation')
    temp_conversation_user_id_mapping = {}
    return_conversation_id = None
    for user_conv in user_conversation_data:
        if user_conv['conversation'] not in temp_conversation_user_id_mapping:
            temp_conversation_user_id_mapping[user_conv['conversation']] = []
        temp_conversation_user_id_mapping[user_conv['conversation']].append(user_conv['user'])
        if len(temp_conversation_user_id_mapping[user_conv['conversation']]) > 1:
            return_conversation_id = user_conv['conversation']
            break
    return return_conversation_id

def get_user_ids_in_conversation_id(conversation_id):
    user_ids = list(UserConversationMapping.objects.filter(is_active=True,conversation=conversation_id).values_list('user_id', flat=True))
    standard_section_ids = ConversationStandardSectionMapping.objects.filter(
        conversation=conversation_id
    ).values_list('standard_section', flat=True)
    if standard_section_ids:
        student_ids = get_students_for_standard_or_section({
            'standard_section_ids': standard_section_ids
        })
        if student_ids:
            user_ids += list(User.objects.filter(student__in=student_ids).values_list('id', flat=True))
    return user_ids

"create conversation id if not exit for individual"
def create_chat_conversation(data):
    is_create_conversation_id = True
    document = data['document'] if 'document' in data else None
    conversation_id = data['conversation_id'] if 'conversation_id' in data else None #user for update
    mandatory_fields = ['conversation_type', 'user_data']
    if data['conversation_type'] == 2: #if group
        mandatory_fields.append('name')
    if data['conversation_type'] == 1 and len(data['user_data']) != 2:
        raise exceptions.ValidationError('Invalid Users')
    if not conversation_id:
        SharedService.check_mandatory_field_in_list(mandatory_fields, data)
    if 'standard_section_ids' in data and data['standard_section_ids']:
        if len(data['standard_section_ids']) != len(list(set(data['standard_section_ids']))):
            raise exceptions.ValidationError('standard_section_ids is mandatory')
    conversation_data_to_save = {'conversation_type':   data['conversation_type']}
    if data['conversation_type'] == 1:
        conversation_id = get_one_to_one_conversation_user_ids_mapping(data['user_data'][0]['user_id'], data['user_data'][1]['user_id'])
        if conversation_id:
            is_create_conversation_id = False
    if data['conversation_type'] == 2:
        conversation_data_to_save['name'] = data['name']
        conversation_data_to_save['description'] = data['description']
        conversation_data_to_save['document'] = document
    conversation_data_to_save['message_last_updated'] = datetime.datetime.now()
    if is_create_conversation_id:
        with transaction.atomic(using=get_current_db_name()):
            if not conversation_id:
                ser = ConversationSerializer(data=conversation_data_to_save)
                ser.is_valid(raise_exception=True)
                conversation_obj = ser.save()
                conversation_id = conversation_obj.id
            else:
                obj = Conversation.objects.get(id=conversation_id)
                ser = ConversationSerializer(instance=obj, data=conversation_data_to_save, partial=True)
                ser.is_valid(raise_exception=True)
                conversation_obj = ser.save()
                conversation_id = conversation_obj.id
            user_data_to_save = []
            check_user_already_added = {}
            if 'updatable_user_data' in data and data['updatable_user_data']:
                for updatable_data in  data['updatable_user_data']:
                    user_con = UserConversationMapping.objects.filter(user=updatable_data['user_id'], conversation=conversation_id)
                    if user_con:
                        user_con.update(
                            is_admin=updatable_data['is_admin']
                        )
                    else:
                        user_data_to_save.append(
                            {
                                'user': updatable_data['user_id'],
                                'conversation': conversation_id,
                                'is_admin': updatable_data.get('is_admin', False)
                            }
                        )
            for user in data['user_data']:
                if user['user_id'] in check_user_already_added:
                    continue
                user_data_to_save.append(
                    {
                        'user': user['user_id'],
                        'conversation': conversation_id,
                        'is_admin': user['is_admin'] if 'is_admin' in user and user['is_admin'] else False
                    }
                )
                check_user_already_added[user['user_id']] = ''
            if user_data_to_save:
                user_ser = UserConversationMappingSerializer(data=user_data_to_save, many=True)
                user_ser.is_valid(raise_exception=True)
                user_ser.save()
            standard_section_data_to_save = []
            duplicate_standard_section = {}
            if 'standard_section_ids' in data and data['standard_section_ids']:
                for standard_section in data['standard_section_ids']:
                    if standard_section in duplicate_standard_section:
                        continue
                    standard_section_data_to_save.append({
                        'standard_section': standard_section,
                        'conversation': conversation_id
                    })
                    duplicate_standard_section[standard_section] = ''
                standard_sec_ser = ConversationStandardSectionMappingSerializer(data=standard_section_data_to_save, many=True)
                standard_sec_ser.is_valid()
                standard_sec_ser.save()
    else:
        conversation_obj = Conversation.objects.get(id=conversation_id)
    return conversation_obj
    

def send_message(self, data):
    TransactionIdTracking.is_transaction_id_exists(self, 'chats_message', data['transaction_id'])
    from_user = self.request.user.id
    data['from_user'] = from_user
    for row_data in data['message_data']:
        if 'data' not in row_data:
            row_data['data'] = None
        if 'document' not in row_data:
            row_data['document'] = None
        if not row_data['data'] and not row_data['document']:
            raise exceptions.ValidationError('message data is mandatory')
    with transaction.atomic(using=get_current_db_name()):
        conversation_obj = None
        if not data['conversation_id'] and data['conversation_type'] == 1:
            for user_data in data['user_data']:
                if user_data['user_id'] == from_user:
                    raise exceptions.ValidationError('You cant send message to your self')
            data['user_data'].append({'user_id': data['from_user']})
            conversation_obj = create_chat_conversation(data)
            data['conversation_id'] = conversation_obj.id
        if not data['conversation_id']:
            raise exceptions.ValidationError('conversation_id is mandatory')
        if not conversation_obj:
            conversation_obj = Conversation.objects.get(id=data['conversation_id'])
        user_converstaion = UserConversationMapping.objects.filter(conversation=data['conversation_id'], is_active=True).values_list('user', flat=True)
        for user_data in data['user_data']:
            if user_data['user_id'] not in user_converstaion:
                raise exceptions.ValidationError('user is not matching for the conversation')
        message_data_to_save = []
        for row_data in data['message_data']:
            message_data_to_save.append({
                'conversation': data['conversation_id'],
                'data': row_data['data'],
                'document': row_data['document'],
                'from_user': from_user
            })
        if message_data_to_save:
            ser = MessageSerializer(data=message_data_to_save, many=True)
            ser.is_valid(raise_exception=True)
            message = ser.save()
            conversation_obj.message_last_updated = datetime.datetime.now()
            conversation_obj.save()
            for message_data in message_data_to_save:
                push_subject = ''
                if conversation_obj.name:
                    push_subject += conversation_obj.name + ' | '
                user_obj = User.objects.get(id=from_user)
                if user_obj.student:
                    name = get_full_name(user_obj.student.first_name, user_obj.student.middle_name, user_obj.student.last_name)
                elif user_obj.staff:
                    name = get_full_name(user_obj.staff.first_name, user_obj.staff.middle_name, user_obj.staff.last_name)
                else:
                    name = user_obj.username
                push_subject += name
                save_transaction_tracking({'transaction_id': data['transaction_id'], 'model_name': 'chats_message'})
                SharedService.custom_thread(send_message_notification, {
                    'user': from_user,
                    'conversation': conversation_obj.id,
                    'push_body': message_data['data'],
                    'push_subject': push_subject
                })
            return {'Reason': 'Message Saved Successfully', 'data': {
                'conversation_id': conversation_obj.id,
                'conversation_type': conversation_obj.conversation_type
            }}
        else:
            raise exceptions.ValidationError('No Data to Save')
    
def send_message_notification(notification_data):
    customized_data = []
    extra_params = {
        'screen': 'chat', 'params': {
            'conversation': notification_data['conversation'],
        }
    }
    customized_data.append(
    {   'push_subject': notification_data['push_subject'], 'push_body': notification_data['push_body'], 'push_notification': 1,
        'user_id': notification_data['user'], 'extra_params': extra_params
    })
    if customized_data:
        send_notification('chat_send_message', body=None, customizedData=customized_data)
    
def check_is_user_have_access_to_conversation(self, conversation_id):
    if not UserConversationMapping.objects.filter(conversation=conversation_id, user=self.request.user.id, is_admin=True, is_active=True).exists():
        raise exceptions.ValidationError('No Permission to Edit the data')

def create_group(self, data):
    creater_user_id = self.request.user.id
    if data['conversation_type'] != 2:
        raise exceptions.ValidationError('conversation_type should be 2')
    if 'user_data' not in data:
        data['user_data'] = []
    data['user_data'].append({
        'user_id': creater_user_id,
        'is_admin': True
    })
    conversation_obj = create_chat_conversation(data)
    return {'Reason': 'Data Added Successfully', 'conversation_id': conversation_obj.id}

def update_conversation(self, data):
    conversation_id = self.kwargs['pk']
    if not conversation_id:
        raise exceptions.ValidationError('Invalid conversation id')
    conversation_values = Conversation.objects.filter(id=conversation_id).values()[0]
    for key in conversation_values:
        if key not in data:
            data[key] = conversation_values[key]
    check_is_user_have_access_to_conversation(self, conversation_id)
    delete_user_ids = data['delete_user_ids'] if 'delete_user_ids' in data else []
    delete_standard_section_ids = data['delete_standard_section_ids'] if 'delete_standard_section_ids' in data else []
    user_data = data['new_user_data'] if 'new_user_data' in data else []
    data['updatable_user_data'] = data['updatable_user_data'] if 'updatable_user_data' in data else []
    standard_section_ids = data['new_standard_section_ids'] if 'new_standard_section_ids' in data else []
    data['standard_section_ids'] = standard_section_ids
    data['user_data'] = user_data
    updated_count = 0
    if delete_user_ids:
        updated_count += UserConversationMapping.objects.filter(user__in=delete_user_ids, conversation=conversation_id, is_active=True).update(
            is_active=False
        )
    if delete_standard_section_ids:
        updated_count += ConversationStandardSectionMapping.objects.filter(standard_section__in=delete_standard_section_ids, conversation=conversation_id, is_active=True).update(
            is_active=False
        )
    create_chat_conversation(data)
    return {'Reason': f'Data Updated Successfully. Total updated Rows {updated_count}'}

def get_conversation_data(self):
    conversation_id = int(self.kwargs['pk'])
    logged_in_user = self.request.user.id
    page = self.request.GET.get('page')
    limit = self.request.GET.get('limit')
    send_all_users_in_group = self.request.GET.get('send_all_users_in_group')
    user_id = self.request.GET.get('user')
    get_only_user_details = self.request.GET.get('get_only_user_details')
    if conversation_id == 0: #when click on the user from the group list
        try:
            user1_conversations = UserConversationMapping.objects.filter(
                user=logged_in_user, conversation__conversation_type=1,
                is_active=True, conversation__is_active=True
            ).values_list('conversation_id', flat=True)
            conversation_obj = Conversation.objects.filter(
                id__in=user1_conversations, user_conversation_mapping_conversation__user_id=user_id,
                is_active=True
            ).first()
            if not conversation_obj:
                raise exceptions.ValidationError('Invalid conversation_id')
        except Exception as e:
            user_queryset = User.objects.get(id=user_id)
            data = ChatUserReadSerializer(user_queryset).data
            return data #return empty if no conversation
    else:
        conversation_obj = Conversation.objects.get(id=conversation_id)
    conversation_data = ConversationDetailedReadSerializer(conversation_obj).data
    return_data = {'conversation_data': conversation_data}
    if conversation_obj.conversation_type == 1:
        converstaion_user_data = UserConversationMapping.objects.filter(conversation=conversation_obj.id, user__is_active=True).exclude(user=logged_in_user).first()
        data = UserConversationMappingReadSerializer(converstaion_user_data).data
        name = None
        profile_pic_details = None
        if data['user_data']['student']:
            name = data['user_data']['student']['name']
            profile_pic_details = data['user_data']['student']['profile_pic_details']
        elif data['user_data']['staff']:
            name = data['user_data']['staff']['full_name']
            profile_pic_details = data['user_data']['staff']['profile_pic_details']
        else:
            name = 'admin'
        return_data['conversation_data'].update({'name': name, 'document_details': profile_pic_details, 'staff': data['user_data']['staff'], 'student': data['user_data']['student']})
    else:
        if send_all_users_in_group:
            user_conversation_data = UserConversationMapping.objects.filter(conversation=conversation_obj.id, user__is_active=True, is_active=True).values(
                'user', 'is_admin'
            )
            user_conversation_mapping = {}
            user_ids = []
            for user_conv in user_conversation_data:
                user_conversation_mapping[user_conv['user']] = user_conv
                user_ids.append(user_conv['user'])
            user_data = User.objects.filter(id__in=user_ids)
            data = ChatUserReadSerializer(user_data, many=True).data
            for row_data in data:
                row_data['is_admin'] = user_conversation_mapping[row_data['id']]
        else:
            user_ids = get_user_ids_in_conversation_id(conversation_obj.id)
            user_data = User.objects.filter(id__in=user_ids)
            data, count, next_page, previous_page = SharedService.custom_pagination(self, user_data,
                                                                                        limit,
                                                                                        page)
            data = ChatUserReadSerializer(data, many=True).data
        standard_section_datas = ConversationStandardSectionMapping.objects.filter(
            conversation=conversation_id, is_active=True
        ).values_list('standard_section', flat=True)
        return_data['conversation_data']['standard_section_ids'] = standard_section_datas
        user_data = []
        staff_data = []
        student_data = []
        paginated_user_ids = []
        paginated_student_ids = []
        student_standard_sec_mapping = {}
        for row_data in data:
            paginated_user_ids.append(row_data['id'])
            if row_data['student']:
                paginated_student_ids.append(row_data['student']['id'])
        if paginated_student_ids:
            student_standard_sec_mapping = get_student_current_standard_section_name(paginated_student_ids)
        user_conversation_data = UserConversationMapping.objects.filter(user__in=paginated_user_ids)
        user_conv_mapping = {u['user'] : u for u in UserConversationMappingReadSerializer(user_conversation_data, many=True).data}
        for row_data in data:
            name = None
            profile_pic_details = None
            if row_data['student']:
                name = row_data['student']['name']
                profile_pic_details = row_data['student']['profile_pic_details']
                row_data['student']['standard_name'] = student_standard_sec_mapping[row_data['student']['id']]['standard_name']
                row_data['student']['section_name'] = student_standard_sec_mapping[row_data['student']['id']]['section_name']
                row_data['student']['admission_num'] = student_standard_sec_mapping[row_data['student']['id']]['admission_num']
            elif row_data['staff']:
                name = row_data['staff']['full_name']
                profile_pic_details = row_data['staff']['profile_pic_details']
            else:
                name = 'superadmin'
            is_admin = user_conv_mapping[row_data['id']]['is_admin'] if row_data['id'] in user_conv_mapping else False
            user_created = user_conv_mapping[row_data['id']]['created'] if row_data['id'] in user_conv_mapping else None
            if not user_created:
                user_created = conversation_obj.created #for now showing conversation create date time when standard section wise student data is fetching change this to find the student standard section and then find the created date time
            user_data.append({
                'user_id': row_data['id'],
                'is_admin': is_admin,
                'user_created': user_created,
                'name': name,
                'profile_pic_details': profile_pic_details,
                'staff': row_data['staff'],
                'student': row_data['student']
            })
            if row_data['staff']:
                staff_data.append(row_data)
            if row_data['student']:
                student_data.append(row_data)
        if not send_all_users_in_group:
            return_data['user_data'] = {
                'data': user_data, 'count': count, 'next': next_page, 'previous': previous_page
            }
        else:
            return_data['user_data'] = user_data
            return_data['student_user_data'] = student_data
            return_data['staff_user_data'] = staff_data
    return return_data
    

def get_conversation_ids_for_user(user_obj):
    conversation_ids = list(UserConversationMapping.objects.filter(user=user_obj.id).values_list(
        'conversation', flat=True
    ))
    if user_obj.student:
        standard_section_ids = Enrollment.objects.filter(student=user_obj.student).values_list('standard_section', flat=True)
        conversation_ids += list(ConversationStandardSectionMapping.objects.filter(standard_section__in=standard_section_ids).values_list(
            'conversation', flat=True
        ))
    return conversation_ids

def get_my_chat_list(self, data):
    filter_data = data.get('filter_data', {})
    user_obj = self.request.user
    page = int(filter_data.get('page', 1))  
    limit = 10  
    conversation_ids = set(get_conversation_ids_for_user(user_obj))
    group_id = FormdefinitionService.get_formdefintion_data(self, 'chat_configuration', 'group_id')
    pin_status = FormdefinitionService.get_formdefintion_data(self, 'chat_configuration', 'class_teacher_pin_status')

    pinned_group_ids = set(map(int, str(group_id).split(','))) if group_id else set()
    user_objs = User.objects.filter(groups__in=pinned_group_ids)
    valid_user_ids = []
    for user_id in user_objs.values_list('id', flat=True):
        if user_obj.id != user_id:
            valid_user_ids.append(user_id)
    # Fetch pinned conversations
    pinned_conversations = []
    pinned_conversation_ids = []
    un_found_user_data = []
    if pin_status == 1:
        user_conversation = UserConversationMapping.objects.filter(
            user__in=valid_user_ids, is_active=True
        ).values('conversation_id', 'user_id')
        user_conv_user_ids = set()
        user_conv_conv_ids = set()
        for user_con in user_conversation:
            user_conv_user_ids.add(user_con['user_id'])
            user_conv_conv_ids.add(user_con['conversation_id'])
        if user_conv_conv_ids:
            pinned_conversations = Conversation.objects.filter(
                id__in=list(user_conv_conv_ids), is_active=True
            ).order_by('-message_last_updated')

    non_pinned_conversations = Conversation.objects.filter(
        id__in=conversation_ids.difference(valid_user_ids), is_active=True
    ).order_by('-message_last_updated')

    # un_found_user_data pinned but conversation not happend
    conversation_data =  list(pinned_conversations) + list(non_pinned_conversations) if pin_status == 1 else list(non_pinned_conversations)

    data, count, next_page, previous_page = SharedService.custom_pagination(self, conversation_data, limit, page)

    chat_data = []
    for conversation in data:
        last_message = conversation.message_conversation.filter(is_active=True).last()
        if conversation.conversation_type == 1 and not last_message:
            continue

        ser = MessageReadSerializer(last_message)
        temp_data = {
            'conversation': conversation.id,
            'last_message': ser.data,
            'is_group': False,
            'conversation_name': conversation.name,
            'description': conversation.description,
            'message_last_updated': conversation.message_last_updated,
            'conversation_type': conversation.conversation_type,
            'is_pinned': True if conversation.id in pinned_conversation_ids else False
        }

        if conversation.conversation_type == 1:
            user_queryset = UserConversationMapping.objects.filter(conversation=conversation.id).exclude(
                user=user_obj.id
            ).first()
            if user_queryset:
                ser = ChatUserReadSerializer(user_queryset.user)
                temp_data['user_details'] = ser.data

        if conversation.conversation_type == 2:
            conversation_obj = Conversation.objects.get(id=conversation.id)
            c_obj = ConversationReadSerializer(conversation_obj).data
            temp_data['document_details'] = c_obj.get('document_details')

        chat_data.append(temp_data)

    return {
        'chat_data': chat_data,
        'count': count,
        'next_page': next_page,
        'previous_page': previous_page
    }

    
def get_individual_chat_data(self):
    conversation_id = int(self.kwargs['pk'])
    recent_fetched_id = self.request.GET.get('recent_fetched_id')
    user_id = self.request.GET.get('user_id')
    page = int(self.request.GET.get('page')) if self.request.GET.get('page') else None
    if not page and not recent_fetched_id:
        raise exceptions.ValidationError('recent_fetched_id or page is mandatory')
    if conversation_id == 0: #nikhil this is wrong from app percpective
        try:
            user1_conversations = UserConversationMapping.objects.filter(
                user=self.request.user.id, conversation__conversation_type=1,
                is_active=True, conversation__is_active=True
            ).values_list('conversation_id', flat=True)
            conversation = UserConversationMapping.objects.filter(
                user_id=user_id,
                conversation_id__in=user1_conversations,
                is_active=True
            ).values('conversation_id').first()
            if not conversation:
                raise exceptions.ValidationError('Invalid conversation_id')
            conversation_id = conversation['conversation_id']
        except Exception as e:
            return [] #return empty if no conversation
    message_filter = {'conversation': conversation_id, 'is_active': True}
    if page:
        limit = 10
        from_index = (page - 1) * limit
        to_index = from_index + limit
        message_data = Message.objects.filter(**message_filter).order_by('-created')[from_index:to_index]
    elif recent_fetched_id:
        message_filter['id__gt'] = recent_fetched_id
        message_data = Message.objects.filter(**message_filter).order_by('-created')
    earlier_messages = MessageIndividualSerializer(message_data, many=True).data
    message_ids = []
    message_user_detail_data_mapping = {}
    for message in earlier_messages:
        message_ids.append(message['id'])
    message_detail_data = MessageUserDetail.objects.filter(
        message__in=message_ids
    ).values()
    for message in message_detail_data:
        if message['message'] not in message_user_detail_data_mapping:
            message_user_detail_data_mapping[message['message']] = {}
        message_user_detail_data_mapping[message['message']][message['read_by_user']] = message
    for message in earlier_messages:
        if message['id'] in message_user_detail_data_mapping:
            message.update(message_user_detail_data_mapping[message['id']])
    return earlier_messages

def search_chat_and_contacts(self):
    return_data = {
        'chat_contact_data': {},
        'chat_conversation_data': {},
    }
    today_date = datetime.datetime.today()
    current_academic_year = AcademicYear.get_academic_year_for_date(self, today_date)
    user_obj = self.request.user
    search_key = self.request.GET.get('search')
    if not search_key:
        raise exceptions.ValidationError('search key is mandatory')
    student_filter_query = {}
    if not self.request.user.is_superuser:
        standard_ids = StaffStandardMapping.objects.filter(
            staff=user_obj.staff
        ).values_list('standard', flat=True)
        student_filter_query['student__current_standard__in'] = standard_ids
    if user_obj.student:
        student_filter_query['student__isnull'] = True #student logged in dont show students
    search_query = Q()
    search_query |= Q(student__first_name__icontains=search_key) | Q(student__middle_name__icontains=search_key) | Q(student__last_name__icontains=search_key) | Q(student__mobile_num__icontains=search_key) | Q(staff__first_name__icontains=search_key) | Q(staff__middle_name__icontains=search_key) | Q(staff__last_name__icontains=search_key) | Q(staff__mobile_num__icontains=search_key)
    user_queryset = User.objects.filter(
    Q(is_active=True) & (
        (Q(**student_filter_query) & search_query) | (Q(staff__isnull=False) & search_query)
    )
    ).annotate(
        student_name=Concat(
            'student__first_name', Value(' '), 'student__middle_name', Value(' '), 'student__last_name',
            output_field=CharField()
        ),
        staff_name=Concat(
            'staff__first_name', Value(' '), 'staff__middle_name', Value(' '), 'staff__last_name',
            output_field=CharField()
        )
    ).order_by('student_name', 'staff_name')
    data, count, next_page, previous_page = SharedService.custom_pagination(self, user_queryset,
                                                                                self.request.GET.get('contact_data_limit'),
                                                                                self.request.GET.get('contact_data_page'))
    user_data = ChatUserReadSearchSerializer(data, many=True).data
    enrollment_data_mapping = {}
    if current_academic_year:
        enrollment_data_mapping = {e['student_id']: e for e  in Enrollment.objects.filter(
            standard_section__academic_year=current_academic_year.id
        ).values(
            'standard_section', 'standard_section__section__name', 'student_id', 
            'standard_section__standard__name', 'standard_section__standard__id'
        )}
        for user in user_data:
            if user['student'] and user['student']['id'] in enrollment_data_mapping:
                user['student']['section_name'] = enrollment_data_mapping[user['student']['id']]['standard_section__section__name']
                user['student']['standard_name'] = enrollment_data_mapping[user['student']['id']]['standard_section__standard__name']
                user['student']['standard_section'] = enrollment_data_mapping[user['student']['id']]['standard_section']
    return_data['chat_contact_data']['data'] = user_data
    return_data['chat_contact_data']['count'] = count
    return_data['chat_contact_data']['next_page'] = next_page
    return_data['chat_contact_data']['previous_page'] = previous_page

    # conversation_ids = get_conversation_ids_for_user(user_obj)
    # message_data = Message.objects.filter(conversation__in=conversation_ids).values()


    return return_data
    