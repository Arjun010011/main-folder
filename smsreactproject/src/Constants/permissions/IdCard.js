import React from 'react';
import ViewIdCard from 'Containers/IdCard/ViewIdCard';
import ViewIdCardList from 'Containers/IdCard/ViewIdCardList';
import ViewIdCardUpdates from 'Containers/IdCard/ViewIdCardUpdates';

const Actions = {
    idcard: {
        create: {
            codenames: [],
            action_code: 'visible_idcard_add',
            is_superuser_action: false,
            name: 'Id Card',
            label: 'Id Card ',
            action: 'sub-menu',
            url: '/idcard/idcard/create',
            component: <ViewIdCard />,
            associated_urls: [],
            permission_needed: true,
            exclude_roles: [7],

        },
        view: {
            codenames: [],
            action_code: 'visible_idcard_view',
            is_superuser_action: false,
            name: 'View ID Card',
            label: 'View ID Card',
            action: 'sub-menu',
            url: '/idcard/idcard/list',
            component: <ViewIdCardList />,
            permission_needed: true,
            exclude_roles: [7],
        },
        update: {
            codenames: [],
            action_code: 'visible_idcard_change',
            is_superuser_action: false,
            name: 'Update Idcard',
            label: 'Update Idcard',
            action: 'action-url',
            url: '/idcard/idcard/edit/',
            component: <ViewIdCard update={true} />,
            permission_needed: true,
            exclude_roles: [7],

        },
        // delete: {
        //     codenames: [DEL_URL.buildingdata.basename],
        //     action_code: 'visible_hostel_delete',
        //     is_superuser_action: false,
        //     name: 'Delete Hostel Building',
        //     label: 'Delete',
        //     action: 'action',
        //     permission_needed: true,
        //     exclude_roles: [7],
        // },
        name: 'Id Card',
        type: 'idcard',
    },
    idcard_deliver: {
        view: {
            codenames: [],
            action_code: 'visible_idcard_deliver_view',
            is_superuser_action: false,
            name: 'Id Card Deliver',
            label: 'Id Card Deliver',
            action: 'sub-menu',
            url: '/idcard/idcard/deliver',
            component: <ViewIdCardUpdates />,
            permission_needed: true,
            exclude_roles: [7],
        },
        name: 'Id Card Deliver',
        type: 'idcard',
    },
    
}
export default Actions;