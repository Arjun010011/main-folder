import React from 'react';
import { GET_URL, POST_URL, PUT_URL, DEL_URL } from 'Includes/urls';

import AddSalaryComponent from 'Containers/Payroll/AddSalaryComponent';
import ViewSalaryComponent from 'Containers/Payroll/ViewSalaryComponent';
import AddSalaryPlanHelper from 'Containers/Payroll/AddSalaryPlanHelper';
import ViewSalaryPlanHelper from 'Containers/Payroll/ViewSalaryPlanHelper';
import ViewSalaryPlan from 'Containers/Payroll/ViewSalaryPlan';
import ViewSalaryPayment from 'Containers/Payroll/ViewSalaryPayment';
import ViewPayslip from 'Containers/Payroll/ViewPayslip';
import PaySlip from 'Containers/Payroll/PaySlip';
import Payout from 'Containers/Payroll/Payout';
import MyPayslip from 'Containers/Payroll/MyPayslip';
import PayrollDashboard from 'Containers/Payroll/PayrollDashboard';
import ViewSalaryIncrement from 'Containers/Payroll/ViewSalaryIncrement';
import AddSalaryIncrement from 'Containers/Payroll/AddSalaryIncrement';
import ViewSalaryOverride from 'Containers/Payroll/ViewSalaryOverride';
import AddSalaryOverride from 'Containers/Payroll/AddSalaryOverride';
import FormulaRule from 'Containers/Payroll/FormulaRule';
import FormulaList from 'Containers/Payroll/FormulaList';
import AddSalaryFormula from 'Containers/Payroll/AddSalaryFormula';
import AddSalaryPlanTabbed from 'Containers/Payroll/AddSalaryPlanTabbed';
import AddSalaryPaymentTabbed from 'Containers/Payroll/AddSalaryPaymentTabbed';
import AddStaffSalary from 'Containers/Payroll/AddStaffSalary';
import ViewStaffSalary from 'Containers/Payroll/ViewStaffSalary';
import ManualLOP from 'Containers/Payroll/ManualLOP';
import PayrollSummaryTable from 'Containers/Payroll/PayrollSummaryTable';

