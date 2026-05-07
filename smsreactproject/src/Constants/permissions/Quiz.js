import React from 'react';
import { GET_URL, POST_URL, PUT_URL, DEL_URL } from 'Includes/urls';

import QuizList from 'Containers/Quiz/QuizList';
import SetQuiz from 'Containers/Quiz/SetQuiz';
import AttendQuiz from 'Containers/Quiz/AttendQuiz';
import EvaluateStudentQuiz from 'Containers/Quiz/EvaluateStudentQuiz';
import AttendIndividualQuestion from 'Containers/Quiz/components/AttendIndividualQuestion';
import StudentQuizViewMarks from 'Containers/Quiz/StudentQuizViewMarks';
import AttendVideoQuiz from 'Containers/Quiz/components/AttendVideoQuiz';

const Actions = {
    set_quiz: {
        view: {
            codenames: [GET_URL.forms.basename, GET_URL.getacademicyear.basename, GET_URL.getstandardandsection.basename,
            DEL_URL.forms.basename, PUT_URL.evaluate.basename, GET_URL.responsesummary.basename
            ],
            action_code: 'visible_set_quiz_view',
            is_superuser_action: false,
            name: 'Quiz List',
            label: 'Quiz List',
            action: 'sub-menu',
            url: '/quiz/list',
            component: <QuizList />,
            permission_needed: true,
            associated_urls: ['/quiz/add'],
            exclude_roles:[7],
        },
        create: {
            codenames: [GET_URL.forms.basename, POST_URL.forms.basename, PUT_URL.forms.basename, GET_URL.response.basename],
            action_code: 'visible_set_quiz_add',
            is_superuser_action: false,
            name: 'Create Quiz',
            label: 'Create Quiz',
            action: 'action-url',
            url: '/quiz/add',
            component: <SetQuiz />,
            permission_needed: true,
            exclude_roles:[7],
        },
        update: {
            codenames: [GET_URL.forms.basename, POST_URL.forms.basename, PUT_URL.forms.basename, GET_URL.response.basename],
            action_code: 'visible_set_quiz_change',
            is_superuser_action: false,
            name: 'Edit Quiz',
            label: 'Edit Quiz',
            action: 'action-url',
            url: '/quiz/edit',
            component: <SetQuiz />,
            permission_needed: true,
            exclude_roles:[7],
        },
        delete: {
            codenames: [DEL_URL.forms.basename],
            action_code: 'visible_set_quiz_delete',
            is_superuser_action: false,
            name: 'Delete',
            label: 'Delete',
            action: 'action',
            permission_needed: true,
            exclude_roles:[7],
        },
        name: 'Set Quiz',
        type: 'quiz',
    },
    attend_quiz_list: {
        view: {
            codenames: [GET_URL.getacademicyear.basename, GET_URL.forms.basename, POST_URL.response.basename,
                 GET_URL.responsesummary.basename],
            action_code: 'visible_attend_quiz_list_view',
            is_superuser_action: false,
            name: 'Attend Quiz List',
            label: 'Attend Quiz List',
            action: 'sub-menu',
            url: '/quiz/attend/list',
            component: <AttendQuiz />,
            permission_needed: true,
            roles:[7],
        },
        name: 'Attend Quiz List',
        type: 'quiz',
    },
    attend_quiz: {
        view: {
            codenames: [GET_URL.forms.basename, GET_URL.termsandcondition.basename, POST_URL.response.basename,],
            action_code: 'visible_attend_quiz_view',
            is_superuser_action: false,
            name: 'Attend Quiz',
            label: 'Attend Quiz', 
            action: 'action-url',
            url: '/quiz/attend/',
            component: <AttendIndividualQuestion />,
            permission_needed: false,
        },
        name: 'Attend Quiz',
        type: 'quiz',
    },
    attend_video_quiz: {
        view: {
            codenames: [GET_URL.forms.basename,GET_URL.termsandcondition.basename, POST_URL.response.basename,],
            action_code: 'visible_attend_video_quiz_view',
            is_superuser_action: false,
            name: 'Attend Video Quiz',
            label: 'Attend Video Quiz',
            action: 'action-url',
            url: '/quiz/video/attend/',
            component: <AttendVideoQuiz />,
            permission_needed: false,
        },
        name: 'Attend Quiz',
        type: 'quiz',
    },
    evaluate_student: {
        view: {
            codenames: [GET_URL.forms.basename, PUT_URL.evaluate.basename],
            action_code: 'visible_evaluate_student_view',
            is_superuser_action: false,
            name: 'Evaluate Student',
            label: 'Evaluate Student',
            action: 'action-url',
            url: '/quiz/evaluate/',
            component: <EvaluateStudentQuiz />,
            permission_needed: false,
        },
        name: 'Evaluate Student',
        type: 'quiz',
    }, 
    student_quiz_view_marks: {
        view: {
            codenames: [GET_URL.forms.basename],
            action_code: 'visible_student_quiz_view_marks_view',
            is_superuser_action: false,
            name: 'View Mark Student',
            label: 'View Mark Student',
            action: 'action-url',
            url: '/quiz/view/marks',
            component: <StudentQuizViewMarks />,
            permission_needed: false,
        },
        name: 'Student Quiz View Marks',
        type: 'quiz',
    }
}

export default Actions;