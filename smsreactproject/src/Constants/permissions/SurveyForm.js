import React from 'react';
import { GET_URL, POST_URL, PUT_URL, DEL_URL } from 'Includes/urls';
import SurveyFormList from 'Containers/SurveyForm/SurveyFormList';
import SetSurveyForm from 'Containers/SurveyForm/SetSurveyForm';
import AttendSurveyForm from 'Containers/SurveyForm/AttendSurveyForm';
import AttendIndividualQuestionSurveyForm from 'Containers/SurveyForm/components/AttendIndividualQuestionSurveyForm';
import EvaluateStudentSurveyForm from 'Containers/SurveyForm/EvaluateStudentSurveyForm';
import StudentSurveyFormViewMarks from 'Containers/SurveyForm/StudentSurveyFormViewMarks';
import AttendVideoSurveyForm from 'Containers/SurveyForm/components/AttendVideoSurveyForm';

const Actions = {
    set_surveyform: {
        view: {
            // codenames: [GET_URL.surveyformforms.basename, GET_URL.getacademicyear.basename, GET_URL.getstandardandsection.basename,
            // DEL_URL.surveyformforms.basename, PUT_URL.surveyformevaluate.basename, GET_URL.surveyformresponsesummary.basename
            // ],
            action_code: 'visible_set_surveyform_view',
            is_superuser_action: false,
            name: 'Survey Form List',
            label: 'Survey Form List',
            action: 'sub-menu',
            url: '/surveyform/list',
            component: <SurveyFormList />,
            permission_needed: true,
            associated_urls: ['/surveyform/add'],
            exclude_roles:[7],
        },
        create: {
            // codenames: [GET_URL.surveyformforms.basename, POST_URL.surveyformforms.basename, PUT_URL.surveyformforms.basename, GET_URL.surveyformresponse.basename],
            action_code: 'visible_set_surveyform_add',
            is_superuser_action: false,
            name: 'Create Survey Form',
            label: 'Create Survey Form',
            action: 'action-url',
            url: '/surveyform/add',
            component: <SetSurveyForm />,
            permission_needed: true,
            exclude_roles:[7],
        },
        update: {
            // codenames: [GET_URL.surveyformforms.basename, POST_URL.surveyformforms.basename, PUT_URL.surveyformforms.basename, GET_URL.surveyformresponse.basename],
            action_code: 'visible_set_surveyform_change',
            is_superuser_action: false,
            name: 'Edit Survey Form',
            label: 'Edit Survey Form',
            action: 'action-url',
            url: '/surveyform/edit',
            component: <SetSurveyForm />,
            permission_needed: true,
            exclude_roles:[7],
        },
        delete: {
            // codenames: [DEL_URL.surveyformforms.basename],
            action_code: 'visible_set_surveyform_delete',
            is_superuser_action: false,
            name: 'Delete',
            label: 'Delete',
            action: 'action',
            permission_needed: true,
            exclude_roles:[7],
        },
        name: 'Set Survey Form',
        type: 'surveyform',
    },
    attend_surveyform_list: {
        view: {
            // codenames: [GET_URL.getacademicyear.basename, GET_URL.surveyformforms.basename, POST_URL.surveyformresponse.basename,
            //      GET_URL.surveyformresponsesummary.basename],
            action_code: 'visible_attend_surveyform_list_view',
            is_superuser_action: false,
            name: 'Attend Survey Form List',
            label: 'Attend Survey Form List',
            action: 'sub-menu',
            url: '/surveyform/attend/list',
            component: <AttendSurveyForm />,
            permission_needed: true,
            roles:[7],
        },
        name: 'Attend Survey Form List',
        type: 'surveyform',
    },
    attend_surveyform: {
        view: {
            // codenames: [GET_URL.surveyformforms.basename, GET_URL.termsandcondition.basename, POST_URL.surveyformresponse.basename,],
            action_code: 'visible_attend_surveyform_view',
            is_superuser_action: false,
            name: 'Attend Survey Form',
            label: 'Attend Survey Form', 
            action: 'action-url',
            url: '/surveyform/attend/',
            component: <AttendIndividualQuestionSurveyForm />,
            permission_needed: false,
        },
        name: 'Attend Survey Form',
        type: 'surveyform',
    },
    attend_video_surveyform: {
        view: {
            // codenames: [GET_URL.surveyformforms.basename,GET_URL.termsandcondition.basename, POST_URL.surveyformresponse.basename,],
            action_code: 'visible_attend_video_surveyform_view',
            is_superuser_action: false,
            name: 'Attend Video Survey Form',
            label: 'Attend Video Survey Form',
            action: 'action-url',
            url: '/surveyform/video/attend/',
            component: <AttendVideoSurveyForm />,
            permission_needed: false,
        },
        name: 'Attend Survey Form',
        type: 'surveyform',
    },
    evaluate_student_surveyform: {
        view: {
            // codenames: [GET_URL.surveyformforms.basename, PUT_URL.surveyformevaluate.basename],
            action_code: 'visible_evaluate_student_surveyform_view',
            is_superuser_action: false,
            name: 'Evaluate Student',
            label: 'Evaluate Student',
            action: 'action-url',
            url: '/surveyform/evaluate/',
            component: <EvaluateStudentSurveyForm />,
            permission_needed: false,
        },
        name: 'Evaluate Student',
        type: 'surveyform',
    }, 
    student_surveyform_view_marks: {
        view: {
            // codenames: [GET_URL.surveyformforms.basename],
            action_code: 'visible_student_surveyform_view_marks_view',
            is_superuser_action: false,
            name: 'View Mark Student',
            label: 'View Mark Student',
            action: 'action-url',
            url: '/surveyform/view/marks',
            component: <StudentSurveyFormViewMarks />,
            permission_needed: false,
        },
        name: 'Student Survey Form View Marks',
        type: 'surveyform',
    }
}

export default Actions;