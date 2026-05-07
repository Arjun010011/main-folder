import React from 'react';
import { GET_URL, POST_URL, PUT_URL } from 'Includes/urls';

import GatePassManagement from 'Containers/GatePass/GatePassManagement';
import AddGatePass from 'Containers/GatePass/AddGatePass';
import EditGatePass from 'Containers/GatePass/EditGatePass';
import GatePassApproval from 'Containers/GatePass/GatePassApproval';
import GatePassVerify from 'Containers/GatePass/GatePassVerify';

const Actions = {
  gate_pass_list: {
    view: {
      codenames: [GET_URL.gatepass.basename, GET_URL.users.basename, GET_URL.getstandardandsection.basename],
      action_code: 'visible_gate_pass_list_view',
      is_superuser_action: false,
      name: 'View Gate Pass List',
      label: 'Gate Pass',
      action: 'sub-menu',
      url: '/gatepass/list',
      component: <GatePassManagement />,
      permission_needed: true,
      associated_urls: ['/gatepass/add', '/gatepass/edit/:id'],
    },
    name: 'Gate Pass',
    type: 'gatepass',
  },
  gate_pass_add: {
    create: {
      codenames: [POST_URL.gatepass.basename, GET_URL.gatepass.basename, GET_URL.users.basename, GET_URL.getstandardandsection.basename, GET_URL.student.basename, GET_URL.staff.basename],
      action_code: 'visible_gate_pass_add_create',
      is_superuser_action: false,
      name: 'Add Gate Pass',
      label: 'Add Gate Pass',
      action: 'action-url',
      url: '/gatepass/add',
      component: <AddGatePass />,
      permission_needed: true,
    },
    name: 'Add Gate Pass',
    type: 'gatepass',
  },
  gate_pass_approval: {
    view: {
      codenames: [GET_URL.gatepass.basename, PUT_URL.gatepass.basename],
      action_code: 'visible_gate_pass_approval_view',
      is_superuser_action: false,
      name: 'Gate Pass Approval',
      label: 'Gate Pass Approval',
      action: 'sub-menu',
      url: '/gatepass/approval',
      component: <GatePassApproval />,
      permission_needed: true,
    },
    name: 'Gate Pass Approval',
    type: 'gatepass',
  },
  gate_pass_edit: {
    update: {
      codenames: [GET_URL.gatepass.basename, PUT_URL.gatepass.basename],
      action_code: 'visible_gate_pass_edit_update',
      is_superuser_action: false,
      name: 'Edit Gate Pass',
      label: 'Edit Gate Pass',
      action: 'action-url',
      url: '/gatepass/edit/:id',
      component: <EditGatePass />,
      permission_needed: true,
    },
    name: 'Edit Gate Pass',
    type: 'gatepass',
  },
  gate_pass_verify: {
    view: {
      codenames: [GET_URL.gatepassVerify.basename, POST_URL.gatepassVerify.basename],
      action_code: 'visible_gate_pass_verify_view',
      is_superuser_action: false,
      name: 'Gate Pass Verify',
      label: 'Gate Pass Verify',
      action: 'action-url',
      url: '/gatepass/verify',
      component: <GatePassVerify />,
      permission_needed: true,
    },
    name: 'Gate Pass Verify',
    type: 'gatepass',
  },
};

export default Actions;
