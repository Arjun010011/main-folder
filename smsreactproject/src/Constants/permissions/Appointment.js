import React from "react";
import { GET_URL, POST_URL } from "Includes/urls";

import AppointmentList from "Containers/Appointment/AppointmentList";
import AppointmentForm from "Containers/Appointment/Components/AppointmentForm";
import StaffAvailability from "Containers/Appointment/StaffAvailability";
import ViewParentTeacherMeeting from "Containers/Appointment/ViewParentTeacherMeeting";
import AddParentTeacherMeeting from "Containers/Appointment/AddParentTeacherMeeting";

const Actions = {
  // ============================
  // APPOINTMENT LIST
  // ============================
  appointment_list: {
    view: {
      codenames: [
        GET_URL.academicyear.basename,
        GET_URL.appointment.basename,
        POST_URL.appointment.basename,
      ],
      action_code: "visible_appointment_list_view",
      is_superuser_action: false,
      name: "Appointments",
      label: "Appointments",
      action: "sub-menu",
      url: "/appointment",
      component: <AppointmentList />,
      permission_needed: true,
      associated_urls: [
        "/appointment/add",
        "/appointment/detail",
        "/appointment/staff-availability",
      ],
    },
    name: "Appointment",
    type: "appointment",
  },

  // ============================
  // CREATE APPOINTMENT
  // ============================
  appointment_create: {
    create: {
      codenames: [
        POST_URL.appointment.basename,
        GET_URL.staff.basename
      ],
      action_code: "visible_appointment_create_add",
      is_superuser_action: false,
      name: "Schedule Appointment",
      label: "Schedule Appointment",
      action: "action-url",
      url: "/appointment/add",
      component: <AppointmentForm />,
      permission_needed: true,
    },
    name: "Schedule Appointment",
    type: "appointment",
  },

  // ============================
  // STAFF AVAILABILITY ✅
  // ============================
  staff_availability: {
    view: {
      codenames: [
        GET_URL.staff.basename,
        POST_URL.staffavailability.basename,
        GET_URL.staffavailability.basename

      ],
      action_code: "visible_staff_availability_view",
      is_superuser_action: false,
      name: "Staff Availability",
      label: "Staff Availability",
      action: "action-url",
      url: "/appointment/staff-availability",
      component: <StaffAvailability />,
      permission_needed: true,
    },
    name: "Staff Availability",
    type: "appointment",
  },

  parent_teacher_meeting: {
    view: {
      codenames: [
        POST_URL.appointment.basename,
        GET_URL.academicyear.basename,
        GET_URL.appointment.basename

      ],
      action_code: "visible_parent_teacher_meeting_view",
      is_superuser_action: false,
      name: "Parent Teacher Meeting",
      label: "Parent Teacher Meeting",
      action: "sub-menu",
      url: "/appointment/parent-teacher-meeting/view",
      component: <ViewParentTeacherMeeting />,
      permission_needed: true,
    },
    create: {
      codenames: [
        GET_URL.getstandardandsection.basename,
        GET_URL.academicyear.basename,
        POST_URL.appointment.basename
      ],
      action_code: "visible_parent_teacher_meeting_add",
      is_superuser_action: false,
      name: "Parent Teacher Meeting",
      label: "Parent Teacher Meeting",
      action: "action-url",
      url: "/appointment/parent-teacher-meeting/add",
      component: <AddParentTeacherMeeting />,
      permission_needed: true,
    },
    name: "Parent Teacher Meeting",
    type: "appointment",
  },
};

export default Actions;
