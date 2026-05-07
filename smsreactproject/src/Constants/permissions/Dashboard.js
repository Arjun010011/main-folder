import { GET_URL } from "Includes/urls";

const Actions = {
  dashboard_resources: {
    view: {
      codenames: [GET_URL.dashboardnew.basename],
      action_code: "visible_dashboard_resources_view",
      is_superuser_action: false,
      name: "Dashboard Resources",
      label: "Dashboard Resources",
      action: "action",
      permission_needed: true,
      exclude_roles: [7],
    },
    name: "Dashboard Resources",
    type: "dashboard",
  },
};

export default Actions
