import React from 'react';
import { GET_URL, POST_URL, PUT_URL, DEL_URL } from 'Includes/urls';

import FeedBackFormList from 'Containers/FeedBackForm/FeedBackFormList';
import SetFeedBackForm from 'Containers/FeedBackForm/SetFeedBackForm';
import AttendFeedBackForm from 'Containers/FeedBackForm/AttendFeedBackForm';
import EvaluateStudentFeedBackForm from 'Containers/FeedBackForm/EvaluateStudentFeedBackForm';
import AttendIndividualQuestionFeedBackForm from 'Containers/FeedBackForm/components/AttendIndividualQuestionFeedBackForm';
import StudentFeedBackFormViewMarks from 'Containers/FeedBackForm/StudentFeedBackFormViewMarks';
import AttendVideoFeedBackForm from 'Containers/FeedBackForm/components/AttendVideoFeedBackForm';

const Actions = {
    set_feedbackform: {
        view: {
            // codenames: [GET_URL.feedbackformforms.basename, GET_URL.getacademicyear.basename, GET_URL.getstandardandsection.basename,
            // DEL_URL.feedbackformforms.basename, PUT_URL.feedbackformevaluate.basename, GET_URL.feedbackformresponsesummary.basename
            // ],
            action_code: 'visible_set_feedbackform_view',
            is_superuser_action: false,
            name: 'Feed Back Form List',
            label: 'Feed Back Form List',
            action: 'sub-menu',
            url: '/feedbackform/list',
            component: <FeedBackFormList />,
            permission_needed: true,
            associated_urls: ['/feedbackform/add'],
            exclude_roles:[7],
        },
        create: {
            // codenames: [GET_URL.feedbackformforms.basename, POST_URL.feedbackformforms.basename, PUT_URL.feedbackformforms.basename, GET_URL.feedbackformresponse.basename],
            action_code: 'visible_set_feedbackform_add',
            is_superuser_action: false,
            name: 'Create Feed Back Form',
            label: 'Create Feed Back Form',
            action: 'action-url',
            url: '/feedbackform/add',
            component: <SetFeedBackForm />,
            permission_needed: true,
            exclude_roles:[7],
        },
        update: {
            // codenames: [GET_URL.feedbackformforms.basename, POST_URL.feedbackformforms.basename, PUT_URL.feedbackformforms.basename, GET_URL.feedbackformresponse.basename],
            action_code: 'visible_set_feedbackform_change',
            is_superuser_action: false,
            name: 'Edit Feed Back Form',
            label: 'Edit Feed Back Form',
            action: 'action-url',
            url: '/feedbackform/edit',
            component: <SetFeedBackForm />,
            permission_needed: true,
            exclude_roles:[7],
        },
        delete: {
            // codenames: [DEL_URL.feedbackformforms.basename],
            action_code: 'visible_set_feedbackform_delete',
            is_superuser_action: false,
            name: 'Delete',
            label: 'Delete',
            action: 'action',
            permission_needed: true,
            exclude_roles:[7],
        },
        name: 'Set Feed Back Form',
        type: 'feedbackform',
    },
    attend_feedbackform_list: {
        view: {
            // codenames: [GET_URL.getacademicyear.basename, GET_URL.feedbackformforms.basename, POST_URL.feedbackformresponse.basename,
            //      GET_URL.feedbackformresponsesummary.basename],
            action_code: 'visible_attend_feedbackform_list_view',
            is_superuser_action: false,
            name: 'Attend Feed Back Form List',
            label: 'Attend Feed Back Form List',
            action: 'sub-menu',
            url: '/feedbackform/attend/list',
            component: <AttendFeedBackForm />,
            permission_needed: true,
            roles:[7],
        },
        name: 'Attend Feed Back Form List',
        type: 'feedbackform',
    },
    attend_feedbackform: {
        view: {
            // codenames: [GET_URL.feedbackformforms.basename, GET_URL.termsandcondition.basename, POST_URL.feedbackformresponse.basename,],
            action_code: 'visible_attend_feedbackform_view',
            is_superuser_action: false,
            name: 'Attend Feed Back Form',
            label: 'Attend Feed Back Form', 
            action: 'action-url',
            url: '/feedbackform/attend/',
            component: <AttendIndividualQuestionFeedBackForm />,
            permission_needed: false,
        },
        name: 'Attend Feed Back Form',
        type: 'feedbackform',
    },
    attend_video_feedbackform: {
        view: {
            // codenames: [GET_URL.feedbackformforms.basename,GET_URL.termsandcondition.basename, POST_URL.feedbackformresponse.basename,],
            action_code: 'visible_attend_video_feedbackform_view',
            is_superuser_action: false,
            name: 'Attend Video Feed Back Form',
            label: 'Attend Video Feed Back Form',
            action: 'action-url',
            url: '/feedbackform/video/attend/',
            component: <AttendVideoFeedBackForm />,
            permission_needed: false,
        },
        name: 'Attend Feed Back Form',
        type: 'feedbackform',
    },
    evaluate_student_feedbackform: {
        view: {
            // codenames: [GET_URL.feedbackformforms.basename, PUT_URL.feedbackformevaluate.basename],
            action_code: 'visible_evaluate_student_feedbackform_view',
            is_superuser_action: false,
            name: 'Evaluate Student',
            label: 'Evaluate Student',
            action: 'action-url',
            url: '/feedbackform/evaluate/',
            component: <EvaluateStudentFeedBackForm />,
            permission_needed: false,
        },
        name: 'Evaluate Student',
        type: 'feedbackform',
    }, 
    student_feedbackform_view_marks: {
        view: {
            // codenames: [GET_URL.feedbackformforms.basename],
            action_code: 'visible_student_feedbackform_view_marks_view',
            is_superuser_action: false,
            name: 'View Mark Student',
            label: 'View Mark Student',
            action: 'action-url',
            url: '/feedbackform/view/marks',
            component: <StudentFeedBackFormViewMarks />,
            permission_needed: false,
        },
        name: 'Student Feed Back Form View Marks',
        type: 'feedbackform',
    }
}

export default Actions;