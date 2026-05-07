from django.db import transaction
from django.db.models import Q

from apps.classes.models.enrollment import Enrollment, StudentStandardMapping
from apps.institutes.models.institute import Institute
from apps.quiz.models import Form
from apps.quiz.models.forms import AlternateTeacherMapping, Choice, ChoiceAnswer, MatchTheFollowing, Response, StudentFormMapping, StudentResponseTracking
from apps.students.models.student import Student
from rest_framework.exceptions import ValidationError
from datetime import datetime, timedelta

from apps.shared.services import SharedService
from apps.quiz.models import Question, FormStandardSectionMapping
from apps.classes.models import StandardSectionMapping
from apps.quiz.serializers import (FormSerializer, MatchTheFollowingSerializer, QuestionSerializer, ChoiceSerializer,
                                   FormStandardSectionMappingSerializer, FormReadSerializer, ChoiceAnswerSeriaizer, AlternateTeacherMappingSerializer, ResponseReadForEvaluteSerializer, ResponseReadSerializer, ResponseSerializer,
    FormStandardSectionMappingSerializer, FormReadSerializer, ChoiceAnswerSeriaizer, AlternateTeacherMappingSerializer, ResponseReadSerializer, ResponseSerializer,
                                   FormStandardSectionMappingSerializer, FormReadSerializer, ChoiceAnswerSeriaizer, AlternateTeacherMappingSerializer, ResponseReadSerializer, ResponseSerializer,
                                   StudentFormMappingSerializer, StudentResponseTrackingSerializer, FormReadWithResponseForSummarySerializer)
from apps.tenants.services.middlewares import get_current_db_name
from apps.staffs.services.staff import get_staff_for_academic_year
"""
    when returnSavingFunction false we return the validation function for it.
"""


def question_type_handler_function(questionType, returnFunction='validateFunction'):
    temp = {
        1: {
            'validateFunction': validate_multiple_choice,
            'saveFunction': save_choices_data,
            'validateResponse': validate_multiple_choice_response,
            'calculate_score': calculate_score_multiple_choice
        },
        2: {
            'validateFunction': validate_checkbox,
            'saveFunction': save_choices_data,
            'validateResponse': validate_checkbox_response,
            'calculate_score': calculate_score_checkbox
        },
        3: {
            'validateFunction': validate_oneword,
            'saveFunction': save_choices_data,
            'validateResponse': validate_oneword_response,
            'calculate_score': calculate_score_oneword
        },
        4: {
            'validateFunction': validate_matchfollowing,
            'saveFunction': save_match_following_data,
            'validateResponse': validate_matchfollowing_response,
            'calculate_score': calculate_score_matchfollowing
        }
    }
    if questionType not in temp:
        raise ValidationError('Invalid question type')
    return temp[questionType][returnFunction]


def create_form(self, request):
    data = request.data
    if 'id' in data['form'] and data['form']['id']:
        for questionData in data['form']['questions']:
            questionData['form'] = data['form']['id']
    validate_form(self, data['form'])
    with transaction.atomic(using=get_current_db_name()):
        formId = save_form_data(self, data['form'])
        for formData in data['form']['questions']:
            formData['form'] = formId
        save_question_data(self, data['form']['questions'])
    return {'Reason': 'Data Added Successfully', 'formId': formId}


def delete_form(self, request):
    formCode = self.kwargs['pk']
    if Response.objects.filter(is_active=True, form__form_code=formCode).count() > 0:
        raise ValidationError('Few of the students are submitted the response')
    self.get_queryset().filter(form_code=self.kwargs['pk']).delete()
    questionIds = Question.objects.filter(
        form__form_code=formCode).values_list('id', flat=True)
    delete_question_data(questionIds)
    return {'Reason': 'Data deleted Successfully'}


