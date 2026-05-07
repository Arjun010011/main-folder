import React from "react";

import { GET_URL, POST_URL } from "Includes/urls";
import AssignedSubjectsView from "Containers/Enrolement/AssignSectionSubject/AssignedSubjectsView";
import FastEnrollment from "Containers/Enrolement/FastEnrollment";
import PromoteStudent from "Containers/Enrolement/PromoteStudent";
import ShuffleStudent from "Containers/Enrolement/ShuffleStudent";
import BulkChangeStandard from "Containers/Enrolement/BulkChangeStandard";
import AssignSubjectToStudents from "Containers/Enrolement/AssignSubjectToStudents";
import SubjectAssign from "Containers/Enrolement/SubjectAssign";
import AssignSectionSubjects from "Containers/Enrolement/AssignSectionSubject/AssignSectionSubjects";
import MultiLangSectionSubjects from "Containers/Enrolement/AssignSectionSubject/MultiLangSectionSubjects";
import MoveStudentsToPrevYear from "Containers/Enrolement/MoveStudentsToPrevYear";
import TCStudentList from "Containers/Enrolement/TCStudentList";
import TCCertificateNew from "Containers/Enrolement/TCStudentCertificateNew";

const Actions = {
  assign_subjects: {
    view: {
      codenames: [GET_URL.assignsubject.basename],
      action_code: "visible_assign_subjects_view",
      is_superuser_action: false,
      name: "View Assign Subjects",
      label: "Assign Subjects",
      action: "sub-menu",
      associated_urls: ["/enrollment/assignsubjects/edit"],
      url: "/enrollment/assignsubjects",
      component: <AssignedSubjectsView />,
      permission_needed: true,
      exclude_roles: [7],
    },
    create: {
      codenames: [
        GET_URL.getAssignSubject.basename,
        GET_URL.assignsubject.basename,
        POST_URL.assignsubject.basename,
      ],
      action_code: "visible_assign_subjects_add",
      is_superuser_action: false,
      name: "Assign Subjects",
      label: "Add Subjects",
      action: "action-url",
      url: "/enrollment/assignsubjects/edit",
      component: <AssignSectionSubjects />,
      permission_needed: true,
      exclude_roles: [7],
    },
    delete: {
      codenames: [POST_URL.assignsubject.basename],
      action_code: "visible_assign_subjects_delete",
      is_superuser_action: false,
      name: "Delete Assign Subjects",
      label: "Delete",
      action: "action",
      permission_needed: true,
      exclude_roles: [7],
    },
    name: "Assign Subjects",
    type: "Classes",
  },
  fast_enrollment: {
    create: {
      codenames: [
        GET_URL.getacademicyear.basename,
        GET_URL.getstandard.basename,
        GET_URL.getenrollment.basename,
        GET_URL.getenrolledstudents.basename,
        POST_URL.enrollment.basename,
        GET_URL.getenrollment.basename,
      ],
      action_code: "visible_fast_enrollment_add",
      is_superuser_action: false,
      name: "Enrollment",
      label: "Enrollment",
      action: "sub-menu",
      url: "/enrollment/fastenrollment",
      component: <FastEnrollment />,
      permission_needed: true,
      exclude_roles: [7],
    },
    name: "Enrollment",
    type: "Classes",
  },
  promote_student: {
    create: {
      codenames: [
        GET_URL.getpromotestudent.basename,
        POST_URL.promotestudent.basename,
      ],
      action_code: "visible_promote_student_add",
      is_superuser_action: false,
      name: "Create  Promote Student",
      label: "Promote Student",
      action: "sub-menu",
      url: "/enrollment/promotestudent",
      component: <PromoteStudent />,
      permission_needed: true,
      exclude_roles: [7],
    },
    name: "Promote Student",
    type: "Classes",
  },
  shuffle_student: {
    create: {
      codenames: [
        GET_URL.getsection.basename,
        GET_URL.shuffledstudents.basename,
        POST_URL.shuffledstudents.basename,
      ],
      action_code: "visible_shuffle_student_add",
      is_superuser_action: false,
      name: "Create Shuffle Student",
      url: "/enrollment/shufflestudent",
      label: "Shuffle students",
      action: "sub-menu",
      component: <ShuffleStudent />,
      permission_needed: true,
      exclude_roles: [7],
    },
    name: "Shuffle students",
    type: "Classes",
  },
  change_standard_same_year: {
    create: {
      codenames: [
        GET_URL.getacademicyear.basename,
        GET_URL.getstandardandsection.basename,
        GET_URL.getenrolledstudents.basename,
        GET_URL.bulkchangestandard.basename,
        "view_standardchangelog",
        POST_URL.bulkchangestandard.basename,
      ],
      action_code: "visible_change_standard_same_year_add",
      is_superuser_action: false,
      name: "Change student standard (same academic year)",
      label: "Change standard",
      action: "sub-menu",
      url: "/enrollment/changestandard",
      component: <BulkChangeStandard />,
      permission_needed: true,
      exclude_roles: [7],
    },
    name: "Change standard",
    type: "Classes",
  },
  assign_subjects_for_students: {
    view: {
      codenames: [
        GET_URL.assignsubjectstudent.basename,
        POST_URL.assignsubjectstudent.basename,
        GET_URL.getstandard.basename,
        GET_URL.getsection.basename,
        GET_URL.getenrolledstudents.basename,
      ],
      action_code: "visible_assign_subjects_for_students_view",
      is_superuser_action: false,
      name: "View Subject to students",
      label: "Subject to students",
      action: "sub-menu",
      url: "/enrollment/assignsubjectstostudents",
      component: <AssignSubjectToStudents />,
      permission_needed: true,
      exclude_roles: [7],
    },
    create: {
      codenames: [
        GET_URL.getAssignSubject.basename,
        GET_URL.assignsubject.basename,
        POST_URL.assignsubject.basename,
      ],
      action_code: "visible_assign_subjects_for_students_add",
      is_superuser_action: false,
      name: "Assign Student Subjects",
      label: "Add Student Subjects",
      action: "action-url",
      url: "/enrollment/studentsubjectsassign/",
      component: <SubjectAssign />,
      permission_needed: true,
      exclude_roles: [7],
    },
    name: "Subject to students",
    type: "Classes",
  },
  multi_lang_assign_subjects: {
    create: {
      codenames: [
        GET_URL.getAssignSubject.basename,
        GET_URL.assignsubject.basename,
        POST_URL.assignsubject.basename,
      ],
      action_code: "visible_multi_lang_assign_subjects_add",
      is_superuser_action: false,
      name: "Multiple Assign Subjects",
      label: "Add Multi Subjects",
      action: "action-url",
      url: "/enrollment/multilangassignsubjects/edit",
      component: <MultiLangSectionSubjects />,
      permission_needed: true,
      exclude_roles: [7],
    },
    name: "Multiple Assign Subjects",
    type: "Classes",
  },
  move_student_prev_year: {
    create: {
      codenames: [
        GET_URL.getstandard.basename,
        GET_URL.student.basename,
        POST_URL.movestudenttopreviousyear.basename,
      ],
      action_code: "visible_move_student_prev_year_add",
      is_superuser_action: false,
      name: "Move Students To Previous Year",
      label: "Students To Previous Year",
      action: "sub-menu",
      url: "/enrollment/movestudentsprevyear",
      component: <MoveStudentsToPrevYear />,
      permission_needed: true,
      exclude_roles: [7],
    },
    name: "Move Students To Prev Year",
    type: "Classes",
  },
  tc_student: {
    create: {
      codenames: [
        GET_URL.student.basename,
        GET_URL.getstandard.basename,
        POST_URL.issuetcforstudent.basename,
        GET_URL.deletedstudentlist.basename,
      ],
      action_code: "visible_tc_student_add",
      is_superuser_action: false,
      name: "TC Student",
      label: "TC Student",
      action: "sub-menu",
      url: "/tc/studentlist",
      component: <TCStudentList />,
      permission_needed: true,
      exclude_roles: [7],
    },
    name: "TC Student",
    type: "Classes",
  },
  tc_certificate: {
    view: {
        codenames: [GET_URL.certificate.basename],
        action_code: 'visible_tc_certificate_view',
        is_superuser_action: false,
        name: 'TC Certificate',
        label: 'TC Certificate',
        action: 'action-url',
        url: '/certificate/tccertificate/detail',
        old_url: '/certificate/tccertificate/detail',
        component: <TCCertificateNew />,
        permission_needed: false,
    },
    name: 'TC Certificate',
    type: 'Classes',
},
};

export default Actions;
