const Actions = {
  manual_receipt: {
    create: {
      codenames: [],
      action_code: "visible_manual_receipt_delete",
      is_superuser_action: true,
      name: "Manual Receipt",
      label: "Manual Receipt",
      action: "action",
      permission_needed: true,
    },
    name: "Manual Receipt",
    type: "Super Admin",
  },
};

export default Actions;
