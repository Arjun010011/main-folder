import React from "react";

import StaffBioMetricList from "Containers/HrManagement/StaffBioMetricIdList";
import StaffBioMetricIdAdd from "Containers/HrManagement/StaffBioMetricIdAdd";
import { GET_URL, POST_URL, PUT_URL, DEL_URL } from "Includes/urls";
import FailedBiometrickList from "Containers/HrManagement/FailedBiometrickList";

const Actions = {
  staff_bio_id: {
    view: {
      codenames: [GET_URL.machineusermapping.basename, GET_URL.machineattendancelog.basename],
      action_code: "visible_staff_bio_id_view",
      is_superuser_action: false,
      name: "Staff BioMetric Id`s",
      label: " Staff BioMetric Id Id`s ",
      action: "sub-menu",
      url: "/hr/staff/biometricid/list",
      component: <StaffBioMetricList />,
      permission_needed: true,
      exclude_roles: [7],
      associated_urls: ["/hr/staff/biometricid/add"],
    },
    create: {
      codenames: [
        GET_URL.machineusermapping.basename,
        POST_URL.machineusermapping.basename,
      ],
      action_code: "visible_staff_bio_id_add",
      is_superuser_action: false,
      name: "Staff BioMetric Id`s",
      label: "Staff BioMetric Id`s",
      action: "action-url",
      url: "/hr/staff/biometricid/add",
      component: <StaffBioMetricIdAdd />,
      permission_needed: true,
      exclude_roles: [7],
    },
    name: "Staff Biometric Map",
    type: "biometric",
  },
  failed_biometric: {
    view: {
      codenames: [
        GET_URL.faileddatatosave.basename,
        POST_URL.faileddatatosave.basename,
      ],
      action_code: "visible_failed_biometric_view",
      is_superuser_action: false,
      name: "Failed Biometric List",
      label: "Failed Biometric List",
      action: "sub-menu",
      url: "/hr/staff/bio/failed/list",
      component: <FailedBiometrickList />,
      permission_needed: true,
      exclude_roles: [7],
    },
    name: "Failed Biometric List",
    type: "biometric",
  },
};

export default Actions;
