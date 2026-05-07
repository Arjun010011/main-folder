import React from 'react';
import { GET_URL, POST_URL, DEL_URL, PUT_URL } from 'Includes/urls';


import SchoolVisitorList from 'Containers/SchoolVisitors/SchoolVisitorList';
import AddSchoolVisitor from 'Containers/SchoolVisitors/AddSchoolVisitor';
import SchoolIndivisualVisitor from 'Containers/SchoolVisitors/SchoolIndivisualVisitor';
import SchoolVisitorVerify from 'Containers/SchoolVisitors/SchoolVisitorVerify';

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

const Actions = {
    school_visitor: {
        view: {
            codenames: [GET_URL.visitor.basename, GET_URL.reason.basename, GET_URL.buildingdata.basename],
            action_code: 'visible_school_visitor_view',
            is_superuser_action: false,
            name: 'View Visitors',
            label: `${alias_names['school']} Visitors`,
            action: 'sub-menu',
            url: '/school/visitors/list',
            component: <SchoolVisitorList />,
            permission_needed: true,
            exclude_roles:[7],
            associated_urls: ['/school/visitors/add', '/school/visitors/detail/view', '/school/visitor/verify'],
        },
        create: {
            codenames: [POST_URL.visitor.basename],
            action_code: 'visible_school_visitor_add',
            is_superuser_action: false,
            name: 'Add Visitor',
            label: `${alias_names['school']} Visitor`,
            action: 'action-url',
            url: '/school/visitors/add',
            component: <AddSchoolVisitor />,
            permission_needed: true,
            exclude_roles:[7],
        },
        update: {
            codenames: [GET_URL.visitor.basename, POST_URL.visitor.basename],
            action_code: 'visible_school_visitor_change',
            is_superuser_action: false,
            name: 'Update Visitor',
            label: 'Update Visitor',
            action: 'action-url',
            url: '/school/visitors/edit',
            component: <AddSchoolVisitor />,
            permission_needed: true,
            exclude_roles:[7],

        },
        name: `${alias_names['school']} Visitor`,
        type: 'school_visitor',
    },
    school_visitor_individual: {
        view: {
            codenames: [GET_URL.visitor.basename],
            action_code: 'visible_school_visitor_individual_view',
            is_superuser_action: false,
            name: 'View Hostel Visitor',
            label: 'View Hostel Visitor',
            action: 'action',
            url: '/school/visitors/detail/view',
            component: <SchoolIndivisualVisitor />,
            permission_needed: true,
            exclude_roles:[7],

        },
        name: `${alias_names['school']} Visitor Individual`,
        type: 'school_visitor',
    },
    school_visitor_verify: {
        view: {
            codenames: ['view_visitor_verify'],
            action_code: 'visible_school_visitor_verify_view',
            is_superuser_action: false,
            name: 'School Visitor Verify',
            label: `${alias_names['school'] || 'School'} Visitor Verify`,
            action: 'action-url',
            url: '/school/visitor/verify',
            component: <SchoolVisitorVerify />,
            permission_needed: true,
            exclude_roles: [7],
        },
        name: 'School Visitor Verify',
        type: 'school_visitor',
    },
}
export default Actions;