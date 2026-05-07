import React from 'react';
import { GET_URL, POST_URL, DEL_URL } from 'Includes/urls';

import AssignTimetable from 'Containers/timetable/AssignTimetable';
import BulkAssignTimetable from 'Containers/timetable/BulkAssignTimetable';
import AutoGenerateTimetable from 'Containers/timetable/AutoGenerateTimetable';
import PeriodList from 'Containers/timetable/PeriodList';
import AddPeriod from 'Containers/timetable/AddPeriod';
import IndividualPeriodView from 'Containers/timetable/IndividualPeriodView';
import CreateTimeTable from 'Containers/timetable/CreateTimeTable';
import ViewTimeTable from 'Containers/timetable/ViewTimeTable';
import ViewAlternateStaffTimetable from 'Containers/timetable/ViewAlternateStaffTimetable';
import AlternateStaffTimetable from 'Containers/timetable/AlternateStaffTimetable';
import StaffTimeTableList from 'Containers/timetable/StaffTimeTableList';


const Actions = {
    period_plan: {
        view: {
            codenames: [GET_URL.period.basename],
            action_code: 'visible_period_plan_view',
            is_superuser_action: false,
            name: 'View Period',
            label: 'Period Plan',
            action: 'sub-menu',
            url: '/timetable/period/list',
            component: <PeriodList />,
            permission_needed: true,
            associated_urls: ['/timetable/period/add', '/timetable/period/edit', '/timetable/period/view'],
        },
        create: {
            codenames: [POST_URL.period.basename, GET_URL.days.basename],
            action_code: 'visible_period_plan_add',
            is_superuser_action: false,
            name: 'Create Period',
            label: 'Period Plan',
            action: 'action-url',
            url: '/timetable/period/add',
            component: <AddPeriod />,
            permission_needed: true,
        },
        update: {
            codenames: [POST_URL.period.basename],
            action_code: 'visible_period_plan_change',
            is_superuser_action: false,
            name: 'Update Period',
            label: 'Period Plan',
            url: '/timetable/period/edit',
            component: <AddPeriod />,
            action: 'action',
            permission_needed: true,

        },
        delete: {
            codenames: [DEL_URL.period.basename],
            action_code: 'visible_period_plan_delete',
            is_superuser_action: false,
            name: 'Delete Staff List',
            label: 'Edit',
            action: 'action',
            permission_needed: true,

        },
        name: 'Manage Period',
        type: 'timetable',
    },
    period_plan_individual: {
        view: {
            codenames: [GET_URL.period.basename],
            action_code: 'visible_period_plan_individual_view',
            is_superuser_action: false,
            name: 'View Manage Shift Types',
            label: 'Manage Shift Types',
            action: 'action-url',
            url: '/timetable/period/view',
            component: <IndividualPeriodView />,
            permission_needed: true,

        },
        name: 'Period Individual View',
        type: 'timetable',
    },
    assign_timetable: {
        view: {
            codenames: [GET_URL.timetabledaterange.basename],
            action_code: 'visible_assign_timetable_view',
            is_superuser_action: false,
            name: 'Assign TimeTable',
            label: 'TimeTable',
            action: 'sub-menu',
            url: '/time-table/assign-timetable',
            component: <AssignTimetable />,
            permission_needed: true,
            associated_urls: ['/time-table/create/', '/time-table/update', '/time-table/view/', '/time-table/bulk-assign'],
        },
        create: {
            codenames: [GET_URL.days.basename, GET_URL.period.basename, GET_URL.getstaffsubmapping.basename,
            GET_URL.assigntimetable.basename, POST_URL.period.basename, POST_URL.assigntimetable.basename,
            POST_URL.timetabledaterange.basename],
            action_code: 'visible_assign_timetable_add',
            is_superuser_action: false,
            name: 'Create Time Table',
            label: 'Create timetable',
            action: 'action-url',
            url: '/time-table/create/',
            component: <CreateTimeTable />,
            permission_needed: true,
        },
        update: {
            codenames: [GET_URL.days.basename, GET_URL.period.basename, GET_URL.getstaffsubmapping.basename,
            GET_URL.assigntimetable.basename, POST_URL.period.basename, POST_URL.assigntimetable.basename],
            action_code: 'visible_assign_timetable_change',
            is_superuser_action: false,
            name: 'Edit time table',
            label: 'Edit time table',
            action: 'action-url',
            url: '/time-table/update',
            component: <CreateTimeTable />,
            permission_needed: true,
        },
        name: 'Time Table',
        type: 'timetable',

    },
    bulk_assign_timetable: {
        view: {
            codenames: [GET_URL.bulktimetableassignment.basename, POST_URL.bulktimetableassignment.basename, GET_URL.timetabledaterange.basename, GET_URL.period.basename],
            action_code: 'visible_bulk_assign_timetable_view',
            is_superuser_action: false,
            name: 'Bulk Assign TimeTable',
            label: 'Bulk Assign TimeTable',
            action: 'action-url',
            url: '/time-table/bulk-assign',
            component: <BulkAssignTimetable />,
            permission_needed: true,
        },
        name: 'Bulk Assign TimeTable',
        type: 'timetable',
    },
    timetable_view: {
        view: {
            codenames: [GET_URL.days.basename, GET_URL.period.basename, GET_URL.getstaffsubmapping.basename,
            GET_URL.assigntimetable.basename],
            action_code: 'visible_timetable_view_view',
            is_superuser_action: false,
            name: 'View TimeTable',
            label: 'View TimeTable',
            action: 'action-url',
            url: '/time-table/view/',
            component: <ViewTimeTable />,

            permission_needed: true,
        },
        name: 'Timetable Detailed View',
        type: 'timetable'
    },
    alternate_staff_timetable: {
        view: {
            codenames: [GET_URL.getstafffullname.basename,
            GET_URL.timetabledaterange.basename, GET_URL.timetablerequestchange.basename, POST_URL.approvetimetablerequestchange.basename],
            action_code: 'visible_alternate_staff_timetable_view',
            is_superuser_action: false,
            name: 'Alternate Staff Timetable',
            label: 'Alternate Staff Timetable',
            action: 'sub-menu',
            url: '/time-table/alternateStaffTimetable/view',
            component: <ViewAlternateStaffTimetable />,
            permission_needed: true,
            associated_urls: ['/time-table/alternateStaffTimetable/create'],
        },
        create: {
            codenames: [GET_URL.days.basename, GET_URL.timetabledaterange.basename, GET_URL.assigntimetable.basename,
            GET_URL.getstaffsubject.basename, GET_URL.getstafffullname.basename, GET_URL.timetablestaffassigned.basename,
            POST_URL.timetablerequestchange.basename],
            action_code: 'visible_alternate_staff_timetable_add',
            is_superuser_action: false,
            name: 'Alternate Staff Timetable',
            label: 'Alternate Staff Timetable',
            action: 'action-url',
            url: '/time-table/alternateStaffTimetable/create',
            component: <AlternateStaffTimetable />,
            permission_needed: true,
        },
        name: 'Alternate Staff Timetable',
        type: 'timetable',
    },
    auto_generate_timetable: {
        view: {
            codenames: [GET_URL.autogeneratetimetable.basename, GET_URL.timetabledaterange.basename, 
            GET_URL.period.basename, GET_URL.getstandardandsection.basename, POST_URL.autogeneratetimetable.basename,
            POST_URL.applygeneratedtimetable.basename],
            action_code: 'visible_auto_generate_timetable_view',
            is_superuser_action: false,
            name: 'Auto Generate Timetable',
            label: 'Auto Generate Timetable',
            action: 'sub-menu',
            url: '/time-table/auto-generate',
            component: <AutoGenerateTimetable />,
            permission_needed: true,
        },
        name: 'Auto Generate Timetable',
        type: 'timetable'
    },
    staff_timetable_view: {
        view: {
            codenames: [GET_URL.days.basename, GET_URL.period.basename, GET_URL.getstaffsubmapping.basename,
            GET_URL.assigntimetable.basename],
            action_code: 'visible_staff_timetable_view_view',
            is_superuser_action: false,
            name: 'Staff TimeTable',
            label: 'Staff TimeTable',
            action: 'sub-menu',
            url: '/time-table/staff/view/',
            component: <StaffTimeTableList />,

            permission_needed: true,
        },
        name: 'Staff Timetable ',
        type: 'timetable'
    },
}

export default Actions;