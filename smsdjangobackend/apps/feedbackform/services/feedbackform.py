from django.db import transaction
from django.db.models import Q

from apps.classes.models.enrollment import Enrollment, StudentStandardMapping
from apps.institutes.models.institute import Institute
from apps.feedbackform.models import FeedBackForm
from apps.feedbackform.models.feedbackform import (FeedBackFormAlternateTeacherMapping, FeedBackFormChoice, FeedBackFormChoiceAnswer, FeedBackFormResponse, 
                                                   UserFeedBackFormMapping, FeedBackFormUserResponseTracking, FeedBackFormBranchMapping)
from apps.students.models.student import Student
from rest_framework.exceptions import ValidationError
from datetime import datetime, timedelta

from apps.shared.services import SharedService
from apps.users.models import User
from apps.feedbackform.models import FeedBackFormQuestion, FeedBackFormStandardSectionMapping
from apps.classes.models import StandardSectionMapping
from apps.feedbackform.serializers import (FeedBackFormSerializer, FeedBackFormQuestionSerializer, FeedBackFormChoiceSerializer, FeedBackFormBranchMappingSerializer,
                                   FeedBackFormStandardSectionMappingSerializer, FeedBackFormReadSerializer, FeedBackFormChoiceAnswerSeriaizer, FeedBackFormAlternateTeacherMappingSerializer, FeedBackFormResponseReadSerializer,
                                   UserFeedBackFormMappingSerializer, FeedBackFormUserResponseTrackingSerializer, FeedBackFormReadWithResponseForSummarySerializer)
from apps.tenants.services.middlewares import get_current_db_name
from apps.staffs.services.staff import get_staff_for_academic_year
from apps.hr.models.staffTeachingHour import StaffTeachingHour
from apps.staffs.models.staff import Staff
from apps.staffs.serializers import StaffAllDetailSerializer
"""
    when returnSavingFunction false we return the validation function for it.
"""


def feedbackform_question_type_handler_function(questionType, returnFunction='validateFunction'):
    temp = {
        1: {
            'validateFunction': validate_feedbackform_multiple_choice,
            'saveFunction': feedbackform_save_choices_data,
            'validateResponse': validate_multiple_choice_feedbackform_response,
            'calculate_score': calculate_score_feedbackform_multiple_choice
        },
        2: {
            'validateFunction': validate_feedbackform_checkbox,
            'saveFunction': feedbackform_save_choices_data,
            'validateResponse': validate_checkbox_feedbackform_response,
            'calculate_score': calculate_score_feedbackform_checkbox
        },
        3: {
            'validateFunction': validate_feedbackform_oneword,
            'saveFunction': feedbackform_save_choices_data,
            'validateResponse': validate_oneword_feedbackform_response,
            'calculate_score': calculate_score_feedbackform_oneword
        },
    }
    if questionType not in temp:
        raise ValidationError('Invalid question type')
    return temp[questionType][returnFunction]


def create_feedbackform(self, request):
    data = request.data
    if 'id' in data['form'] and data['form']['id']:
        for questionData in data['form']['questions']:
            questionData['form'] = data['form']['id']
    validate_feedbackform(self, data['form'])
    with transaction.atomic(using=get_current_db_name()):
        formId = save_feedbackform_data(self, data['form'])
        for formData in data['form']['questions']:
            formData['form'] = formId
        feedbackform_save_question_data(self, data['form']['questions'])
    return {'Reason': 'Data Added Successfully', 'formId': formId}


def delete_feedbackform(self, request):
    formCode = self.kwargs['pk']
    if FeedBackFormResponse.objects.filter(is_active=True, form__form_code=formCode).count() > 0:
        raise ValidationError('Few of the students are submitted the response')
    self.get_queryset().filter(form_code=self.kwargs['pk']).delete()
    questionIds = FeedBackFormQuestion.objects.filter(
        form__form_code=formCode).values_list('id', flat=True)
    feedbackform_delete_question_data(questionIds)
    return {'Reason': 'Data deleted Successfully'}


def read_feedbackform_data(self, request):
    queryset = self.filter_queryset(self.get_queryset())
    studentId = None
    userId = None
    form_type = self.request.GET.get('form_type')
    is_for_response = self.request.GET.get('is_for_response')
    if request.GET.get('academic_year'):
        queryset = queryset.filter(academic_year=request.GET.get('academic_year'),form_type=form_type).distinct()
    if self.request.user.is_superuser:
        pass
    elif not self.request.user.is_staff and is_for_response:
        studentId = request.user.student
        userId = request.user
        if not studentId:
            raise ValidationError('Invalid user type')
        queryset = queryset.filter(is_finalized=True, is_for_staff = 0,form_type = form_type)
        standard = StudentStandardMapping.objects.filter(student = studentId,academic_year = request.GET.get('academic_year')).values('standard','standard__branch').last()
        standard_section_id = Enrollment.objects.filter(student = studentId,standard_section__academic_year = request.GET.get('academic_year'),
                                                        standard_section__standard = standard['standard']).values().last()
        form_list = queryset.values_list('id',flat=True)
        feedbackformbranch = FeedBackFormBranchMapping.objects.filter(form__in = form_list,branch = standard['standard__branch']).values_list('form_id',flat=True)
        feedbackformstandardsection = FeedBackFormStandardSectionMapping.objects.filter(form__in=form_list,standard_section_id = standard_section_id['standard_section_id']).values_list('form_id',flat=True)
        feedbackformstudent = UserFeedBackFormMapping.objects.filter(form__in=form_list,user__student = studentId).values_list('form_id',flat=True)
        form_id = list(feedbackformbranch) +list(feedbackformstandardsection)+list(feedbackformstudent)
        queryset = FeedBackForm.objects.filter(id__in = form_id)
    elif is_for_response:
        staffId = request.user.staff
        userId = request.user
        if not staffId:
            raise ValidationError('Invalid user type')
        feedbackformstaff = UserFeedBackFormMapping.objects.filter(form__in=form_list,user__staff = staffId).values_list('form_id',flat=True)
        form_id = list(feedbackformstaff)
        queryset = FeedBackForm.objects.filter(id__in = form_id)
    else:
        queryset = queryset.filter(Q(creater=self.request.user.id,form_type=form_type) | Q(feedbackform_alternate_teacher_mapping__staff=self.request.user.staff.id,form_type=form_type) )
    self.serializer_class = FeedBackFormReadSerializer
    serializer = self.get_serializer(queryset, many=True)
    data, count, next_page, previous_page = SharedService.custom_pagination(self, serializer.data,
                                                                            self.request.GET.get(
                                                                                'limit'),
                                                                            self.request.GET.get(
                                                                                'pageno')
                                                                            )
    formIds = [form['id'] for form in data]
    responseData = FeedBackFormResponse.objects.filter(is_active=True, form__in=formIds, responder_user=userId)
    responseData = FeedBackFormResponseReadSerializer(
        responseData, many=True, read_only=True).data
    formLastSequence = {}
    for r in responseData:
        formLastSequence[r['form']['id']] = {'last_sequence': 0, 'data': r}
        for choiceAns in r['choice_answer_response']:
            formLastSequence[r['form']['id']]['last_sequence'] = choiceAns['question_sequence']
    for formData in data:
        formData['number_of_questions'] = len(formData['question_form'])
        formData['number_of_students'] = len(
            formData['user_form_mapping_form'])
        formData['number_of_responses'] = len(responseData)
        formData['last_submitted_sequence'] = 0
        formData['response_data'] = {}
        formData['access'] = {
            'update': False, 'view': False
        }
        if formData['creater'] == self.request.user.id:
            formData['access'] = {
                'update': True, 'view': True
            }
        if formData['id'] in formLastSequence:
            formData['last_submitted_sequence'] = formLastSequence[formData['id']
                                                                   ]['last_sequence']
            formData['response_data'] = formLastSequence[formData['id']]['data']
        for f in formData['alternate_teacher_mapping_form']:
            if self.request.user.is_staff and self.request.user.staff and self.request.user.staff.id and self.request.user.staff.id == f['staff'] and not is_for_response:
                view = f['view']
                if f['update']:
                    view = True
                formData['access'] = {
                    'view': view, 'update': f['update']}
        del(formData['user_form_mapping_form'])
        del(formData['question_form'])
        del(formData['alternate_teacher_mapping_form'])
    return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}}


