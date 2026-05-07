import React from "react";
import { GET_URL, POST_URL, PUT_URL, DEL_URL } from "Includes/urls";

import InterviewSetupList from "Containers/Interview/InterviewSetupList";
import InterviewSetupForm from "Containers/Interview/InterviewSetupForm";
import InterviewSetupView from "Containers/Interview/InterviewSetupView";
import JobApplicationList from "Containers/Interview/JobApplicationList";
import CandidateList from "Containers/Interview/CandidateList";
import CandidateEvaluationPage from "Containers/Interview/CandidateEvaluationPage";
import JobApplicationForm from "Containers/Interview/JobApplicationForm";
import JobRoleList from "Containers/Interview/JobRoleList";
import JobRoleForm from "Containers/Interview/JobRoleForm";

let Actions = {
  job_role_list: {
    view: {
      codenames: [GET_URL.jobrole.basename],
      action_code: "visible_job_role_list_view",
      is_superuser_action: false,
      name: "View Job Roles",
      label: "Job Roles",
      action: "sub-menu",
      url: "/interview/jobrole/list",
      component: <JobRoleList />,
      permission_needed: true,
      associated_urls: [
        "/interview/jobrole/add",
        "/interview/jobrole/edit",
      ],
    },
    create: {
      codenames: [POST_URL.jobrole.basename],
      action_code: "visible_job_role_list_add",
      is_superuser_action: false,
      name: "Create Job Role",
      label: "Add Job Role",
      action: "action-url",
      url: "/interview/jobrole/add",
      component: <JobRoleForm />,
      permission_needed: true,
    },
    update: {
      codenames: [GET_URL.jobrole.basename, PUT_URL.jobrole.basename],
      action_code: "visible_job_role_list_change",
      is_superuser_action: false,
      name: "Update Job Role",
      label: "Edit",
      action: "action-url",
      url: "/interview/jobrole/edit",
      component: <JobRoleForm />,
      permission_needed: true,
    },
    delete: {
      codenames: [DEL_URL.jobrole.basename],
      action_code: "visible_job_role_list_delete",
      is_superuser_action: false,
      name: "Delete Job Role",
      label: "Delete",
      action: "action",
      permission_needed: true,
    },
    name: "Job Roles",
    type: "interview",
  },
  interview_setup_list: {
    view: {
      codenames: [GET_URL.interviewsetup.basename],
      action_code: "visible_interview_setup_list_view",
      is_superuser_action: false,
      name: "View Interview Setup List",
      label: "Interview Setup",
      action: "sub-menu",
      url: "/interview/setup/list",
      component: <InterviewSetupList />,
      permission_needed: true,
      associated_urls: [
        "/interview/setup/add",
        "/interview/setup/edit",
        "/interview/setup/view",
      ],
    },
    create: {
      codenames: [
        GET_URL.jobrole.basename,
        GET_URL.staff.basename,
        POST_URL.interviewsetup.basename,
      ],
      action_code: "visible_interview_setup_list_add",
      is_superuser_action: false,
      name: "Create Interview Setup",
      label: "Interview Setup",
      action: "action-url",
      url: "/interview/setup/add",
      component: <InterviewSetupForm />,
      permission_needed: true,
    },
    update: {
      codenames: [
        GET_URL.jobrole.basename,
        GET_URL.staff.basename,
        GET_URL.interviewsetup.basename,
        PUT_URL.interviewsetup.basename,
      ],
      action_code: "visible_interview_setup_list_change",
      is_superuser_action: false,
      name: "Update Interview Setup",
      label: "Edit",
      action: "action-url",
      url: "/interview/setup/edit",
      component: <InterviewSetupForm />,
      permission_needed: true,
    },
    delete: {
      codenames: [DEL_URL.interviewsetup.basename],
      action_code: "visible_interview_setup_list_delete",
      is_superuser_action: false,
      name: "Delete Interview Setup",
      label: "Delete",
      action: "action",
      permission_needed: true,
    },
    name: "Interview Setup",
    type: "interview",
  },
  interview_setup: {
    view: {
      codenames: [GET_URL.interviewsetup.basename, GET_URL.interviewround.basename],
      action_code: "visible_interview_setup_view",
      is_superuser_action: false,
      name: "View Interview Setup",
      label: "view",
      action: "action-url",
      url: "/interview/setup/view",
      component: <InterviewSetupView />,
      permission_needed: true,
    },
    name: "Interview Setup View",
    type: "interview",
  },
  job_application_list: {
    view: {
      codenames: [GET_URL.jobapplication.basename],
      action_code: "visible_job_application_list_view",
      is_superuser_action: false,
      name: "View Job Application List",
      label: "Job Applications",
      action: "sub-menu",
      url: "/interview/applications/list",
      component: <JobApplicationList />,
      permission_needed: true,
      associated_urls: [
        "/interview/applications/add",
      ],
    },
    create: {
      codenames: [POST_URL.publicjobapplication.basename],
      action_code: "visible_job_application_list_add",
      is_superuser_action: false,
      name: "Create Job Application",
      label: "Add Application",
      action: "action-url",
      url: "/interview/applications/add",
      component: <JobApplicationForm />,
      permission_needed: true,
    },
    name: "Job Applications",
    type: "interview",
  },
  candidate_list: {
    view: {
      codenames: [GET_URL.jobapplication.basename, GET_URL.interviewevaluation.basename],
      action_code: "visible_candidate_list_view",
      is_superuser_action: false,
      name: "View Candidate List",
      label: "Candidates",
      action: "sub-menu",
      url: "/interview/candidates/list",
      component: <CandidateList />,
      permission_needed: true,
      associated_urls: [
        "/interview/candidate/evaluate",
      ],
    },
    name: "Candidates",
    type: "interview",
  },
  candidate_evaluate: {
    view: {
      codenames: [
        GET_URL.jobapplication.basename,
        GET_URL.interviewround.basename,
        GET_URL.interviewevaluation.basename,
        POST_URL.interviewevaluation.basename,
      ],
      action_code: "visible_candidate_evaluate_view",
      is_superuser_action: false,
      name: "Evaluate Candidate",
      label: "Evaluate",
      action: "action-url",
      url: "/interview/candidate/evaluate",
      component: <CandidateEvaluationPage />,
      permission_needed: true,
    },
    name: "Candidate Evaluation",
    type: "interview",
  },
};

export default Actions;
