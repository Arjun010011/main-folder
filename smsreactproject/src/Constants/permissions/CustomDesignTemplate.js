import React from "react";
import { GET_URL, POST_URL, PUT_URL, DEL_URL } from "Includes/urls";
import Design from "Components/CustomDesignTemplate/Design";
import MarksCardTemplateDesigner from "Components/CustomDesignTemplate/MarksCardTemplateDesigner";
import DesignPrint from "Components/CustomDesignTemplate/DesignPrint";
import AddSampleJson from "Components/CustomDesignTemplate/AddSampleJson";
import TemplateDesignMap from "Components/CustomDesignTemplate/TemplateDesignMap";

const Actions = {
  custom_design_template: {
    view: {
      action_code: "visible_custom_design_template_view",
      is_superuser_action: false,
      name: "Custom Design Template",
      label: "Custom Design Template",
      action: "sub-menu",
      url: "/custom-design-template",
      component: <Design />,
      permission_needed: true,
      exclude_roles: [7],
    },
    name: "Custom Design Template",
    type: "customdesigntemplate",
    old_code: "custom_design_template",
  },
  custom_design_template_print: {
    view: {
      action_code: "visible_custom_design_template_print_view",
      is_superuser_action: false,
      name: "Custom Design Template",
      label: "Custom Design Template",
      action: "sub-menu",
      url: "/custom-design-template/print",
      component: <DesignPrint />,
      permission_needed: true,
      exclude_roles: [7],
    },
    name: "Custom Design Template Print",
    type: "customdesigntemplate",
    old_code: "custom_design_template_print",
  },
  marks_card_template_designer: {
    view: {
      action_code: "visible_marks_card_template_designer_view",
      is_superuser_action: false,
      name: "Marks Card Template Designer",
      label: "Marks Card Template Designer (API)",
      action: "sub-menu",
      url: "/marks-card-template-designer",
      component: <MarksCardTemplateDesigner />,
      permission_needed: true,
      exclude_roles: [7],
    },
    name: "Marks Card Template Designer",
    type: "customdesigntemplate",
    old_code: "marks_card_template_designer",
  },
  add_sample_json: {
    view: {
      codenames: [GET_URL.template_sample_json?.basename],
      action_code: "visible_add_sample_json_view",
      is_superuser_action: false,
      name: "Add Sample JSON",
      label: "Add Sample JSON",
      action: "sub-menu",
      url: "/custom-design-template/sample-json/add",
      component: <AddSampleJson />,
      permission_needed: true,
      exclude_roles: [7],
    },
    name: "Add Sample JSON",
    type: "customdesigntemplate",
    old_code : "add_sample_json",
  },
  template_design_map: {
    view: {
      codenames: [GET_URL.customdesigntemplatemap?.basename],
      action_code: "visible_template_design_map_view",
      is_superuser_action: false,
      name: "Template Design Map",
      label: "Template Design Map",
      action: "sub-menu",
      url: "/custom-design-template/map",
      component: <TemplateDesignMap/>,
      permission_needed: true,
      exclude_roles: [7],
    },
    name: "Template Design Map",
    type: "customdesigntemplate",
    old_code : "template_design_map",
  },
};

export default Actions;

