import React from 'react';
import { GET_URL, POST_URL, PUT_URL, DEL_URL } from 'Includes/urls';
import ViewMiscellaneousTypes from 'Containers/Miscellaneous/ViewMiscellaneousTypes';
import AddMiscellaneousTypes from 'Containers/Miscellaneous/AddMiscellaneousTypes';
import ViewMiscellaneousPlan from 'Containers/Miscellaneous/ViewMiscellaneousPlan';
import AddMiscellaneousPlan from 'Containers/Miscellaneous/AddMiscellaneousPlan';
import ViewMiscellaneousCollection from 'Containers/Miscellaneous/ViewMiscellaneousCollection';
import ViewMiscellaneousCollectionDetail from 'Containers/Miscellaneous/ViewMiscellaneousCollectionDetail';
import CollectMiscellaneousAmountNew from 'Containers/Miscellaneous/CollectMiscellaneousAmountNew';

const Actions = {
    miscellaneous_type: {
        view: {
            codenames: [GET_URL.misctype.basename],
            action_code: 'visible_miscellaneous_type_view',
            is_superuser_action: false,
            name: 'Miscellaneous Types',
            label: 'Miscellaneous Type',
            action: 'sub-menu',
            url: '/miscellaneous/types/view',
            old_url: '/miscellaneous/types/view',
            component: <ViewMiscellaneousTypes />,
            permission_needed: true,
            exclude_roles:[7],
            associated_urls: ['/miscellaneous/types/add']
        },
        create: {
            codenames: [POST_URL.misctype.basename],
            action_code: 'visible_miscellaneous_type_add',
            is_superuser_action: false,
            name: 'Add Miscellaneous Types',
            label: 'Miscellaneous Type',
            action: 'action-url',
            url: '/miscellaneous/types/add',
            old_url: '/miscellaneous/types/add',
            component: <AddMiscellaneousTypes />,
            permission_needed: true,
            exclude_roles:[7],
        },
        delete: {
            codenames: [DEL_URL.misctype.basename],
            action_code: 'visible_miscellaneous_type_delete',
            is_superuser_action: false,
            name: 'Delete Miscellaneous Types',
            label:  'Delete Miscellaneous Type',
            action: 'action',
            permission_needed: true,
            exclude_roles:[7],

        },
        update: {
            codenames: [PUT_URL.misctype.basename],
            action_code: 'visible_miscellaneous_type_change',
            is_superuser_action: false,
            name: 'Update Miscellaneous Types',
            label: 'Edit Miscellaneous Plan',
            action: 'action',
            permission_needed: true,
            exclude_roles:[7],
        },
        name: 'Miscellaneous Type',
        type: 'Miscellaneous',
        old_code: 'miscellaneous_type'
    },
    miscellaneous_plan: {
        view: {
            codenames: [GET_URL.miscplan.basename],
            action_code: 'visible_miscellaneous_plan_view',
            is_superuser_action: false,
            name: 'Miscellaneous Plan',
            label: 'Miscellaneous Plan',
            action: 'sub-menu',
            url: '/miscellaneous/plan/view',
            old_url: '/miscellaneous/plan/view',
            component: <ViewMiscellaneousPlan />,
            permission_needed: true,
            exclude_roles:[7],
            associated_urls: ['/miscellaneous/plan/add']
        },
        create: {
            codenames: [GET_URL.misctype.basename, POST_URL.miscplan.basename],
            action_code: 'visible_miscellaneous_plan_add',
            is_superuser_action: false,
            name: 'Add Miscellaneous Plan',
            label: 'Miscellaneous Plan',
            action: 'action-url',
            url: '/miscellaneous/plan/add',
            old_url: '/miscellaneous/plan/add',
            component: <AddMiscellaneousPlan />,
            permission_needed: true,
            exclude_roles:[7],
        },
        delete: {
            codenames: [DEL_URL.miscplan.basename],
            action_code: 'visible_miscellaneous_plan_delete',
            is_superuser_action: false,
            name: 'Delete Miscellaneous Plan',
            label: 'Delete Miscellaneous Plan',
            action: 'action',
            permission_needed: true,
            exclude_roles:[7],

        },
        update: {
            codenames: [PUT_URL.miscplan.basename],
            action_code: 'visible_miscellaneous_plan_change',
            is_superuser_action: false,
            name: 'Update Miscellaneous Plan',
            label: 'Delete Miscellaneous Plan',
            action: 'action',
            permission_needed: true,
            exclude_roles:[7],
        },
        name: 'Miscellaneous Plan',
        type: 'Miscellaneous',
        old_code: 'miscellaneous_plan'
    },
    miscellaneous_collection: {
        view: {
            codenames: [GET_URL.getacademicyear.basename, GET_URL.miscplan.basename, GET_URL.misc.basename,],
            action_code: 'visible_miscellaneous_collection_view',
            is_superuser_action: false,
            name: 'Miscellaneous Collection',
            label: 'Miscellaneous Collection',
            action: 'sub-menu',
            url: '/miscellaneous/collection/view',
            old_url: '/miscellaneous/collection/view',
            component: <ViewMiscellaneousCollection />,
            permission_needed: true,
            exclude_roles:[7],
            associated_urls: ['/miscellaneous/collection/add', '/miscellaneous/collection/detail']
        },
        create: {
            codenames: [GET_URL.getacademicyear.basename, GET_URL.miscplan.basename, 
                POST_URL.misc.basename, GET_URL.getmystandard.basename, GET_URL.standard.basename],
            action_code: 'visible_miscellaneous_collection_add',
            is_superuser_action: false,
            name: 'Miscellaneous Collection',
            label: 'Miscellaneous Collection',
            action: 'action-url',
            url: '/miscellaneous/collection/add',
            old_url: '/miscellaneous/collection/add',
            component: <CollectMiscellaneousAmountNew />,
            permission_needed: true,
            exclude_roles:[7],
        },
        name: 'Miscellaneous Collection',
        type: 'Miscellaneous',
        old_code: 'miscellaneous_collection'
    },
    miscellaneous_individual: {
        view: {
            codenames: [GET_URL.misc.basename, GET_URL.miscfeereciept.basename],
            action_code: 'visible_miscellaneous_individual_view',
            is_superuser_action: false,
            name: 'View Miscellaneous',
            label: 'Miscellaneous Collection',
            action: 'action',
            url: '/miscellaneous/collection/detail',
            old_url: '/miscellaneous/collection/detail',
            component: <ViewMiscellaneousCollectionDetail />,
            permission_needed: true,
            exclude_roles:[7],

        },
        name: 'Miscellaneous Individual View',
        type: 'Miscellaneous',
        old_code: 'miscellaneous_individual'
    }
}

export default Actions