import React from "react";
import { GET_URL, POST_URL, PUT_URL, DEL_URL } from "Includes/urls";

import ReportList from "Containers/Reports/ReportList";
import ReportConfiguration from "Containers/Reports/ReportConfiguration";
import ReportIndividualList from "Containers/Reports/ReportIndividualList";

const Actions = {
  reports: {
    view: {
      codenames: [
        GET_URL.customreportcategory.basename,
        GET_URL.customreportsubcategory.basename,
        GET_URL.customreport.basename,
      ],
      action_code: "visible_reports_view",
      is_superuser_action: false,
      name: "Reports",
      label: "Reports",
      action: "sub-menu",
      url: "/reports/view",
      component: <ReportList />,
      permission_needed: true,
      exclude_roles: [7],
      associated_urls: ["/reports/add"],
    },
    create: {
      codenames: [GET_URL.customreport.basename],
      action_code: "visible_reports_add",
      is_superuser_action: false,
      name: "Create Reports",
      label: "Create Reports",
      action: "action-url",
      url: "/reports/add",
      component: <ReportConfiguration />,
      permission_needed: true,
      exclude_roles: [7],
    },
    update: {
      codenames: [],
      action_code: "visible_reports_change",
      is_superuser_action: false,
      name: "Update Reports",
      label: "Edit",
      action: "action-url",
      url: "/reports/edit",
      component: <ReportConfiguration />,
      permission_needed: true,
      exclude_roles: [7],
    },
    name: "Reports",
    type: "report",
  },
  reports_detail: {
    view: {
      codenames: [
        GET_URL.customreportdownloadedbyuser.basename,
        GET_URL.longprocessingapiresult.basename,
        POST_URL.generatecustomreport.basename
      ],
      action_code: "visible_reports_detail_view",
      is_superuser_action: false,
      name: "Reports",
      label: "Report Details",
      action: "sub-menu",
      url: "/reports/detail/view",
      component: <ReportIndividualList />,
      permission_needed: true,
      exclude_roles: [7],
    },
    name: "Reports Detail",
    type: "report",
  },
  reports_send_notification: {
    create: {
      codenames: [
        GET_URL.language.basename,
        GET_URL.medium.basename,
        POST_URL.generatecustomreport.basename
      ],
      action_code: "visible_reports_send_notification_view",
      is_superuser_action: false,
      name: "Reports",
      label: "Report Details",
      action: "action-url",
      permission_needed: true,
      exclude_roles: [7],
    },
    name: "Reports Detail",
    type: "report",
  },
};

export default Actions;
