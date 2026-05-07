import React from 'react';
import { GET_URL, POST_URL } from 'Includes/urls';
import LessonPlanTemplateList from 'Containers/LessonPlanning/LessonPlanTemplateList';
import LessonPlanning from 'Containers/LessonPlanning/LessonPlanning';
import LessonPlanAllocation from 'Containers/LessonPlanning/LessonPlanAllocation';
import LessonPlanAllocationView from 'Containers/LessonPlanning/LessonPlanAllocationView';
import LessonPlanDashboard from 'Containers/LessonPlanning/LessonPlanDashboard';
import LessonPlanStatus from 'Containers/LessonPlanning/LessonPlanStatus';
import TopicsSubtopicsDatewise from 'Containers/LessonPlanning/TopicsSubtopicsDatewise';
import AILessonPlanUpload from 'Containers/LessonPlanning/AILessonPlanUpload';

const Actions = {
  lesson_plan_dashboard: {
    view: {
      codenames: [
        GET_URL.stafflessonplandashboard.basename,
        GET_URL.getacademicyear.basename,
        GET_URL.updatelessonplanningstatus.basename,
      ],
      action_code: 'visible_lesson_plan_dashboard',
      is_superuser_action: false,
      name: 'Lesson Plan Dashboard',
      label: 'Lesson Plan Dashboard',
      action: 'sub-menu',
      url: '/lesson_plan/lesson-plan-dashboard',
      component: <LessonPlanDashboard />,
      permission_needed: true,
    },
    name: 'Lesson Plan Dashboard',
    type: 'lesson_plan_dashboard',
  },
  lesson_plan_allocation: {
    view: {
      codenames: [
        GET_URL.lessonplantemplate.basename,
        GET_URL.getacademicyear.basename,
        GET_URL.getstandardandsection.basename,
        GET_URL.lessonplantemplateacademicyear.basename,
      ],
      action_code: 'visible_lesson_plan_allocation_view',
      is_superuser_action: false,
      name: 'Lesson Plan Allocation',
      label: 'Lesson Plan Allocation',
      action: 'sub-menu',
      url: '/lesson_plan/lesson-plan-allocation',
      component: <LessonPlanAllocationView />,
      permission_needed: true,
      associated_urls: ['/lesson_plan/lesson-plan-allocation/add', '/lesson_plan/lesson-plan-allocation/edit', '/lesson_plan/lesson-plan-allocation/view'],
    },
    create: {
      codenames: [
        GET_URL.lessonplantemplate.basename,
        GET_URL.getacademicyear.basename,
        GET_URL.subject.basename,
        GET_URL.getstandardandsection.basename,
        POST_URL.lessonplantemplateacademicyear.basename,
      ],
      action_code: 'visible_lesson_plan_allocation_add',
      is_superuser_action: false,
      name: 'Add Lesson Plan Allocation',
      label: 'Add Allocation',
      action: 'action-url',
      url: '/lesson_plan/lesson-plan-allocation/add',
      component: <LessonPlanAllocation />,
      permission_needed: true,
    },
    update: {
      codenames: [
        GET_URL.lessonplantemplate.basename,
        GET_URL.getacademicyear.basename,
        GET_URL.subject.basename,
        GET_URL.getstandardandsection.basename,
        GET_URL.lessonplantemplateacademicyear.basename,
      ],
      action_code: 'visible_lesson_plan_allocation_edit',
      is_superuser_action: false,
      name: 'Edit Lesson Plan Allocation',
      label: 'Edit Allocation',
      action: 'action-url',
      url: '/lesson_plan/lesson-plan-allocation/edit',
      component: <LessonPlanAllocation isEdit />,
      permission_needed: true,
    },
    name: 'Lesson Plan Allocation',
    type: 'lesson_plan_allocation',
  },
  ai_lesson_plan_upload: {
    view: {
      codenames: [
        GET_URL.getacademicyear.basename,
        GET_URL.subject.basename,
        GET_URL.getstandardandsection.basename,
        POST_URL.ailessonplanpreview.basename,
        POST_URL.ailessonplanimport.basename,
      ],
      action_code: 'visible_ai_lesson_plan_upload',
      is_superuser_action: false,
      name: 'AI Book Upload',
      label: 'AI Book Upload',
      action: 'sub-menu',
      url: '/lesson_plan/ai-book-upload',
      component: <AILessonPlanUpload />,
      permission_needed: true,
    },
    name: 'AI Book Upload',
    type: 'lesson_plan_allocation',
  },
  lesson_plan_template: {
    view: {
      codenames: [GET_URL.lessonplantemplate.basename],
      action_code: 'visible_lesson_plan_template_view',
      is_superuser_action: false,
      name: 'Lesson Plan Templates',
      label: 'Lesson Plan Templates',
      action: 'sub-menu',
      url: '/lesson_plan/lesson-plan-templates',
      component: <LessonPlanTemplateList />,
      permission_needed: true,
      associated_urls: ['/lesson_plan/lesson-planning'],
    },
    create: {
      codenames: [
        GET_URL.lessonplantemplate.basename,
        GET_URL.subject.basename,
        GET_URL.getstandard.basename,
        POST_URL.lessonplantemplate.basename,
      ],
      action_code: 'visible_lesson_plan_template_add',
      is_superuser_action: false,
      name: 'Create Lesson Plan Template',
      label: 'Lesson Plan Template',
      action: 'action-url',
      url: '/lesson_plan/lesson-planning',
      component: <LessonPlanning />,
      permission_needed: true,
    },
    name: 'Lesson Planning',
    type: 'lesson_plan',
  },
  lesson_plan_status: {
    view: {
      codenames: [GET_URL.updatelessonplanningstatus.basename],
      action_code: 'visible_lesson_plan_status_view',
      is_superuser_action: false,
      name: "Update Today's Status",
      label: "Update Today's Status",
      action: 'action-url',
      url: '/lesson_plan/lesson-plan-status',
      component: <LessonPlanStatus />,
      permission_needed: true,
      exclude_roles: [7],
      associated_urls: ['/lesson_plan/topics-subtopics-datewise'],
    },
    name: "Update Today's Status",
    type: 'lesson_plan',
  },
  lesson_plan_topics_subtopics_datewise: {
    view: {
      codenames: [GET_URL.lessonplantemplateacademicyear.basename],
      action_code: 'visible_lesson_plan_topics_subtopics_datewise_view',
      is_superuser_action: false,
      name: 'View All Topics and Subtopics Date Wise',
      label: 'View All Topics and Subtopics Date Wise',
      action: 'action-url',
      url: '/lesson_plan/topics-subtopics-datewise',
      component: <TopicsSubtopicsDatewise />,
      permission_needed: true,
      exclude_roles: [7],
    },
    name: 'View All Topics and Subtopics Date Wise',
    type: 'lesson_plan',
  },
};

export default Actions;
