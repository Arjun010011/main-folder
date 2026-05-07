import React from 'react';
import { GET_URL, POST_URL, PUT_URL, DEL_URL } from 'Includes/urls';

import BDUList from 'Containers/BDU/BDUList';
import BDUAdd from 'Containers/BDU/BDUAdd';
import BduTableView from 'Components/BDU/BduTableView';

const Actions = {
    bdu_upload: {
        view: {
            codenames: [GET_URL.bdu.basename, GET_URL.bduupload.basename, PUT_URL.bduupload.basename],
            action_code: 'visible_bdu_upload_view',
            is_superuser_action: false,
            name: 'BDU List',
            label: 'BDU List',
            action: 'sub-menu',
            url: '/bdu/bdu/view',
            old_url: '/bdu/bdu/view',
            component: <BDUList />,
            permission_needed: true,
            exclude_roles:[7],
        },
        create: {
            codenames: [GET_URL.model.basename, GET_URL.modelfield.basename, POST_URL.bdu.basename],
            action_code: 'visible_bdu_upload_add',
            is_superuser_action: false,
            name: 'BDU add',
            label: 'Add BDU',
            action: 'action-url',
            url: '/bdu/bdu/add',
            old_url: '/bdu/bdu/add',
            component: <BDUAdd />,
            permission_needed: true,
            exclude_roles:[7],
        },
        update: {
            codenames: [GET_URL.getbdu.basename, PUT_URL.bdu.basename],
            action_code: 'visible_bdu_upload_change',
            is_superuser_action: false,
            name: 'BDU Edit',
            label: 'Edit',
            action: 'action-url',
            url: '/bdu/bdu/edit',
            old_url: '/bdu/bdu/edit',
            component: <BDUAdd />,
            permission_needed: true,
            exclude_roles:[7],
        },
        delete: {
            codenames: [DEL_URL.bdu.basename],
            action_code: 'visible_bdu_upload_delete',
            is_superuser_action: false,
            name: 'Delete BDU',
            label: 'Delete',
            action: 'action',
            permission_needed: true,
            exclude_roles:[7],
        },
        name: 'BDU',
        type: 'bdu',
        old_code: 'bdu_upload'
    },
    bdu_error :{
        update: {
            codenames: [],
            action_code: 'visible_bdu_error_change',
            is_superuser_action: false,
            name: 'bdu error',
            label: 'BDU Error',
            action: 'action',
            url: '/bdu/bdu/error',
            old_url: '/bdu/bdu/error',
            component: <BduTableView />,
            permission_needed: false,
        },
        name: 'BDU Error',
        type: 'bdu',
        old_code: 'bdu_error'
    }
}

export default Actions