const Actions = {
    payroll_salarycomponent: {
        view: {
            codenames: [GET_URL.salarycomponent.basename],
            action_code: 'visible_payroll_salarycomponent_view',
            is_superuser_action: false,
            name: 'Salary Component',
            label: 'Salary Component',
            action: 'sub-menu',
            url: '/payroll/salarycomponent/view',
            old_url: '/payroll/salarycomponent/view',
            component: <ViewSalaryComponent />,
            permission_needed: true,
            associated_urls: ['/payroll/salarycomponent/add'],
            exclude_roles: [7],
        },
        update: {
            codenames: [PUT_URL.salarycomponent.basename],
            action_code: 'visible_payroll_salarycomponent_change',
            is_superuser_action: false,
            name: 'Salary Component',
            label: 'Salary Component',
            action: 'action',
            permission_needed: true,
            exclude_roles: [7],
        },
        delete: {
            codenames: [DEL_URL.salarycomponent.basename],
            action_code: 'visible_payroll_salarycomponent_delete',
            is_superuser_action: false,
            name: 'Salary Component',
            label: 'Salary Component',
            action: 'actions',
            permission_needed: true,
            exclude_roles: [7],
        },
        create: {
            codenames: [POST_URL.salarycomponent.basename],
            action_code: 'visible_payroll_salarycomponent_add',
            is_superuser_action: false,
            name: 'Salary Component',
            label: 'Salary Component',
            action: 'action-url',
            url: '/payroll/salarycomponent/add',
            old_url: '/payroll/salarycomponent/add',
            component: <AddSalaryComponent />,
            permission_needed: true,
            exclude_roles: [7],
        },
        name: 'Salary Component',
        type: 'payroll',
        old_code: 'payroll_salarycomponent'
    },

    payroll_salaryplanhelper: {
        view: {
            codenames: [GET_URL.salaryplan.basename],
            action_code: 'visible_payroll_salaryplanhelper_view',
            is_superuser_action: false,
            name: 'Salary Plan Helper',
            label: 'Salary Plan Helper',
            action: 'sub-menu',
            url: '/payroll/salaryplanhelper/view',
            old_url: '/payroll/salaryplanhelper/view',
            component: <ViewSalaryPlanHelper />,
            permission_needed: true,
            associated_urls: ['/payroll/salaryplanhelper/edit'],
            exclude_roles: [7],
        },
        create: {
            codenames: [GET_URL.salarycomponent.basename, GET_URL.salaryplan.basename, POST_URL.salaryplan.basename],
            action_code: 'visible_payroll_salaryplanhelper_add',
            is_superuser_action: false,
            name: 'Salary Plan Helper',
            label: 'Salary Plan Helper',
            action: 'action-url',
            url: '/payroll/salaryplanhelper/edit',
            old_url: '/payroll/salaryplanhelper/edit',
            component: <AddSalaryPlanHelper />,
            permission_needed: true,
            exclude_roles: [7],
        },
        name: 'Salary Plan Helper',
        type: 'payroll',
        old_code: 'payroll_salaryplanhelper'
    },

    payroll_salaryplan: {
        view: {
            codenames: [GET_URL.staff.basename],
            action_code: 'visible_payroll_salaryplan_view',
            is_superuser_action: false,
            name: 'Salary Plan',
            label: 'Salary Plan',
            action: 'sub-menu',
            url: '/payroll/salaryplan/view',
            old_url: '/payroll/salaryplan/view',
            component: <ViewSalaryPlan />,
            permission_needed: true,
            associated_urls: ['/payroll/salaryplan/add'],
            exclude_roles: [7],
        },
        create: {
            codenames: [GET_URL.staffalldetail.basename, GET_URL.salaryplangenerate.basename, GET_URL.salaryemployeeplan.basename, POST_URL.salaryemployeeplan.basename],
            action_code: 'visible_payroll_salaryplan_add',
            is_superuser_action: false,
            name: 'Salary Plan',
            label: 'Salary Plan',
            action: 'action-url',
            url: '/payroll/salaryplan/add',
            old_url: '/payroll/salaryplan/add',
            component: <AddSalaryPlanTabbed />,
            permission_needed: true,
            exclude_roles: [7],
        },
        name: 'Salary Plan',
        type: 'payroll',
        old_code: 'payroll_salaryplan'
    },

    payroll_salarypayment: {
        view: {
            codenames: [GET_URL.staff.basename],
            action_code: 'visible_payroll_salarypayment_view',
            is_superuser_action: false,
            name: 'Salary Payment',
            label: 'Salary Payment',
            action: 'sub-menu',
            url: '/payroll/salarypayment/view',
            old_url: '/payroll/salarypayment/view',
            component: <ViewSalaryPayment />,
            permission_needed: true,
            associated_urls: ['/payroll/salarypayment/add'],
            exclude_roles: [7],
        },
        create: {
            codenames: [GET_URL.staffalldetail.basename, GET_URL.salaryemployeeplan.basename, POST_URL.salaryemployeemonthplan.basename],
            action_code: 'visible_payroll_salarypayment_add',
            is_superuser_action: false,
            name: 'Salary Payment',
            label: 'Salary Payment',
            action: 'action-url',
            url: '/payroll/salarypayment/add',
            old_url: '/payroll/salarypayment/add',
            component: <AddSalaryPaymentTabbed />,
            permission_needed: true,
            exclude_roles: [7],
        },
        name: 'Salary Payment',
        type: 'payroll',
        old_code: 'payroll_salarypayment'
    },

    payroll_payslipstafflist: {
        view: {
            codenames: [GET_URL.staff.basename, GET_URL.salaryemployeemonthplan.basename],
            action_code: 'visible_payroll_payslipstafflist_view',
            is_superuser_action: false,
            name: 'Payslip',
            label: 'Payslip',
            action: 'sub-menu',
            url: '/payroll/payslip/list',
            old_url: '/payroll/payslip/list',
            component: <ViewPayslip />,
            permission_needed: true,
            associated_urls: ['/payroll/payslip/detail'],
            exclude_roles: [7],
        },
        name: 'Payslip staff list',
        type: 'payroll',
        old_code: 'payroll_payslipstafflist'
    },

    payroll_payslip: {
        view: {
            codenames: [GET_URL.payslip.basename, GET_URL.salaryemployeemonthplan.basename],
            action_code: 'visible_payroll_payslip_view',
            is_superuser_action: false,
            name: 'Payslip',
            label: 'Payslip',
            action: 'action-url',
            url: '/payroll/payslip/detail',
            old_url: '/payroll/payslip/detail',
            component: <PaySlip />,
            permission_needed: true,
            exclude_roles: [7],
        },
        name: 'Payslip staff details',
        type: 'payroll',
        old_code: 'payroll_payslip'
    },

    payroll_payout: {
        view: {
            codenames: [GET_URL.salaryemployeeyearplan.basename],
            action_code: 'visible_payroll_payout_view',
            is_superuser_action: false,
            name: 'Payout',
            label: 'Payout',
            action: 'sub-menu',
            url: '/payroll/payout',
            old_url: '/payroll/payout',
            component: <Payout />,
            permission_needed: true,
            exclude_roles: [7],
        },
        name: 'Payout',
        type: 'payroll',
        old_code: 'payroll_payout'
    },

    my_payslp: {
        view: {
            codenames: [GET_URL.payslip.basename, GET_URL.salaryemployeeyearplan.basename],
            action_code: 'visible_my_payslp_view',
            is_superuser_action: false,
            name: 'My Payslip',
            label: 'My Payslip',
            action: 'sub-menu',
            url: '/payroll/mypayslip',
            old_url: '/payroll/mypayslip',
            component: <MyPayslip />,
            permission_needed: true,
            exclude_roles: [7],
        },
        name: 'My Payslip',
        type: 'payroll',
    },

    payroll_dashboard: {
        view: {
            codenames: [GET_URL.payrollDashboard.basename],
            action_code: 'visible_payroll_dashboard_view',
            is_superuser_action: false,
            name: 'Payroll Dashboard',
            label: 'Payroll Dashboard',
            action: 'sub-menu',
            url: '/payroll/dashboard',
            old_url: '/payroll/dashboard',
            component: <PayrollDashboard />,
            permission_needed: true,
            exclude_roles: [7],
        },
        name: 'Payroll Dashboard',
        type: 'payroll',
    },

    payroll_salaryoverride: {
        view: {
            codenames: [GET_URL.staff.basename],
            action_code: 'visible_payroll_salaryoverride_view',
            is_superuser_action: false,
            name: 'Salary Override',
            label: 'Salary Override',
            action: 'sub-menu',
            url: '/payroll/salaryoverride/view',
            old_url: '/payroll/salaryoverride/view',
            component: <ViewSalaryOverride />,
            permission_needed: true,
            associated_urls: ['/payroll/salaryoverride/add'],
            exclude_roles: [7],
        },
        create: {
            codenames: [GET_URL.staffalldetail.basename, GET_URL.salaryemployeemonthplan.basename, POST_URL.salaryemployeemonthplan.basename],
            action_code: 'visible_payroll_salaryoverride_add',
            is_superuser_action: false,
            name: 'Salary Override',
            label: 'Salary Override',
            action: 'action-url',
            url: '/payroll/salaryoverride/add',
            old_url: '/payroll/salaryoverride/add',
            component: <AddSalaryOverride />,
            permission_needed: true,
            exclude_roles: [7],
        },
        name: 'Salary Override',
        type: 'payroll',
        old_code: 'payroll_salaryoverride'
    },

    payroll_salaryincrement: {
        view: {
            codenames: [GET_URL.staff.basename],
            action_code: 'visible_payroll_salaryincrement_view',
            is_superuser_action: false,
            name: 'Salary Increment',
            label: 'Salary Increment',
            action: 'sub-menu',
            url: '/payroll/salaryincrement/view',
            old_url: '/payroll/salaryincrement/view',
            component: <ViewSalaryIncrement />,
            permission_needed: true,
            associated_urls: ['/payroll/salaryincrement/add'],
            exclude_roles: [7],
        },
        create: {
            codenames: [GET_URL.staffalldetail.basename, GET_URL.salaryincrement.basename, POST_URL.salaryincrement.basename],
            action_code: 'visible_payroll_salaryincrement_add',
            is_superuser_action: false,
            name: 'Salary Increment',
            label: 'Salary Increment',
            action: 'action-url',
            url: '/payroll/salaryincrement/add',
            old_url: '/payroll/salaryincrement/add',
            component: <AddSalaryIncrement />,
            permission_needed: true,
            exclude_roles: [7],
        },
        name: 'Salary Increment',
        type: 'payroll',
        old_code: 'payroll_salaryincrement'
    },

    payroll_formularule: {
        view: {
            codenames: [GET_URL.salaryformularule.basename],
            action_code: 'visible_payroll_formularule_view',
            is_superuser_action: false,
            name: 'Formula Rules',
            label: 'Formula Rules',
            action: 'sub-menu',
            url: '/payroll/formula/rules',
            old_url: '/payroll/formula/rules',
            component: <FormulaRule />,
            permission_needed: true,
            exclude_roles: [7],
        },
        name: 'Formula Rules',
        type: 'payroll',
        old_code: 'payroll_formularule'
    },

    payroll_formulalist: {
        view: {
            codenames: [GET_URL.salaryformula.basename],
            action_code: 'visible_payroll_formulalist_view',
            is_superuser_action: false,
            name: 'Salary Formulas',
            label: 'Salary Formulas',
            action: 'sub-menu',
            url: '/payroll/formula/view',
            old_url: '/payroll/formula/view',
            component: <FormulaList />,
            permission_needed: true,
            associated_urls: ['/payroll/formula/add'],
            exclude_roles: [7],
        },
        create: {
            codenames: [POST_URL.salaryformula.basename],
            action_code: 'visible_payroll_formulalist_add',
            is_superuser_action: false,
            name: 'Salary Formulas',
            label: 'Salary Formulas',
            action: 'action-url',
            url: '/payroll/formula/add',
            old_url: '/payroll/formula/add',
            component: <AddSalaryFormula />,
            permission_needed: true,
            exclude_roles: [7],
        },
        name: 'Salary Formulas',
        type: 'payroll',
        old_code: 'payroll_formulalist'
    },

    payroll_staffsalary: {
        view: {
            codenames: [GET_URL.staffsalary.basename],
            action_code: 'visible_payroll_staffsalary_view',
            is_superuser_action: false,
            name: 'Staff Salary',
            label: 'Staff Salary',
            action: 'sub-menu',
            url: '/payroll/staffsalary/view',
            old_url: '/payroll/staffsalary/view',
            component: <ViewStaffSalary />,
            permission_needed: true,
            associated_urls: ['/payroll/staffsalary/add'],
            exclude_roles: [7],
        },
        update: {
            codenames: [PUT_URL.staffsalary.basename],
            action_code: 'visible_payroll_staffsalary_change',
            is_superuser_action: false,
            name: 'Staff Salary',
            label: 'Staff Salary',
            action: 'action',
            permission_needed: true,
            exclude_roles: [7],
        },
        delete: {
            codenames: [DEL_URL.staffsalary.basename],
            action_code: 'visible_payroll_staffsalary_delete',
            is_superuser_action: false,
            name: 'Staff Salary',
            label: 'Staff Salary',
            action: 'actions',
            permission_needed: true,
            exclude_roles: [7],
        },
        create: {
            codenames: [POST_URL.staffsalary.basename],
            action_code: 'visible_payroll_staffsalary_add',
            is_superuser_action: false,
            name: 'Staff Salary',
            label: 'Staff Salary',
            action: 'action-url',
            url: '/payroll/staffsalary/add',
            old_url: '/payroll/staffsalary/add',
            component: <AddStaffSalary />,
            permission_needed: true,
            exclude_roles: [7],
        },
        name: 'Staff Salary',
        type: 'payroll',
        old_code: 'payroll_staffsalary'
    },

    payroll_manualattendance: {
        view: {
            codenames: [GET_URL.staffmanualattendance.basename],
            action_code: 'visible_payroll_manualattendance_view',
            is_superuser_action: false,
            name: 'Manual Attendance',
            label: 'Manual Attendance',
            action: 'sub-menu',
            url: '/payroll/manualattendance/view',
            old_url: '/payroll/manualattendance/view',
            component: <ManualLOP />,
            permission_needed: true,
            exclude_roles: [7],
        },
        create: {
            codenames: [POST_URL.staffmanualattendance.basename],
            action_code: 'visible_payroll_manualattendance_add',
            is_superuser_action: false,
            name: 'Manual Attendance',
            label: 'Manual Attendance',
            action: 'action',
            permission_needed: true,
            exclude_roles: [7],
        },
        name: 'Manual Attendance',
        type: 'payroll',
        old_code: 'payroll_manualattendance'
    },

    payroll_summarytable: {
        view: {
            codenames: [GET_URL.salaryemployeemonthplan.basename],
            action_code: 'visible_payroll_summarytable_view',
            is_superuser_action: false,
            name: 'Payroll Summary',
            label: 'Payroll Summary',
            action: 'sub-menu',
            url: '/payroll/summary/view',
            old_url: '/payroll/summary/view',
            component: <PayrollSummaryTable />,
            permission_needed: true,
            exclude_roles: [7],
        },
        name: 'Payroll Summary',
        type: 'payroll',
        old_code: 'payroll_summarytable'
    },
}

export default Actions