"""
    For student we send question one by one after the submission of one question we send next question
    If all the answers are attended we will send all the question with answer can be used for response also
"""


def read_feedbackform_data_individual(self, request):
    studentId = request.GET.get('student') if (self.request.user.is_staff and request.GET.get(
        'student')) else None  # if staff requesting for student data
    is_for_response = request.GET.get('is_for_response')
    forStudent = None  # used to hide the answer for the student
    createTracking = False
    responseData = {}
    isStudentFullySubmitted = False
    lastSumbittedSequence = 0
    maxQuestionSeq = 0
    showSequence = 0
    questionResponseMapping = {}
    submittedQuestionSequenceData = []
    currentQuestion = None
    responseTracking = {}
    totalAttendedQuestion = 0
    with transaction.atomic(using=get_current_db_name()):
        if is_for_response:
            userId = request.user.id
            forStudent = False if is_for_response else True
            if not userId:
                raise ValidationError('Invalid user type')
            responseData = FeedBackFormResponse.objects.filter(
                is_active=True, form__form_code=self.kwargs['pk'], responder_user=userId)
            responseData = FeedBackFormResponseReadSerializer(
                responseData, many=True, read_only=True).data
            responseData = responseData[0] if len(responseData) > 0 else {}
            if responseData:
                if responseData['is_submitted']:
                    forStudent = False
                totalAttendedQuestion = responseData['choice_answer_response']
                for choiceA in responseData['choice_answer_response']:
                    submittedQuestionSequenceData.append({'question': choiceA['question'],
                                                          'question_sequence': choiceA['question_sequence']}
                                                         )
                    questionResponseMapping[choiceA['question']] = choiceA
                    if lastSumbittedSequence < choiceA['question_sequence']:
                        lastSumbittedSequence = choiceA['question_sequence']
            responseTracking = FeedBackFormUserResponseTracking.objects.filter(
                user=userId, form__form_code=self.kwargs['pk']).values()
            responseTracking = {r['question_id']: r for r in responseTracking}
        self.serializer_class = FeedBackFormReadSerializer
        response = SharedService.read_data(self)
        formData = response['data']
        showPreviousQuestionData = False
        choiceIndexMapping = {}
        formData['total_points'] = 0
        for questionData in formData['question_form']:
            if questionData['sequence'] > maxQuestionSeq:
                maxQuestionSeq = questionData['sequence']
        if forStudent and maxQuestionSeq == lastSumbittedSequence:
            isStudentFullySubmitted = True
        if request.GET.get('sequence'):
            showSequence = request.GET.get('sequence')
        elif forStudent:
            showSequence = lastSumbittedSequence + 1
        tempQuestionData = []
        previousQuestionData = {}
        if not forStudent and not is_for_response and not formData['is_for_staff']:  # when viewing from teachers view show all student data
            studentIds = []
            for studentData in formData['user_form_mapping_form']:
                studentIds.append(studentData['student_id'])
            studentsectionmapping = Enrollment.objects.filter(student__in=studentIds, standard_section__academic_year=formData['academic_year']).values(
                'standard_section', 'student', 'standard_section__section__name'
            )
            studentsectionmapping = {x['student']: x for x in studentsectionmapping}
            for index, studentData in enumerate(formData['user_form_mapping_form']):
                if studentData['student'] in studentsectionmapping:
                    formData['user_form_mapping_form'][index]['section_details'] = studentsectionmapping[studentData['student']]
        elif userId and is_for_response:
            formData['student_details'] = {}
            for studentData in formData['user_form_mapping_form']:
                if str(userId) == str(studentData['user']):
                    formData['student_details'] = studentData
            del formData['user_form_mapping_form']
        if is_for_response:
            standard_section = Enrollment.get_student_standard_for_academic(self, formData['academic_year'],self.request.user.student.id, True)
            staff_list = StaffTeachingHour.objects.filter(academic_year_id = formData['academic_year'],assigned_subjects__standard_section_id = standard_section['standard_section']).values_list('staff_id',flat=True)
            queryset = Staff.objects.filter(id__in = staff_list)
            serializer = StaffAllDetailSerializer(queryset, many=True)
            formData['staff_list'] = serializer.data
        for questionData in formData['question_form']:
            questionData['response'] = {}
            questionData['response_track'] = {}
            if questionData['id'] in responseTracking:
                questionData['response_track'] = responseTracking[questionData['id']]
            if questionData['id'] in questionResponseMapping:
                questionData['response'] = questionResponseMapping[questionData['id']]
            if not isStudentFullySubmitted and forStudent and str(showSequence) != str(questionData['sequence']):
                continue
            # for choiceData in questionData['choice_question']:
            #     # show answer except to student
            #     if forStudent and not (questionData['show_answer_after_submit'] and len(questionData['response']) > 0):
            #         if questionData['question_type'] != 4:
            #             del(choiceData['is_answer'])
            tempQuestionData.append(questionData)
        formData['question_form'] = tempQuestionData
        formData['access'] = {
            'update': False, 'view': False
        }
        if formData['creater'] == self.request.user.id:
            formData['access'] = {
                'update': True, 'view': True
            }
        for f in formData['alternate_teacher_mapping_form']:
            if self.request.user.is_staff and self.request.user.staff.id and self.request.user.staff.id == f['staff']:
                view = f['view']
                if f['update']:
                    view = True
                formData['access'] = {
                    'view': view, 'update': f['update']}
        formData['total_question'] = len(formData['question_form'])
        formData['total_attended_question'] = totalAttendedQuestion
        formData['is_student_fully_submitted'] = isStudentFullySubmitted
        formData['last_question_sequence'] = maxQuestionSeq
        formData['submitted_question'] = submittedQuestionSequenceData
        formData['last_submitted_sequence'] = lastSumbittedSequence
        formData['response_data'] = responseData
        formData['obtained_points'] = 0
        formData['response_track'] = responseTracking.values()
        if 'choice_answer_response' in responseData:
            for cData in responseData['choice_answer_response']:
                formData['obtained_points'] += cData['points']
        formData['is_already_attended'] = False
        # for question in FeedBackFormUserResponseTracking
        # if is_for_response:
        #     now = datetime.now()
        #     payload = {'user': userId,
        #                 'form': formData['id'], 'question': currentQuestion['id']}
        #     queryset = FeedBackFormUserResponseTracking.objects.filter(**payload).values()
        #     if currentQuestion and currentQuestion['time_limit_to_answer'] and int(currentQuestion['time_limit_to_answer']) > 0:
        #         # buffer time if takes time to hit the backend
        #         payload['end_time'] = now + \
        #             timedelta(
        #                 seconds=(int(currentQuestion['time_limit_to_answer'])+5))
        #     if not queryset:
        #         self.queryset = FeedBackFormUserResponseTracking
        #         self.serializer_class = FeedBackFormUserResponseTrackingSerializer
        #         SharedService.add_data(self, payload, False)
        #     elif queryset[0]['end_time'] and queryset[0]['end_time'] > now:
        #         formData['is_already_attended'] = True
    return {'data': formData}