def read_form_data(self, request):
    queryset = self.filter_queryset(self.get_queryset())
    studentId = None
    if request.GET.get('standard') and request.GET.get('academic_year'):
        queryset = queryset.filter(academic_year=request.GET.get('academic_year'),
                                   form_standard_section_mapping_form__standard_section__standard=request.GET.get('standard')).distinct()
    if self.request.user.is_superuser:
        pass
    elif not self.request.user.is_staff:
        studentId = request.user.student
        if not studentId:
            raise ValidationError('Invalid user type')
        queryset = queryset.filter(
            student_form_mapping_form__student=studentId, is_finalized=True)
    else:
        queryset = queryset.filter(Q(creater=self.request.user.id) | Q(
            alternate_teacher_mapping_form__staff=self.request.user.staff.id))
    self.serializer_class = FormReadSerializer
    serializer = self.get_serializer(queryset, many=True)
    data, count, next_page, previous_page = SharedService.custom_pagination(self, serializer.data,
                                                                            self.request.GET.get(
                                                                                'limit'),
                                                                            self.request.GET.get(
                                                                                'pageno')
                                                                            )
    formIds = [form['id'] for form in data]
    responseData = Response.objects.filter(
        is_active=True, form__in=formIds, student=studentId)
    responseData = ResponseReadSerializer(
        responseData, many=True, read_only=True).data
    formLastSequence = {}
    for r in responseData:
        formLastSequence[r['form']['id']] = {'last_sequence': 0, 'data': r}
        for choiceAns in r['choice_answer_response']:
            formLastSequence[r['form']['id']
                             ]['last_sequence'] = choiceAns['question_sequence']
    for formData in data:
        formData['number_of_questions'] = len(formData['question_form'])
        formData['number_of_students'] = len(
            formData['student_form_mapping_form'])
        formData['number_of_responses'] = len(responseData)
        formData['last_submitted_sequence'] = 0
        formData['response_data'] = {}
        formData['access'] = {
            'update': False, 'view': False, 'evaluate': False
        }
        if formData['creater'] == self.request.user.id:
            formData['access'] = {
                'update': True, 'view': True, 'evaluate': True
            }
        if formData['id'] in formLastSequence:
            formData['last_submitted_sequence'] = formLastSequence[formData['id']
                                                                   ]['last_sequence']
            formData['response_data'] = formLastSequence[formData['id']]['data']
        for f in formData['alternate_teacher_mapping_form']:
            if self.request.user.is_staff and self.request.user.staff and self.request.user.staff.id and self.request.user.staff.id == f['staff']:
                view = f['view']
                if f['evaluate'] or f['update']:
                    view = True
                formData['access'] = {
                    'view': view, 'evaluate': f['evaluate'], 'update': f['update']}
        del(formData['student_form_mapping_form'])
        del(formData['question_form'])
        del(formData['alternate_teacher_mapping_form'])
    return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}}


"""
    For student we send question one by one after the submission of one question we send next question
    If all the answers are attended we will send all the question with answer can be used for response also
"""