def save_feedbackform_data(self, data):
    standardSectionIds = []
    branchId = []
    data['is_finalized'] = 1
    if 'id' not in data or (not data['id']):
        data['form_code'] = SharedService.generate_random_number()
        data['creater'] = self.request.user.id
    if 'standard_section_ids' in data:
        standardSectionIds = data['standard_section_ids']
        del data['standard_section_ids']
    if 'branch_id' in data:
        branchId = data['branch_id']
        del data['branch_id']
    if 'id' in data and data['id']:
        instance = FeedBackForm.objects.get(id=data['id'])
        serializer = FeedBackFormSerializer(instance=instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        formId = serializer.data['id']
    else:
        serializer = FeedBackFormSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        formId = serializer.data['id']
    if standardSectionIds:
        FeedBackFormStandardSectionMapping.objects.filter(form=formId).exclude(
            standard_section__in=standardSectionIds).delete()
        existinStaSecIds = FeedBackFormStandardSectionMapping.objects.filter(
            form=formId).values_list('standard_section', flat=True)
        insertableIds = set(standardSectionIds) - (set(existinStaSecIds))
        if len(insertableIds) > 0:
            tempData = []
            for standSecId in insertableIds:
                tempData.append(
                    {'form': formId, 'standard_section': standSecId})
            self.queryset = FeedBackFormStandardSectionMapping
            self.serializer_class = FeedBackFormStandardSectionMappingSerializer
            SharedService.add_data(self, tempData)
    if branchId:
        FeedBackFormBranchMapping.objects.filter(form=formId).exclude(
            branch__in=branchId).delete()
        existinbranchIds = FeedBackFormBranchMapping.objects.filter(
            form=formId).values_list('branch', flat=True)
        insertableIds = set(branchId) - (set(existinbranchIds))
        if len(insertableIds) > 0:
            tempData = []
            for standSecId in insertableIds:
                tempData.append(
                    {'form': formId, 'branch': standSecId})
            self.queryset = FeedBackFormBranchMapping
            self.serializer_class = FeedBackFormBranchMappingSerializer
            SharedService.add_data(self, tempData)
    addedAlternativeTeachers = []
    if 'alternate_teachers' in data and data['alternate_teachers']:
        teacherIds = [a['staff'] for a in data['alternate_teachers']]
        existingAlternateTeacherdata = {str(a['staff']): a['id'] for a in FeedBackFormAlternateTeacherMapping.objects.filter(form=formId,
                                                                                                                 staff__in=teacherIds).values('staff', 'id')}
        alternateData = []
        for aData in data['alternate_teachers']:
            if str(aData['staff']) in existingAlternateTeacherdata:
                aData['id'] = existingAlternateTeacherdata[str(aData['staff'])]
            aData['form'] = formId
            alternateData.append(aData)
        self.queryset = FeedBackFormAlternateTeacherMapping
        self.serializer_class = FeedBackFormAlternateTeacherMappingSerializer
        for aData in alternateData:
            if 'id' in aData and aData['id']:
                instance = FeedBackFormAlternateTeacherMapping.objects.get(id=aData['id'])
                serializer = FeedBackFormAlternateTeacherMappingSerializer(
                    instance=instance, data=aData, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
                addedAlternativeTeachers.append(serializer.data['id'])
            else:
                addedAlternativeTeachers.append(
                    SharedService.add_data(self, aData, False)['data']['id'])
    """ Deleting when alternative teachers are not sent """
    FeedBackFormAlternateTeacherMapping.objects.filter(form=formId).exclude(
        id__in=addedAlternativeTeachers).delete()
    if 'students' in data and data['students'] or 'staffs' in data and data['staffs']:
        if 'students' in data and data['students']:
            user_ids = User.objects.filter(student__in = data['students']).values()
        if 'staffs' in data and data['staffs']:
            user_ids = User.objects.filter(staff__in = data['staffs']).values()
        existingStudentData = {str(a['user']): a['id'] for a in UserFeedBackFormMapping.objects.filter(
            form=formId, user__in=user_ids).values('user','user__student', 'id','user__staff')}
        studentdata = []
        for studentId in user_ids:
            temp = {}
            if str(studentId) in existingStudentData:
                temp['id'] = existingStudentData[str(studentId)]
            temp['form'] = formId
            temp['user'] = studentId
            studentdata.append(temp)
        UserFeedBackFormMapping.objects.filter(form=formId).exclude(user__in=user_ids).delete()
        self.queryset = UserFeedBackFormMapping
        self.serializer_class = UserFeedBackFormMappingSerializer
        for sData in studentdata:
            if 'id' in sData and sData['id']:
                instance = UserFeedBackFormMapping.objects.get(id=sData['id'])
                serializer = UserFeedBackFormMappingSerializer(
                    instance=instance, data=sData, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
            else:
                SharedService.add_data(self, sData, False)
    return formId


def feedbackform_save_question_data(self, data):
    choiceIds = []
    questionIds = []
    formIds = set()
    for question in data:
        self.queryset = FeedBackFormQuestion
        self.serializer_class = FeedBackFormQuestionSerializer
        formIds.add(question['form'])
        if 'id' in question and question['id']:
            instance = FeedBackFormQuestion.objects.get(id=question['id'])
            serializer = self.get_serializer(
                instance=instance, data=question, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        else:
            question['id'] = SharedService.add_data(
                self, question, False)['data']['id']
        questionIds.append(question['id'])
        for choice in question['choices']:
            choice['question'] = question['id']
            if 'id' in choice and choice['id']:
                choiceIds.append(choice['id'])
        deltableChoices = FeedBackFormChoice.objects.filter(question=question['id']).exclude(
            id__in=choiceIds
        ).values_list('id', flat=True)
        if FeedBackFormChoiceAnswer.objects.filter(id__in=list(deltableChoices)).count() > 0:
            raise ValidationError('Some data refered')
        if deltableChoices:
            FeedBackFormChoice.objects.filter(id__in=deltableChoices).delete()
        saveChoiceData = feedbackform_question_type_handler_function(
            question['question_type'], 'saveFunction')
        saveChoiceData(self, question['choices'])
    questionIds = FeedBackFormQuestion.objects.filter(
        form__in=formIds).exclude(id__in=questionIds)
    # delete the question which is not mapped to form
    feedbackform_delete_question_data(questionIds)


def feedbackform_delete_question_data(questionIds):
    FeedBackFormQuestion.objects.filter(id__in=questionIds).delete()
    FeedBackFormChoice.objects.filter(question__in=questionIds).delete()


def feedbackform_save_choices_data(self, data):
    self.queryset = FeedBackFormChoice
    self.serializer_class = FeedBackFormChoiceSerializer
    for choice in data:
        if 'id' in choice and choice['id']:
            instance = FeedBackFormChoice.objects.get(id=choice['id'])
            serializer = self.get_serializer(
                instance=instance, data=choice, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        else:
            SharedService.add_data(self, choice, False)


def validate_feedbackform(self, data):
    mandatoryList = ['title', 'questions']
    SharedService.check_mandatory_field_in_list(mandatoryList, data)
    if 'id' in data and data['id']:
        formData = FeedBackForm.objects.filter(id=data['id']).values('is_finalized')
        if formData and formData[0]['is_finalized']:
            raise ValidationError('Form is already finalized')
    startDate = data['start_date'] if (
        'start_date' in data and data['start_date']) else None
    endDate = data['end_date'] if (
        'end_date' in data and data['end_date']) else None
    if (not startDate and endDate) or (not endDate and startDate):
        raise ValidationError(
            'Both start date and end date should be provided')
    if 'is_for_staff' not in data or ('form_type' not in data and not data['form_type']):
        raise ValidationError('Form Type and To select for staff or student in mandatory')     
    if startDate and endDate and endDate < startDate:
        raise ValidationError('Endate should be greater than the start date')
    if 'branch_id' in data and not data['branch_id'] and 'standard_section_id' in data and not data['standard_section_id'] and \
        'students' in data and not data['students'] and 'staffs' in data and not data['staffs']:
        raise ValidationError('please select any of the receiver')
    if 'standard_section_ids' in data and ('academic_year' not in data or not data['academic_year']):
        raise ValidationError(
            'Provide academic Year when standard Section ids are given')
    if ('students' in data and data['students']) and ('standard_section_ids' not in data):
        raise ValidationError(
            'When students are given standard_section_ids are mandatory')
    if 'standard_section_ids' and data['standard_section_ids']:
        standardAcademicData = StandardSectionMapping.objects.filter(
            id__in=data['standard_section_ids']).values_list('academic_year', flat=True)
        for academic in standardAcademicData:
            if not str(academic) == str(data['academic_year']):
                raise ValidationError(
                    'Given standard section ids are not in the academic year')
    if 'students' in data and data['students']:
        studentIds = Student.get_student_for_standard(
            data['academic_year'], [], data['standard_section_ids'], ['id'])
        studentIds = {str(s['id']): s for s in studentIds}
        unmappedStudents = []
        for studentId in data['students']:
            if str(studentId) not in studentIds:
                unmappedStudents.append(studentId)
        if unmappedStudents:
            studentdata = Student.objects.filter(id__in=unmappedStudents).values(
                'first_name', 'middle_name', 'last_name')
            studentList = ''
            for student in studentdata:
                studentList += ' '+student['first_name'] + ' ' + \
                    student['middle_name'] + ' '+student['last_name']
            raise ValidationError(
                f'{studentList} are not mapped to the given section')
    if 'alternate_teachers' in data and data['alternate_teachers']:
        teachingstaffids = get_staff_for_academic_year(
            self, data['academic_year'])
        uniqueStaffData = {}
        for alternateData in data['alternate_teachers']:
            if alternateData['staff'] in uniqueStaffData:
                raise ValidationError('Duplicate Staff found')
            uniqueStaffData[alternateData['staff']] = ''
            if alternateData['staff'] not in teachingstaffids:
                raise ValidationError(
                    f'{alternateData["staff"]} is not in teaching staff group')
    if 'staffs' in data and data['staffs']:
        teachingstaffids = get_staff_for_academic_year(
            self, data['academic_year'])
        uniqueStaffData = {}
        for alternateData in data['alternate_teachers']:
            if alternateData['staff'] in uniqueStaffData:
                raise ValidationError('Duplicate Staff found')
            uniqueStaffData[alternateData['staff']] = ''
            if alternateData['staff'] not in teachingstaffids:
                raise ValidationError(
                    f'{alternateData["staff"]} is not in teaching staff group')
    isTotalTimeSet = True if (
        'total_time' in data and data['total_time']) else False
    feedbackform_validate_question(self, data['questions'], isTotalTimeSet)


def feedbackform_validate_question(self, data, isTotalTimeSet=False):
    existingIds = []
    sequenceNumbers = []
    for question in data:
        if 'id' in question and question['id']:
            existingIds.append(question['id'])
        sequenceNumbers.append(question['sequence'])
        if 'time_limit_to_answer' in question and question['time_limit_to_answer'] and isTotalTimeSet:
            raise ValidationError(
                'Both time_limit_to_answer and time limit for question cant be set')
    sequenceNumbers.sort()
    if str(sequenceNumbers[0]) != '1':
        raise ValidationError('Invalid sequence')
    for index, sequence in enumerate(sequenceNumbers):
        if str(sequence) != str(index+1):
            raise ValidationError('Sequence is not in order')
    for question in data:
        mandatoryList = ['question_type', 'question']
        SharedService.check_mandatory_field_in_list(mandatoryList, question)
        validationFunction = feedbackform_question_type_handler_function(
            question['question_type'])
        validationFunction(self, question)


def validate_feedbackform_multiple_choice(self, question):
    choiceList = {}
    isAnswerCount = 0
    for choice in question['choices']:
        if 'data' in choice and not choice['data'] and not choice['document']:
            raise ValidationError('choice data is mandatory')
        if choice['data'] in choiceList:
            raise ValidationError(
                f'Duplicate choice data found {choice["data"]}')
        choiceList[choice['data']] = ''
        if (
            'correct_match' in choice and choice['correct_match']
        ) or (
            'shuffled_match' in choice and choice['shuffled_match']
        ):
            raise ValidationError(
                'correct_match_id , shuffled_match_id should be empty for multiple choice')
    # if isAnswerCount == 0:
    #     raise ValidationError('Any of the one option should be answer')


def validate_feedbackform_checkbox(self, questionData):
    choiceList = {}
    isAnswerCount = 0
    for choice in questionData['choices']:
        if 'data' in choice and not choice['data']:
            raise ValidationError('choice data is mandatory')
        if choice['data'] in choiceList:
            raise ValidationError(
                f'Duplicate choice data found {choice["data"]}')
        choiceList[choice['data']] = ''
        choice['is_answer'] = True if(
            choice['is_answer'] == 'true' or choice['is_answer'] == True) else False
        if choice['is_answer']:
            isAnswerCount = isAnswerCount + 1
        if (
            'correct_match' in choice and choice['correct_match']
        ) or (
            'shuffled_match' in choice and choice['shuffled_match']
        ):
            raise ValidationError(
                'correct_match_id , shuffled_match_id should be empty for multiple choice')
    # if isAnswerCount == 0:
    #     raise ValidationError('Any one of the one option should be answer')


def validate_feedbackform_oneword(self, questionData):
    if 'choices' in questionData and len(questionData['choices']) > 1:
        raise ValidationError('Choices should be only one')


def choice_answer_object(id):
    return FeedBackFormChoiceAnswer.objects.get(id=id)


def add_feedbackform_response(self, request):
    data = request.data
    if self.request.user.is_staff:
        raise ValidationError('Staff cant attend the quiz')
    validate_feedbackform_response(self, data)
    if 'is_submitted' in data and data['is_submitted']:
            data['submitted_time'] = datetime.now()
    # if data.get('only_submit_data') and data.get('id'):
    #     SharedService.add_or_update_data(self, [data], **{'partial': True})
    #     check_automatic_feedbackform_evaluation(data['id'])
    #     return {'Reason': 'Data Added Successfully'}
    # if 'only_submit_data' in data and data['only_submit_data']:
    #     responseId=SharedService.add_or_update_data(self, [data], **{'partial': True})
    #     check_automatic_feedbackform_evaluation(responseId)
    #     return {'Reason': 'Data Added Successfully'}
    with transaction.atomic(using=get_current_db_name()):
        responseId = SharedService.add_or_update_data(
            self, [data], **{'partial': True})['data']['id']
        # check_automatic_feedbackform_evaluation(responseId)
        self.queryset = FeedBackFormChoiceAnswer
        self.serializer_class = FeedBackFormChoiceAnswerSeriaizer
        for tempData in data['response_data']:
            tempData['response'] = responseId
            # scoreFunction = feedbackform_question_type_handler_function(
            #     questionMapping[tempData['question']]['question_type'], returnFunction='calculate_score')
            # tempData['points'], columnData = scoreFunction(
            #     questionMapping[tempData['question']], tempData)
            # if columnData:
            #     tempData.update(columnData)
        SharedService.add_or_update_data(
            self, data['response_data'], **{'partial': True, 'customObject': choice_answer_object})
    return {'Reason': 'Data Added Successfully'}

def check_automatic_feedbackform_evaluation(responseId):
    r = FeedBackFormResponse.objects.filter(id=responseId).values('is_submitted')
    if r[0]['is_submitted']:
        r.update(is_evaluated=True)


def calculate_score_feedbackform_multiple_choice(questionMappingData, enteredData):
    questionAnswerMapping = {}
    scoredpoints = 0
    for q in questionMappingData['choice_question']:
        if q['is_answer']:
            questionAnswerMapping[str(q['question'])] = str(q['id'])
            break
    if str(enteredData['question']) in questionAnswerMapping and len(enteredData['choices']) > 0 and str(questionAnswerMapping[str(enteredData['question'])]) == str(enteredData['choices'][0]):
        scoredpoints = questionMappingData['score']
    return scoredpoints, None


def calculate_score_feedbackform_checkbox(questionMappingData, enterdData):
    scoredPoints = 0
    answers = []
    for q in questionMappingData['choice_question']:
        if q['is_answer']:
            answers.append(q['id'])
    if answers == enterdData['choices']:
        scoredPoints = questionMappingData['score']
    return scoredPoints, None


def calculate_score_feedbackform_oneword(questionMappingData, enteredData):
    score = 0
    partial = False
    splitedAnswer = questionMappingData['choice_question'][0]['data'].split(
        ' ')
    splitedEnterdAnswer = enteredData['extra_data']['oneword'].split(' ')
    answer = questionMappingData['choice_question'][0]['data'].replace(" ", "")
    enterdAnswer = enteredData['extra_data']['oneword'].replace(" ", "")
    # remove all spaces and check the equality of the string
    if str(answer) == str(enterdAnswer):
        score = questionMappingData['score']
    else:
        if set(splitedAnswer).intersection(set(splitedEnterdAnswer)):
            partial = True
    return score, {'partial_answer': partial}



def validate_feedbackform_response(self, data):
    if self.request.user.student:
        if 'student' in data and data['student'] and not str(data['student']) == str(self.request.user.student_id):
            raise ValidationError("Student not matching")
    if self.request.user.staff:
        if 'staff' in data and data['staff'] and not str(data['staff']) == str(self.request.user.staff_id):
            raise ValidationError("Staff not matching")
    """ check for answered questions """
    response_obj = FeedBackFormResponse.objects.filter(
        is_active=True, form=data['form'], responder_user=self.request.user)
    response_d = response_obj.values()
    if len(response_d) > 0 and response_d[0]['is_submitted']:
        raise ValidationError('Response Already submitted')
    student_attended_questions = list(response_obj.values_list(
        'feedbackform_choice_answer_response__question', flat=True))
    if 'id' in data and data['id']:
        response_obj = response_obj.exclude(id=data['id'])
    response_obj = response_obj.values(
        'feedbackform_choice_answer_response__question'
    )
    temp = FeedBackForm.objects.get(id=data['form'])
    global formData
    formData = FeedBackFormReadSerializer(temp).data
    if len(response_obj) > 0:
        raise ValidationError('User already submitted the response')
    if not formData['is_finalized']:
        raise ValidationError('Form is not yet published')
    now = datetime.now()
    startDate = datetime.strptime(formData['start_date'], '%Y-%m-%dT%H:%M:%S')
    endDate = datetime.strptime(
        formData['end_date'], '%Y-%m-%dT%H:%M:%S') + timedelta(minutes=1)
    # if not (startDate <= now <= endDate):
    #     raise ValidationError(
    #         f'Todays date is not in range( {startDate} - {datetime.strptime(formData["end_date"], "%Y-%m-%dT%H:%M:%S")} )')
    global questionMapping
    questionMapping = {e['id']: e for e in formData['question_form']}
    for responseData in data['response_data']:
        if str(responseData['question']) in student_attended_questions:
            raise ValidationError('Question already attended by user')
        if responseData['question'] not in questionMapping:
            raise ValidationError('Given Question is not there in the form')
        validateFunction = feedbackform_question_type_handler_function(
            questionMapping[responseData['question']]['question_type'], 'validateResponse')
        validateFunction(self, responseData)


def validate_multiple_choice_feedbackform_response(self, data):
    choiceMapping = {}
    for question in formData['question_form']:
        if str(data['question']) == str(question['id']):
            for choice in question['choice_question']:
                choiceMapping[choice['id']] = choice
    if 'choices' not in data:
        raise ValidationError('Choices is mandatory')
    if len(data['choices']) > 1:
        raise ValidationError('Multiple choices are not allowed')
    if  len(data['choices']) > 1 and data['choices'][0] not in choiceMapping:
        raise ValidationError('Invalid choice Data')


def validate_checkbox_feedbackform_response(self, data):
    choiceMapping = {}
    for question in formData['question_form']:
        if str(data['question']) == str(question['id']):
            for choice in question['choice_question']:
                choiceMapping[choice['id']] = choice
    for choiceId in data['choices']:
        if choiceId not in choiceMapping:
            raise ValidationError('Choice not found in question')


def validate_oneword_feedbackform_response(self, data):
    if 'choices' in data and len(data['choices']) > 0:
        raise ValidationError(
            'Choices should not be given when one word is given')


""" extra data
    {
        "match_the_following": {
            "1": "2",
            "3": "4"
        }
    }
"""



def get_feedbackform_response_data(self, request):
    if not request.GET.get('form'):
        raise ValidationError('academic_year and form is mandatory')
    feedbackform_obj = FeedBackForm.objects.get(id=request.GET.get('form'))
    academicYear = feedbackform_obj.academic_year
    is_for_staff = feedbackform_obj.is_for_staff
    responseData = SharedService.read_data(self, request)
    isAllEvaluated = True
    data, count, next_page, previous_page = SharedService.custom_pagination(self, responseData['data'],
                                                                            self.request.GET.get(
                                                                                'limit'),
                                                                            self.request.GET.get(
                                                                                'pageno')
                                                                            )
    formIds = set()
    studentIds = set()
    if not is_for_staff:
        for d in data:
            print(d,'jiii')
            formIds.add(d['form'])
            studentIds.add(d['student_id'])
            d['number_of_attended_questions'] = len(d['choice_answer_response'])
            for c in d['choice_answer_response']:
                if 'score_obtained' not in d:
                    d['score_obtained'] = 0
                d['score_obtained'] += c['points']
        queryset = FeedBackForm.objects.filter(id__in=formIds)
        formData = FeedBackFormReadSerializer(queryset, many=True).data
        formDetails = {}
        studentsectionmapping = Enrollment.objects.filter(student__in=studentIds, standard_section__academic_year=academicYear).values(
            'standard_section', 'student_id', 'standard_section__section__name'
        )
        studentsectionmapping = {x['student_id']: x for x in studentsectionmapping}
        for f in formData:
            temp = {}
            temp['number_of_questions'] = len(f['question_form'])
            temp['total_score'] = 0
            if f['id'] not in formDetails:
                formDetails[f['id']] = temp
        for d in data:
            if d['form'] in formDetails:
                d.update(formDetails[d['form']])
            if d['student_id'] in studentsectionmapping:
                d['section_details'] = studentsectionmapping[d['student_id']]
    return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data, 'is_allevaluated': isAllEvaluated}}


def evaluate_feedbackform_marks(self, request):
    postData = request.data
    if self.request.GET.get('response'):
        raise ValidationError('response is mandatory to validate')
    if not self.request.user.is_staff:
        raise ValidationError('Only staff can validate')
    queryset = FeedBackFormResponse.objects.get(is_active=True, id=self.kwargs['pk'])
    responseData = FeedBackFormResponseReadSerializer(queryset).data
    if responseData['is_evaluated']:
        raise ValidationError('Already evaluated')
    alternateTeacherIdsWithEvalPerm = []
    choiceAnswerIds = {}
    for r in responseData['form']['alternate_teacher_mapping_form']:
        if r['evaluate']:
            alternateTeacherIdsWithEvalPerm.append(r['staff'])
    for c in responseData['choice_answer_response']:
        choiceAnswerIds[c['id']] = c
    for p in postData['choice_answer_data']:
        if p['id'] not in choiceAnswerIds:
            raise ValidationError(
                'Given choice not exist in the given response')
        if choiceAnswerIds[p['id']]['points'] != p['points']:
            p['evaluated_by'] = self.request.user.id
    if self.request.user.staff.id not in alternateTeacherIdsWithEvalPerm and self.request.user.id != responseData['form']['creater']:
        raise ValidationError('You dont have permission to evaluate')
    for p in postData['choice_answer_data']:
        self.serializer_class = FeedBackFormChoiceAnswerSeriaizer
        SharedService.update_data(
            self, p, **{'partial': True, 'customObject': choice_answer_object})
    if 'is_evaluated' in postData and postData['is_evaluated']:
        FeedBackFormResponse.objects.filter(is_active=True, id=self.kwargs['pk']).update(
            is_evaluated=postData['is_evaluated'], evaluated_by=self.request.user.id)
    return {'Reason': 'Data updated Successfully'}


def evaluate_all_student_feedbackform_marks(self, request):
    postData = request.data
    queryset = FeedBackFormResponse.objects.filter(
        is_active=True, form=postData['form'], is_evaluated=False, is_submitted=True)
    responseData = FeedBackFormResponseReadSerializer(queryset, many=True).data
    if not queryset:
        raise ValidationError('No data to evaluate')
    for r in responseData:
        r['evaluated_by'] = self.request.user.id
        r['is_evaluated'] = True
        instance = FeedBackFormResponse.objects.get(id=r['id'])
        serializer = self.get_serializer(
            instance=instance, data=r, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
    return {'Reason': 'Data uploaded successfully'}


def feedbackform_response_summary(self, request):
    data = SharedService.read_data(self)['data']
    resultData = {
        'total_students': 0,
        'students_attended': 0,
        'total_questions': 0,
        'total_points': 0,
        'total_evaluated': 0,
        'pending_evaluation': 0,
        'quiz_title': data['title'],
        'description': data['description'],
        'start_date': data['start_date'],
        'end_date': data['end_date'],
        'rank_wise_list': []
    }
    resultData['total_students'] = len(data['student_form_mapping_form'])
    resultData['total_questions'] = len(data['question_form'])
    for question in data['question_form']:
        resultData['total_points'] += question['score']
    resultData['students_attended'] = len(data['response_form'])
    for response in data['response_form']:
        if response['is_evaluated']:
            resultData['total_evaluated'] += 1
        elif response['is_submitted']:
            resultData['pending_evaluation'] += 1
        studentMarkWiseMapping = {
            "student_first_name": response['student_first_name'] if 'student_first_name' in response else '',
            "student_middle_name": response['student_middle_name'] if 'student_first_name' in response else '',
            "student_last_name": response['student_last_name'] if 'student_last_name' in response else '',
            "total_score": 0
        }
        for choiceAnswer in response['choice_answer_response']:
            studentMarkWiseMapping['total_score'] += choiceAnswer['points']
        resultData['rank_wise_list'].append(studentMarkWiseMapping)
    resultData['rank_wise_list'] = sorted(
        resultData['rank_wise_list'], key=lambda d: d['total_score'], reverse=True)

    return {'data': resultData}


def feedbackform_response_summary_for_staff(self, request):
    if not self.request.GET.get('academic_year'):
        raise ValidationError('academic_year is mandatory')
    queryset = self.filter_queryset(self.get_queryset()).filter(feedbackform_response_form__is_evaluated=True, is_finalized=True).distinct()
    responseData = FeedBackFormReadWithResponseForSummarySerializer(
        queryset, many=True).data
    tempStudentScoreDetails = {}
    for response in responseData:
        totalPointsConducted = 0
        for q in response['question_form']:
            totalPointsConducted += q['score']
        for r in response['response_form']:
            if r['student'] not in tempStudentScoreDetails:
                tempStudentScoreDetails[r['student']] = {
                    'student_first_name': r['student_first_name'], 'student_middle_name': r['student_middle_name'],
                    'student_last_name': r['student_last_name'], 'total_points_earned': 0, 'total_points_conducted_for': totalPointsConducted,
                    'total_attended_quiz': 0, 'total_percentage': 0, 'student': r['student']
                }
                standardData = Enrollment.get_student_standard_for_academic(
                    self, response['academic_year'], r['student'], True)
                tempStudentScoreDetails[r['student']
                                        ]['standard'] = standardData['standard_section__standard']
                tempStudentScoreDetails[r['student']
                                        ]['standard_section'] = standardData['standard_section']
                tempStudentScoreDetails[r['student']
                                        ]['standard_name'] = standardData['standard_section__standard__name']
                tempStudentScoreDetails[r['student']
                                        ]['section_name'] = standardData['standard_section__section__name']
            if r['is_submitted']:
                tempStudentScoreDetails[r['student']
                                        ]['total_attended_quiz'] += 1
            tempStudentScoreDetails[r['student']
                                    ]['total_points_conducted_for'] += totalPointsConducted
            if 'choice_answer_response' in r:
                for choiceAnswer in r['choice_answer_response']:
                    tempStudentScoreDetails[r['student']
                                            ]['total_points_earned'] += choiceAnswer['points']
            tempStudentScoreDetails[r['student']
                                    ]['total_percentage'] = 0
            if tempStudentScoreDetails[r['student']]['total_points_conducted_for']:
                tempStudentScoreDetails[r['student']
                                        ]['total_percentage'] = (tempStudentScoreDetails[r['student']
                                                                                     ]['total_points_earned'] / tempStudentScoreDetails[r['student']
                                                                                                                                        ]['total_points_conducted_for']) * 100
    # finding rank
    rankData = sorted(
        tempStudentScoreDetails.values(), key=lambda d: d['total_percentage'], reverse=True)
    studentSection = None
    studentSectionMapping = {}
    for idx, rank in enumerate(rankData):
        rankData[idx]['student_standard_rank'] = idx + 1
        studentSection = rank['standard_section']
        if studentSection not in studentSectionMapping:
            studentSectionMapping[studentSection] = []
            rankData[idx]['student_section_rank'] = 1
        else:
            rankData[idx]['student_section_rank'] = len(studentSectionMapping[studentSection]) + 1
        studentSectionMapping[studentSection].append(rank['student'])
    data, count, next_page, previous_page = SharedService.custom_pagination(self, rankData,
                                                                            self.request.GET.get(
                                                                                'limit'),
                                                                            self.request.GET.get(
                                                                                'pageno')
                                                                            )
    return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}}


def feedbackform_response_summary_for_student(self, request, studentId):
    if not self.request.GET.get('academic_year'):
        raise ValidationError('academic_year is mandatory')
    queryset = self.filter_queryset(self.get_queryset()).filter(
        feedbackform_response_form__is_evaluated=True, is_finalized=True).distinct()
    responseData = FeedBackFormReadWithResponseForSummarySerializer(
        queryset, many=True).data
    tempStudentScoreDetails = {}
    tempStudentScoreDetailsMonthWise = {}
    print(responseData,'responseeeeeee')
    for response in responseData:
        print(response,'responsehijdjo')
        totalPointsConducted = 0
        for q in response['question_form']:
            totalPointsConducted += q['score']
        for r in response['response_form']:
            month = datetime.strptime(datetime.strftime(
                r['form_end_date'], "%Y-%m-%d %H:%M:%S"), "%Y-%m-%d %H:%M:%S").month
            monthName = datetime.strptime(str(month), '%m').strftime("%B")
            if r['student'] not in tempStudentScoreDetails:
                tempStudentScoreDetails[r['student']] = {
                    'student_first_name': r['student_first_name'], 'student_middle_name': r['student_middle_name'],
                    'student_last_name': r['student_last_name'], 'total_points_earned': 0, 'total_points_conducted_for': totalPointsConducted,
                    'total_attended_quiz': 0, 'total_percentage': 0, 'student': r['student']
                }
                standardData = Enrollment.get_student_standard_for_academic(
                    self, response['academic_year'], r['student'], True)
                tempStudentScoreDetails[r['student']
                                        ]['standard'] = standardData['standard_section__standard']
                tempStudentScoreDetails[r['student']
                                        ]['standard_section'] = standardData['standard_section']
                tempStudentScoreDetails[r['student']
                                        ]['standard_name'] = standardData['standard_section__standard__name']
                tempStudentScoreDetails[r['student']
                                        ]['section_name'] = standardData['standard_section__section__name']
            if r['is_submitted']:
                tempStudentScoreDetails[r['student']
                                        ]['total_attended_quiz'] += 1
            tempStudentScoreDetails[r['student']
                                    ]['total_points_conducted_for'] += totalPointsConducted
            if 'choice_answer_response' in r:
                for choiceAnswer in r['choice_answer_response']:
                    tempStudentScoreDetails[r['student']
                                            ]['total_points_earned'] += choiceAnswer['points']
            tempStudentScoreDetails[r['student']
                                    ]['total_percentage'] = (tempStudentScoreDetails[r['student']
                                                                                     ]['total_points_earned'] / tempStudentScoreDetails[r['student']
                                                                                                                                        ]['total_points_conducted_for']) * 100
            # below line to check the month wise report
            if studentId == r['student']:
                if r['student'] not in tempStudentScoreDetailsMonthWise:
                    tempStudentScoreDetailsMonthWise[r['student']] = {
                        'student_first_name': r['student_first_name'], 'student_middle_name': r['student_middle_name'],
                        'student_last_name': r['student_last_name'],
                        'month_wise_list': {}
                    }
                if month not in tempStudentScoreDetailsMonthWise[r['student']]['month_wise_list']:
                    tempStudentScoreDetailsMonthWise[r['student']]['month_wise_list'][month] = {
                        'month_name': monthName, 'total_points_earned': 0, 'total_points_conducted_for': totalPointsConducted
                    }
                tempStudentScoreDetailsMonthWise[r['student']
                                                 ]['month_wise_list'][month]['total_points_conducted_for'] += totalPointsConducted
                for choiceAnswer in r['choice_answer_response']:
                    tempStudentScoreDetailsMonthWise[r['student']
                                                     ]['month_wise_list'][month]['total_points_earned'] += choiceAnswer['points']
    resultData = {'month_list': [], 'percentage_list': []}
    if studentId in tempStudentScoreDetailsMonthWise:
        for m in tempStudentScoreDetailsMonthWise[studentId]['month_wise_list']:
            value = tempStudentScoreDetailsMonthWise[studentId]['month_wise_list'][m]
            percentage = (value['total_points_earned'] /
                          value['total_points_conducted_for']) * 100
            resultData['month_list'].append(value['month_name'])
            resultData['percentage_list'].append(percentage)
    if studentId in tempStudentScoreDetails:
        resultData['student'] = studentId
        resultData['total_percentage'] = (tempStudentScoreDetails[studentId]['total_points_earned'] /
                                          tempStudentScoreDetails[studentId]['total_points_conducted_for']) * 100
        resultData.update(tempStudentScoreDetails[studentId])
    quizData = FeedBackForm.objects.filter(student_feedbackform_mapping_form__student=studentId, academic_year=self.request.GET.get('academic_year'), is_finalized=True).values(
        'id', 'feedbackform_response_form', 'feedbackform_response_form__is_submitted', 'end_date', 'feedbackform_response_form__is_evaluated'
    )
    formIds = set()
    resultData['missed_quizes'] = 0
    resultData['need_to_attend_quiz'] = 0
    for f in quizData:
        if (not f['feedbackform_response_form'] or not f['feedbackform_response_form__is_submitted']) and f['end_date'] <= datetime.now():
            resultData['missed_quizes'] += 1
        if (not f['feedbackform_response_form'] and not f['feedbackform_response_form__is_submitted']) and f['end_date'] >= datetime.now():
            resultData['need_to_attend_quiz'] += 1
        formIds.add(f['id'])
    resultData['total_quiz'] = len(formIds)

    # finding rank
    rankData = sorted(
        tempStudentScoreDetails.values(), key=lambda d: d['total_percentage'], reverse=True)
    studentSection = None
    for idx, rank in enumerate(rankData):
        if rank['student'] == studentId:
            resultData['student_standard_rank'] = idx + 1
            studentSection = rank['standard_section']
            break
    rankData = filter(lambda x: x['standard_section']
                      == studentSection, rankData)
    for idx, rank in enumerate(rankData):
        if rank['student'] == studentId:
            resultData['student_section_rank'] = idx + 1
            break
    if 'total_percentage' not in resultData:
        raise ValidationError('Student Not attended any quiz yet')
    return {'data': resultData}

def get_feedbackform_terms_and_condition(self, request):
    formCode = self.kwargs['pk']
    showTermsAndCondtion = True
    termsAndConditions = ''
    responseData = FeedBackFormResponse.objects.filter(form__form_code=formCode, student=request.user.student.id)
    trackingData = FeedBackFormUserResponseTracking.objects.filter(form__form_code=formCode, student=request.user.student.id)
    if responseData or trackingData:
        showTermsAndCondtion = False
    if showTermsAndCondtion:
        termsAndConditions = Institute.objects.first().quiz_instructions
    return {'data': {'terms_and_condition': termsAndConditions, 'show_terms_and_condition': showTermsAndCondtion }}