def read_form_data_individual(self, request):
    studentId = request.GET.get('student') if (self.request.user.is_staff and request.GET.get(
        'student')) else None  # if staff requesting for student data
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
        if not self.request.user.is_staff or studentId:
            studentId = studentId if studentId else request.user.student.id
            forStudent = False if self.request.user.is_staff else True
            if not studentId:
                raise ValidationError('Invalid user type')
            responseData = Response.objects.filter(
                is_active=True, form__form_code=self.kwargs['pk'], student=studentId)
            responseData = ResponseReadSerializer(
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
            responseTracking = StudentResponseTracking.objects.filter(
                student=studentId, form__form_code=self.kwargs['pk']).values()
            responseTracking = {r['question_id']: r for r in responseTracking}
        self.serializer_class = FormReadSerializer
        response = SharedService.read_data(self)
        formData = response['data']
        showPreviousQuestionData = False
        if formData['is_video_quiz']:
            showPreviousQuestionData = True
        choiceIndexMapping = {}
        formData['total_points'] = 0
        for questionData in formData['question_form']:
            formData['total_points'] += questionData['score']
            if questionData['sequence'] > maxQuestionSeq:
                maxQuestionSeq = questionData['sequence']
            if questionData['question_type'] == 4:  # match the following
                for choiceData in questionData['choice_question']:
                    for idx, temp in enumerate(questionData['choice_question']):
                        choiceIndexMapping[temp['id']] = idx
        if forStudent and maxQuestionSeq == lastSumbittedSequence:
            isStudentFullySubmitted = True
        if request.GET.get('sequence'):
            showSequence = request.GET.get('sequence')
        elif forStudent:
            showSequence = lastSumbittedSequence + 1
        tempQuestionData = []
        currentQuestion = {}
        previousQuestionData = {}
        if not forStudent and not studentId:  # when viewing from teachers view show all student data
            studentIds = []
            for studentData in formData['student_form_mapping_form']:
                studentIds.append(studentData['student'])
            studentsectionmapping = Enrollment.objects.filter(student__in=studentIds, standard_section__academic_year=formData['academic_year']).values(
                'standard_section', 'student', 'standard_section__section__name'
            )
            studentsectionmapping = {x['student']: x for x in studentsectionmapping}
            for index, studentData in enumerate(formData['student_form_mapping_form']):
                if studentData['student'] in studentsectionmapping:
                    formData['student_form_mapping_form'][index]['section_details'] = studentsectionmapping[studentData['student']]
        elif studentId:
            formData['student_details'] = {}
            for studentData in formData['student_form_mapping_form']:
                if str(studentId) == str(studentData['student']):
                    formData['student_details'] = studentData
            del formData['student_form_mapping_form']
        for questionData in formData['question_form']:
            questionData['response'] = {}
            questionData['response_track'] = {}
            if questionData['id'] in responseTracking:
                questionData['response_track'] = responseTracking[questionData['id']]
            if questionData['id'] in questionResponseMapping:
                questionData['response'] = questionResponseMapping[questionData['id']]
            if showPreviousQuestionData and str(int(showSequence)-1) == str(questionData['sequence']):
                previousQuestionData = questionData
            if not isStudentFullySubmitted and forStudent and str(showSequence) != str(questionData['sequence']):
                continue
            if str(showSequence) == str(questionData['sequence']):
                currentQuestion = questionData
            for choiceData in questionData['choice_question']:
                if questionData['question_type'] == 4:  # match the following
                    if choiceData['is_answer']:
                        choiceData['shuffled_match_index'] = choiceIndexMapping[choiceData['shuffled_match']]
                        choiceData['correct_match_index'] = choiceIndexMapping[choiceData['correct_match']]
                # show answer except to student
                if forStudent and not (questionData['show_answer_after_submit'] and len(questionData['response']) > 0):
                    del(choiceData['correct_match'])
                    if 'correct_match_index' in choiceData:
                        del(choiceData['correct_match_index'])
                    if questionData['question_type'] != 4:
                        del(choiceData['is_answer'])
            tempQuestionData.append(questionData)
        if not showSequence:
            formData['question_form'] = tempQuestionData
        if forStudent and showSequence and currentQuestion:
            createTracking = True
        formData['access'] = {
            'update': False, 'view': False, 'evaluate': False
        }
        if formData['creater'] == self.request.user.id:
            formData['access'] = {
                'update': True, 'view': True, 'evaluate': True
            }
        for f in formData['alternate_teacher_mapping_form']:
            if self.request.user.is_staff and self.request.user.staff.id and self.request.user.staff.id == f['staff']:
                view = f['view']
                if f['evaluate'] or f['update']:
                    view = True
                formData['access'] = {
                    'view': view, 'evaluate': f['evaluate'], 'update': f['update']}
        formData['total_question'] = len(formData['question_form'])
        formData['total_attended_question'] = totalAttendedQuestion
        formData['current_question'] = currentQuestion
        formData['previous_question_data'] = previousQuestionData
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
        if createTracking and studentId:
            now = datetime.now()
            payload = {'student': studentId,
                       'form': formData['id'], 'question': currentQuestion['id']}
            queryset = StudentResponseTracking.objects.filter(**payload).values()
            if currentQuestion and currentQuestion['time_limit_to_answer'] and int(currentQuestion['time_limit_to_answer']) > 0:
                # buffer time if takes time to hit the backend
                payload['end_time'] = now + \
                    timedelta(
                        seconds=(int(currentQuestion['time_limit_to_answer'])+5))
            if not queryset:
                self.queryset = StudentResponseTracking
                self.serializer_class = StudentResponseTrackingSerializer
                SharedService.add_data(self, payload, False)
            elif queryset[0]['end_time'] and queryset[0]['end_time'] > now:
                formData['is_already_attended'] = True
    return {'data': formData}


def save_form_data(self, data):
    standardSectionIds = []
    if 'id' not in data or (not data['id']):
        data['form_code'] = SharedService.generate_random_number()
        data['creater'] = self.request.user.id
    if 'standard_section_ids' in data:
        standardSectionIds = data['standard_section_ids']
        del data['standard_section_ids']
    if 'id' in data and data['id']:
        instance = Form.objects.get(id=data['id'])
        serializer = FormSerializer(instance=instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        formId = serializer.data['id']
    else:
        serializer = FormSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        formId = serializer.data['id']
    if standardSectionIds:
        FormStandardSectionMapping.objects.filter(form=formId).exclude(
            standard_section__in=standardSectionIds).delete()
        existinStaSecIds = FormStandardSectionMapping.objects.filter(
            form=formId).values_list('standard_section', flat=True)
        insertableIds = set(standardSectionIds) - (set(existinStaSecIds))
        if len(insertableIds) > 0:
            tempData = []
            for standSecId in insertableIds:
                tempData.append(
                    {'form': formId, 'standard_section': standSecId})
            self.queryset = FormStandardSectionMapping
            self.serializer_class = FormStandardSectionMappingSerializer
            SharedService.add_data(self, tempData)
    addedAlternativeTeachers = []
    if 'alternate_teachers' in data and data['alternate_teachers']:
        teacherIds = [a['staff'] for a in data['alternate_teachers']]
        existingAlternateTeacherdata = {str(a['staff']): a['id'] for a in AlternateTeacherMapping.objects.filter(form=formId,
                                                                                                                 staff__in=teacherIds).values('staff', 'id')}
        alternateData = []
        for aData in data['alternate_teachers']:
            if str(aData['staff']) in existingAlternateTeacherdata:
                aData['id'] = existingAlternateTeacherdata[str(aData['staff'])]
            aData['form'] = formId
            alternateData.append(aData)
        self.queryset = AlternateTeacherMapping
        self.serializer_class = AlternateTeacherMappingSerializer
        for aData in alternateData:
            if 'id' in aData and aData['id']:
                instance = AlternateTeacherMapping.objects.get(id=aData['id'])
                serializer = AlternateTeacherMappingSerializer(
                    instance=instance, data=aData, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
                addedAlternativeTeachers.append(serializer.data['id'])
            else:
                addedAlternativeTeachers.append(
                    SharedService.add_data(self, aData, False)['data']['id'])
    """ Deleting when alternative teachers are not sent """
    AlternateTeacherMapping.objects.filter(form=formId).exclude(
        id__in=addedAlternativeTeachers).delete()
    existingStudentData = {str(a['student']): a['id'] for a in StudentFormMapping.objects.filter(
        form=formId, student__in=data['students']).values('student', 'id')}
    studentdata = []
    for studentId in data['students']:
        temp = {}
        if str(studentId) in existingStudentData:
            temp['id'] = existingStudentData[str(studentId)]
        temp['form'] = formId
        temp['student'] = studentId
        studentdata.append(temp)
    StudentFormMapping.objects.filter(form=formId).exclude(student__in=data['students']).delete()
    self.queryset = StudentFormMapping
    self.serializer_class = StudentFormMappingSerializer
    for sData in studentdata:
        if 'id' in sData and sData['id']:
            instance = StudentFormMapping.objects.get(id=sData['id'])
            serializer = StudentFormMappingSerializer(
                instance=instance, data=sData, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        else:
            SharedService.add_data(self, sData, False)
    return formId


def save_question_data(self, data):
    choiceIds = []
    questionIds = []
    formIds = set()
    for question in data:
        self.queryset = Question
        self.serializer_class = QuestionSerializer
        formIds.add(question['form'])
        if 'id' in question and question['id']:
            instance = Question.objects.get(id=question['id'])
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
        deltableChoices = Choice.objects.filter(question=question['id']).exclude(
            id__in=choiceIds
        ).values_list('id', flat=True)
        if ChoiceAnswer.objects.filter(id__in=list(deltableChoices)).count() > 0:
            raise ValidationError('Some data refered')
        if deltableChoices:
            Choice.objects.filter(id__in=deltableChoices).delete()
        saveChoiceData = question_type_handler_function(
            question['question_type'], 'saveFunction')
        saveChoiceData(self, question['choices'])
    questionIds = Question.objects.filter(
        form__in=formIds).exclude(id__in=questionIds)
    # delete the question which is not mapped to form
    delete_question_data(questionIds)


def delete_question_data(questionIds):
    Question.objects.filter(id__in=questionIds).delete()
    Choice.objects.filter(question__in=questionIds).delete()
    MatchTheFollowing.objects.filter(
        choice__question__id__in=questionIds).delete()


def save_choices_data(self, data):
    self.queryset = Choice
    self.serializer_class = ChoiceSerializer
    for choice in data:
        if 'id' in choice and choice['id']:
            instance = Choice.objects.get(id=choice['id'])
            serializer = self.get_serializer(
                instance=instance, data=choice, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        else:
            SharedService.add_data(self, choice, False)


def save_match_following_data(self, data):
    self.queryset = Choice
    self.serializer_class = ChoiceSerializer
    choiceIds = []
    for choice in data:
        if 'id' in choice and choice['id']:
            instance = Choice.objects.get(id=choice['id'])
            serializer = self.get_serializer(
                instance=instance, data=choice, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        else:
            choice['id'] = SharedService.add_data(
                self, choice, False)['data']['id']
        choiceIds.append(choice['id'])
    matchTheFollowingData = []
    MatchTheFollowing.objects.filter(choice__in=choiceIds).delete()
    for choice in data:
        if not choice['is_answer'] or choice['is_answer'] == 'false':
            continue
        temp = {}
        temp['choice'] = choice['id']
        temp['correct_match'] = data[choice['correct_match_index']]['id']
        temp['shuffled_match'] = data[choice['shuffled_match_index']]['id']
        matchTheFollowingData.append(temp)
    if matchTheFollowingData:
        self.queryset = MatchTheFollowing
        self.serializer_class = MatchTheFollowingSerializer
        SharedService.add_data(self, matchTheFollowingData)
    return {'Reason': 'Data Saved Successfully'}


def validate_form(self, data):
    mandatoryList = ['title', 'questions']
    SharedService.check_mandatory_field_in_list(mandatoryList, data)
    isVideoQuiz = False
    isQuestionAtEnd = False
    if 'is_video_quiz' in data and data['is_video_quiz']:
        isVideoQuiz = True
    if 'is_question_at_end' in data and data['is_question_at_end']:
        isQuestionAtEnd = True
    if 'id' in data and data['id']:
        formData = Form.objects.filter(id=data['id']).values('is_finalized')
        if formData and formData[0]['is_finalized']:
            raise ValidationError('Form is already finalized')
    startDate = data['start_date'] if (
        'start_date' in data and data['start_date']) else None
    endDate = data['end_date'] if (
        'end_date' in data and data['end_date']) else None
    if (not startDate and endDate) or (not endDate and startDate):
        raise ValidationError(
            'Both start date and end date should be provided')
    if startDate and endDate and endDate < startDate:
        raise ValidationError('Endate should be greater than the start date')
    if 'standard_section_ids' in data and ('academic_year' not in data or not data['academic_year']):
        raise ValidationError(
            'Provide academic Year when standard Section ids are given')
    if 'students' not in data or not data['students']:
        raise ValidationError('Students are mandatory')
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
    isTotalTimeSet = True if (
        'total_time' in data and data['total_time']) else False
    validate_question(self, data['questions'], isTotalTimeSet, isVideoQuiz, isQuestionAtEnd)


def validate_question(self, data, isTotalTimeSet=False, isVideoQuiz=False, isQuestionAtEnd=False):
    existingIds = []
    sequenceNumbers = []
    for question in data:
        if 'id' in question and question['id']:
            existingIds.append(question['id'])
        sequenceNumbers.append(question['sequence'])
        if 'time_limit_to_answer' in question and question['time_limit_to_answer'] and isTotalTimeSet:
            raise ValidationError(
                'Both time_limit_to_answer and time limit for question cant be set')
        if isVideoQuiz and not isQuestionAtEnd and ('question_start_time' not in question or not question['question_start_time']):
            raise ValidationError('question time is mandtory for the video quiz')
        if not isVideoQuiz and ('question_start_time' in data and data['question_start_time']):
            raise ValidationError('Question time should be set for video quiz')
    sequenceNumbers.sort()
    if str(sequenceNumbers[0]) != '1':
        raise ValidationError('Invalid sequence')
    for index, sequence in enumerate(sequenceNumbers):
        if str(sequence) != str(index+1):
            raise ValidationError('Sequence is not in order')
    for question in data:
        mandatoryList = ['question_type', 'question']
        SharedService.check_mandatory_field_in_list(mandatoryList, question)
        validationFunction = question_type_handler_function(
            question['question_type'])
        validationFunction(self, question)


def validate_multiple_choice(self, question):
    choiceList = {}
    isAnswerCount = 0
    for choice in question['choices']:
        if 'data' in choice and not choice['data'] and not choice['document']:
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
    if isAnswerCount > 1:
        raise ValidationError('Any of the one option should be answer')
    if isAnswerCount == 0:
        raise ValidationError('Any of the one option should be answer')


def validate_checkbox(self, questionData):
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
    if isAnswerCount == 0:
        raise ValidationError('Any one of the one option should be answer')


def validate_oneword(self, questionData):
    if 'choices' in questionData and len(questionData['choices']) > 1:
        raise ValidationError('Choices should be only one')


def validate_matchfollowing(self, questionData):
    choiceList = {}
    correctMatchDict = {}
    shuffledtMatchDict = {}
    answerIndex = {}
    questionIndex = {}
    for idx, choice in enumerate(questionData['choices']):
        if not choice['is_answer'] or choice['is_answer'] == 'false':
            answerIndex[idx] = ''
            continue
        mandatoryList = ['correct_match_index', 'shuffled_match_index']
        questionIndex[idx] = choice['correct_match_index']
        SharedService.check_mandatory_field_in_list(mandatoryList, choice)
        if choice['data'] in choiceList:
            raise ValidationError(
                f'Duplicate choice data found {choice["data"]}')
        choiceList[choice['data']] = ''
        if choice['correct_match_index'] in correctMatchDict:
            raise ValidationError('Duplicate correct match Index Found')
        if choice['shuffled_match_index'] in shuffledtMatchDict:
            raise ValidationError('Shuffled match Index Found')
        correctMatchDict[choice['correct_match_index']] = ''
        shuffledtMatchDict[choice['shuffled_match_index']] = ''
    if not len(answerIndex.keys()) == len(questionIndex.keys()):
        raise ValidationError('Given questions and answers are not matching')
    for index in questionIndex:
        if questionIndex[index] not in answerIndex:
            raise ValidationError('Question and answer data is not matching')


def choice_answer_object(id):
    return ChoiceAnswer.objects.get(id=id)


def add_response(self, request):
    data = request.data
    if self.request.user.is_staff:
        raise ValidationError('Staff cant attend the quiz')
    validate_response(self, data)
    if 'is_submitted' in data and data['is_submitted']:
            data['submitted_time'] = datetime.now()
    if 'only_submit_data' in data and data['only_submit_data'] and data['id']:
        SharedService.add_or_update_data(self, [data], **{'partial': True})
        check_automatic_evaluation(data['id'])
        return {'Reason': 'Data Added Successfully'}
    with transaction.atomic(using=get_current_db_name()):
        responseId = SharedService.add_or_update_data(
            self, [data], **{'partial': True})['data']['id']
        check_automatic_evaluation(responseId)
        self.queryset = ChoiceAnswer
        self.serializer_class = ChoiceAnswerSeriaizer
        for tempData in data['response_data']:
            tempData['response'] = responseId
            scoreFunction = question_type_handler_function(
                questionMapping[tempData['question']]['question_type'], returnFunction='calculate_score')
            tempData['points'], columnData = scoreFunction(
                questionMapping[tempData['question']], tempData)
            if columnData:
                tempData.update(columnData)
        SharedService.add_or_update_data(
            self, data['response_data'], **{'partial': True, 'customObject': choice_answer_object})
    return {'Reason': 'Data Added Successfully'}

def check_automatic_evaluation(responseId):
    r = Response.objects.filter(id=responseId).values('is_submitted', 'form__is_automatic_evaluation')
    if r[0]['form__is_automatic_evaluation'] and r[0]['is_submitted']:
            r.update(is_evaluated=True)


def calculate_score_multiple_choice(questionMappingData, enteredData):
    questionAnswerMapping = {}
    scoredpoints = 0
    for q in questionMappingData['choice_question']:
        if q['is_answer']:
            questionAnswerMapping[str(q['question'])] = str(q['id'])
            break
    if str(enteredData['question']) in questionAnswerMapping and len(enteredData['choices']) > 0 and str(questionAnswerMapping[str(enteredData['question'])]) == str(enteredData['choices'][0]):
        scoredpoints = questionMappingData['score']
    return scoredpoints, None


def calculate_score_checkbox(questionMappingData, enterdData):
    scoredPoints = 0
    answers = []
    for q in questionMappingData['choice_question']:
        if q['is_answer']:
            answers.append(q['id'])
    if answers == enterdData['choices']:
        scoredPoints = questionMappingData['score']
    return scoredPoints, None


def calculate_score_oneword(questionMappingData, enteredData):
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


def calculate_score_matchfollowing(questionMappingData, enteredData):
    answer = {}
    for q in questionMappingData['choice_question']:
        if q['is_answer']:
            answer[str(q['id'])] = str(q['correct_match'])
    enterdAnswer = enteredData['extra_data']['match_the_following']
    score = questionMappingData['score'] / \
        len(answer.keys()) if questionMappingData['score'] > 0 else 0
    earnedScore = 0
    for eAnswer in enterdAnswer:
        if str(answer[str(eAnswer)]) == str(enterdAnswer[str(eAnswer)]):
            earnedScore += score
    return earnedScore, None


def validate_response(self, data):
    if not data['student'] or not str(data['student']) == str(self.request.user.student_id):
        raise ValidationError("Student not matching")
    """ check for answered questions """
    response_obj = Response.objects.filter(
        is_active=True, form=data['form'], student=data['student'])
    response_d = response_obj.values()
    if len(response_d) > 0 and response_d[0]['is_submitted']:
        raise ValidationError('Response Already submitted')
    student_attended_questions = list(response_obj.values_list(
        'choice_answer_response__question', flat=True))
    if 'id' in data and data['id']:
        response_obj = response_obj.exclude(id=data['id'])
    response_obj = response_obj.values(
        'choice_answer_response__question'
    )
    temp = Form.objects.get(id=data['form'])
    global formData
    formData = FormReadSerializer(temp).data
    if len(response_obj) > 0:
        raise ValidationError('User already submitted the response')
    if not formData['is_finalized']:
        raise ValidationError('Quiz is not yet published')
    now = datetime.now()
    startDate = datetime.strptime(formData['start_date'], '%Y-%m-%dT%H:%M:%S')
    endDate = datetime.strptime(
        formData['end_date'], '%Y-%m-%dT%H:%M:%S') + timedelta(minutes=1)
    if not (startDate <= now <= endDate):
        raise ValidationError(
            f'Todays date is not in range( {startDate} - {datetime.strptime(formData["end_date"], "%Y-%m-%dT%H:%M:%S")} )')
    global questionMapping
    questionMapping = {e['id']: e for e in formData['question_form']}
    for responseData in data['response_data']:
        if str(responseData['question']) in student_attended_questions:
            raise ValidationError('Question already attended by user')
        if responseData['question'] not in questionMapping:
            raise ValidationError('Given Question is not there in the form')
        validateFunction = question_type_handler_function(
            questionMapping[responseData['question']]['question_type'], 'validateResponse')
        validateFunction(self, responseData)


def validate_multiple_choice_response(self, data):
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


def validate_checkbox_response(self, data):
    choiceMapping = {}
    for question in formData['question_form']:
        if str(data['question']) == str(question['id']):
            for choice in question['choice_question']:
                choiceMapping[choice['id']] = choice
    for choiceId in data['choices']:
        if choiceId not in choiceMapping:
            raise ValidationError('Choice not found in question')


def validate_oneword_response(self, data):
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


def validate_matchfollowing_response(self, data):
    left = {}
    right = {}
    for question in formData['question_form']:
        if str(data['question']) == str(question['id']):
            for choice in question['choice_question']:
                if choice['is_answer']:
                    left[str(choice['id'])] = ''
                else:
                    right[choice['id']] = ''
    if 'choices' in data and len(data['choices']) > 0:
        raise ValidationError(
            'Choices should not be given for match the following.')
    if not len(left.keys()) == len(data['extra_data']['match_the_following'].keys()):
        raise ValidationError(
            'All the question of the match following should be answered')
    for leftId in data['extra_data']['match_the_following']:
        rightId = data['extra_data']['match_the_following'][str(leftId)]
        if leftId not in left:
            raise ValidationError('Invalid choice data')
        if rightId not in right and str(rightId) not in right:
            raise ValidationError('Invalid choice Data')


def get_quiz_response_data(self, request):
    if not request.GET.get('form'):
        raise ValidationError('academic_year and form is mandatory')
    academicYear = Form.objects.get(id=request.GET.get('form')).academic_year
    responseData = SharedService.read_data(self, request)
    isAllEvaluated = True
    for res in responseData['data']:
        if not res['is_evaluated']:
            isAllEvaluated = False
    data, count, next_page, previous_page = SharedService.custom_pagination(self, responseData['data'],
                                                                            self.request.GET.get(
                                                                                'limit'),
                                                                            self.request.GET.get(
                                                                                'pageno')
                                                                            )
    formIds = set()
    studentIds = set()
    for d in data:
        formIds.add(d['form'])
        studentIds.add(d['student'])
        d['number_of_attended_questions'] = len(d['choice_answer_response'])
        for c in d['choice_answer_response']:
            if 'score_obtained' not in d:
                d['score_obtained'] = 0
            d['score_obtained'] += c['points']
    queryset = Form.objects.filter(id__in=formIds)
    formData = FormReadSerializer(queryset, many=True).data
    formDetails = {}
    studentsectionmapping = Enrollment.objects.filter(student__in=studentIds, standard_section__academic_year=academicYear).values(
        'standard_section', 'student', 'standard_section__section__name'
    )
    studentsectionmapping = {x['student']: x for x in studentsectionmapping}
    for f in formData:
        temp = {}
        temp['number_of_questions'] = len(f['question_form'])
        temp['total_score'] = 0
        for q in f['question_form']:
            temp['total_score'] += q['score']
        if f['id'] not in formDetails:
            formDetails[f['id']] = temp
    for d in data:
        if d['form'] in formDetails:
            d.update(formDetails[d['form']])
        if d['student'] in studentsectionmapping:
            d['section_details'] = studentsectionmapping[d['student']]
    return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data, 'is_allevaluated': isAllEvaluated}}


def evaluate_marks(self, request):
    postData = request.data
    if self.request.GET.get('response'):
        raise ValidationError('response is mandatory to validate')
    if not self.request.user.is_staff:
        raise ValidationError('Only staff can validate')
    queryset = Response.objects.get(is_active=True, id=self.kwargs['pk'])
    responseData = ResponseReadSerializer(queryset).data
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
        self.serializer_class = ChoiceAnswerSeriaizer
        SharedService.update_data(
            self, p, **{'partial': True, 'customObject': choice_answer_object})
    if 'is_evaluated' in postData and postData['is_evaluated']:
        Response.objects.filter(is_active=True, id=self.kwargs['pk']).update(
            is_evaluated=postData['is_evaluated'], evaluated_by=self.request.user.id)
    return {'Reason': 'Data updated Successfully'}


def evaluate_all_student_marks(self, request):
    postData = request.data
    queryset = Response.objects.filter(
        is_active=True, form=postData['form'], is_evaluated=False, is_submitted=True)
    responseData = ResponseReadSerializer(queryset, many=True).data
    if not queryset:
        raise ValidationError('No data to evaluate')
    for r in responseData:
        r['evaluated_by'] = self.request.user.id
        r['is_evaluated'] = True
        instance = Response.objects.get(id=r['id'])
        serializer = self.get_serializer(
            instance=instance, data=r, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
    return {'Reason': 'Data uploaded successfully'}


def response_summary(self, request):
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


def response_summary_for_staff(self, request):
    if not self.request.GET.get('academic_year'):
        raise ValidationError('academic_year is mandatory')
    queryset = self.filter_queryset(self.get_queryset()).filter(
        response_form__is_evaluated=True, is_finalized=True).distinct()
    responseData = FormReadWithResponseForSummarySerializer(
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


def response_summary_for_student(self, request, studentId):
    if not self.request.GET.get('academic_year'):
        raise ValidationError('academic_year is mandatory')
    queryset = self.filter_queryset(self.get_queryset()).filter(
        response_form__is_evaluated=True, is_finalized=True).distinct()
    responseData = FormReadWithResponseForSummarySerializer(
        queryset, many=True).data
    tempStudentScoreDetails = {}
    tempStudentScoreDetailsMonthWise = {}
    for response in responseData:
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
    quizData = Form.objects.filter(student_form_mapping_form__student=studentId, academic_year=self.request.GET.get('academic_year'), is_finalized=True).values(
        'id', 'response_form', 'response_form__is_submitted', 'end_date', 'response_form__is_evaluated'
    )
    formIds = set()
    resultData['missed_quizes'] = 0
    resultData['need_to_attend_quiz'] = 0
    for f in quizData:
        if (not f['response_form'] or not f['response_form__is_submitted']) and f['end_date'] <= datetime.now():
            resultData['missed_quizes'] += 1
        if (not f['response_form'] and not f['response_form__is_submitted']) and f['end_date'] >= datetime.now():
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

def get_terms_and_condition(self, request):
    formCode = self.kwargs['pk']
    showTermsAndCondtion = True
    termsAndConditions = ''
    responseData = Response.objects.filter(form__form_code=formCode, student=request.user.student.id)
    trackingData = StudentResponseTracking.objects.filter(form__form_code=formCode, student=request.user.student.id)
    if responseData or trackingData:
        showTermsAndCondtion = False
    if showTermsAndCondtion:
        termsAndConditions = Institute.objects.first().quiz_instructions
    return {'data': {'terms_and_condition': termsAndConditions, 'show_terms_and_condition': showTermsAndCondtion }}
