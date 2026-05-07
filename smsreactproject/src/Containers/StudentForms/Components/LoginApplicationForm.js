import React, { Component } from 'react';
import {
    Tabs, AppBar, Tab, Typography, Box, Button, Grid, Dialog, DialogActions, DialogContent, DialogTitle,
    Toolbar, IconButton, Paper, List, ListItem, ListItemIcon, ListItemText,
} from "@material-ui/core";
import PropTypes from 'prop-types'
import { withRouter } from 'react-router-dom';
import Swal from 'sweetalert2'
import Skeleton from '@material-ui/lab/Skeleton';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
import { Prompt } from 'react-router'
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link } from 'react-router-dom';
import CloseIcon from '@material-ui/icons/Close';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import GetAppIcon from '@material-ui/icons/GetApp';
import PaymentIcon from '@material-ui/icons/Payment';
import AddCircleIcon from '@material-ui/icons/AddCircle';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';

// Redux
import { createStructuredSelector } from 'reselect';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { makeLoginApplicationFormList } from 'Components/CommonComponent/selectors'
import { setLoginApplicationFormList } from 'Components/CommonComponent/actions';

import { printPDF, isUserHasPermission, getUrlParam } from 'Includes/functions';
import { Actions } from 'Constants/permissions';
import { getRequest, postRequest, putRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, POST_URL } from 'Includes/urls'
import ApplicationStudentInformation from 'Containers/StudentForms/ApplicationStudentInformation';
import ApplicationParentInformation from 'Containers/StudentForms/ApplicationParentInformation';
import ApplicationStudentSubmission from 'Containers/StudentForms/ApplicationStudentSubmission';
import LoadingGif from 'Components/LoadingGif';
import { updateFormFields } from 'Containers/Admin/FormDefinition/functions';
import { Forms } from 'Constants/FormDefinition';
import messages from './../messages';
import commonMessages from 'Constants/messages'
import { FormattedMessage } from 'react-intl';
import { Dropdown } from 'Components/DropDown';

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}
function TabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <Typography
            component="div"
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            <Box p={3}>{children}</Box>
        </Typography>
    );
}

TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.any.isRequired,
    value: PropTypes.any.isRequired,
};

function a11yProps(index) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}



class LoginApplicationForm extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value: 0,
            errors: {},
            studentError: false,
            parentError: false,
            disable: false,
            open: false,
            alertData: '',
            payDisabled: false,
            student: '',

            isEditForm: false,
            studentDetail: null,
            loading: true,
            enquiryID: '',
            parentId: '',
            guardianId: '',
            isUploaded: true,
            profile_pic: null,
            isUploadFailed: false,
            isPrompt: false,
            student_form_details: null,
            isDialogOpenForm: false,
            selectedYear: false,
            yearList: [],
            fieldError: {},
            isFromLogin:false,
            isFromDashboard: false
        };
    }
    updateTab = () => {
        this.setState({ disable: false, loadingEnquiry: false })
    }

    handleChange = (e, newValue) => {
        if (newValue === 0) {
            this.setState({
                value: newValue
            })
        }
        else if (newValue === 1) {
            const studentTest = this.refs.student.validate();
            if (studentTest) {
                this.setState({
                    value: newValue,
                    studentError: false
                })
            }
            else {
                this.setState({
                    studentError: true
                })
            }
        }
        else if (newValue === 2) {
            let studentTest = this.refs.student.validate();
            let parentTest = this.refs.parent.validate();
            if (studentTest) {
                if (parentTest) {
                    this.setState({
                        value: newValue,
                        parentError: false,
                        studentError: false
                    }, () => {
                        studentTest = { ...studentTest, ...parentTest }
                        this.refs.review.reviewStudent(studentTest, this.state.isEditForm)
                    })
                }
                else {
                    this.setState({
                        value: 1,
                        parentError: true,
                        studentError: false
                    })
                }
            }
            else {
                this.setState({
                    studentError: true
                })
            }

        }

    }


    getYearList = async () => {
        const year_url = GET_URL.academicyear.api
        const params = { is_active: true, is_application_page: true }
        const qs = getUrlParam(this.props.location.search || window.location.search);
        const preYear = qs.year !== undefined && qs.year !== '' ? qs.year : null;
        getRequest(year_url, params, this.props).then(response => {
            if (response && response.status === 200) {
                const yearList = response.data.data || []
                if (yearList.length >= 1) {
                    const first = yearList[0]
                    this.setState({
                        yearList,
                        year: first.id,
                        year_name: first.name,
                        start_date: first.start_date,
                        end_date: first.end_date,
                        selectedYear: true,
                        loading: true,
                        ...(preYear ? { year: preYear } : {}),
                    }, () => {
                        this.getFormDetails('login_application_form')
                    })
                } else {
                    this.setState({ yearList, loading: false })
                }
            }
        })
    }

    handleClose = () => {
        this.setState({
            open: false
        })
    }


    check = async (student) => {
        this.setState({ payDisabled: true, student: student, isPrompt: false })
        const { enquiryID, parentId, guardianId, isUploaded, profile_pic, isUploadFailed , isFromLogin} = this.state
        let post_data = {
            'student': {
                'first_name': student.first_name.trim(),
                'middle_name': student.middle_name.trim(),
                'last_name': student.last_name.trim(),
                'sts': student.sts,
                'gender': student.gender,
                'dob': student.dob,
                'mobile_num': student.mobile_num,
                'email': typeof (student.email) === 'string' ? student.email.trim() : student.email,
                'entry_academic_year': student.entry_academic_year === 0 ? null : student.entry_academic_year,
                'current_standard': student.current_standard === 0 ? null : student.current_standard,
                'enquiry': enquiryID ? enquiryID : null,
                'application_date': student.application_date,
                'student_type': student.student_type ? student.student_type : 'Day Scholar',
                ...((profile_pic) ? {
                    'profile_pic': profile_pic,
                } : {
                    'profile_pic': null,
                }),
            },
            'student_detail': {
                'aadhar_num': student.aadhar_num,
                'eid_num': student.eid_num,
                'mother_tongue': student.mother_tongue,
                'place_of_birth': student.place_of_birth.trim(),
                'nationality': student.nationality ? student.nationality : '',
                'religion': student.religion ? student.religion : '',
                'caste': student.caste ? student.caste.id : '',
                'category': student.category ? student.category : '',
                'blood_group': student.blood_group ? student.blood_group : '',
                ...((student.physically_handicaped) ? {
                    'handicap_reason': student.handicap_reason.trim(),
                } : {}),
                'physically_handicaped': student.physically_handicaped,
                'previous_school_details': student.previous_school_details,
                'medical_details': {
                    'physician_name': typeof (student.medical.physician_name) === 'string' ? student.medical.physician_name.trim() : student.medical.physician_name,
                    'med_mobile': student.medical.med_mobile,
                    'med_altmobile': student.medical.med_altmobile,
                    'hospital': typeof (student.medical.hospital) === 'string' ? student.medical.hospital.trim() : student.hospital,
                    'ins_company': typeof (student.medical.ins_company) === 'string' ? student.medical.ins_company.trim() : student.ins_company,
                },
                'is_bpl': student.is_bpl,
                'bpl_num': student.bpl_num ? student.bpl_num : '',
                'bpl_issue_authority': typeof (student.bpl_issue_authority) === 'string' ? student.bpl_issue_authority.trim() : '',
                'bpl_issue_date': student.bpl_issue_date ? student.bpl_issue_date : null,
            },
            'parent_detail': {
                'father_name': student.father_name.trim(),
                'f_aadhar': student.f_aadhar,
                'f_mobile_num': student.f_mobile_num,
                'f_occupation': student.f_occupation.trim(),
                'f_education': student.f_education,
                'f_office_address': student.f_office_address.trim(),
                'f_dob': (student.f_dob) ? student.f_dob : null,
                'm_dob': (student.m_dob) ? student.m_dob : null,
                'f_pan': student.f_pan.trim(),
                'f_email': student.f_email.trim(),
                'mother_name': student.mother_name.trim(),
                'm_aadhar': student.m_aadhar,
                'm_mobile_num': student.m_mobile_num,
                'm_occupation': student.m_occupation.trim(),
                'm_education': student.m_education.trim(),
                'm_office_address': student.m_office_address.trim(),
                'm_pan': student.m_pan,
                'dependents': student.dependents,
                'm_email': student.m_email.trim(),
                'f_annual_income': (student.f_annual_income) ? student.f_annual_income : null,
                'm_annual_income': (student.m_annual_income) ? student.m_annual_income : null,
                'f_tax_payee': (Boolean(student.father_name) || Boolean(student.mother_name)) ? student.f_tax_payee : null,
                'm_tax_payee': (Boolean(student.mother_name) || Boolean(student.father_name)) ? student.m_tax_payee : null,
                ...((this.state.isEditForm) ? {
                    'id': parentId
                } : {}),
            },
            'guardian_detail': {
                'g_tax_payee': Boolean(student.guardian_name) ? student.g_tax_payee : null,
                'guardian_name': student.guardian_name.trim(),
                'g_dob': (student.g_dob) ? student.g_dob : null,
                'g_aadhar': student.g_aadhar.trim(),
                'g_mobile_num': student.g_mobile_num.trim(),
                'g_occupation': student.g_occupation.trim(),
                'g_education': student.g_education.trim(),
                'g_office_address': student.g_office_address.trim(),
                'g_pan': student.g_pan.trim(),
                'g_email': student.g_email.trim(),
                'annual_income': (student.annual_income) ? student.annual_income : null,
                ...((this.state.isEditForm) ? {
                    'id': guardianId
                } : {}),
            },
            'student_address': {
                'cp': student.current_address_checked,
                ...((!student.current_address_checked) ? {
                    'permanent_address': {
                        ...((this.state.isEditForm) ? {
                            "id": student.permanent_address_id,
                        } : {}),
                        'address': (student.permanentAddress.address) ? student.permanentAddress.address : null,
                        'country': student.permanentAddress.country === 0 ? null : student.permanentAddress.country,
                        'state': student.permanentAddress.state === 0 ? null : student.permanentAddress.state,
                        'district': student.permanentAddress.district === 0 ? null : student.permanentAddress.district,
                        'city': student.permanentAddress.city === 0 ? null : student.permanentAddress.city,
                        'pincode': (student.permanentAddress.pincode) ? student.permanentAddress.pincode : null
                    },
                } : {}),
                'current_address': {
                    ...((this.state.isEditForm) ? {
                        "id": student.current_address_id,
                    } : {}),
                    'address': (student.currentAddress.address) ? student.currentAddress.address : null,
                    'country': student.currentAddress.country === 0 ? null : student.currentAddress.country,
                    'state': student.currentAddress.state === 0 ? null : student.currentAddress.state,
                    'district': student.currentAddress.district === 0 ? null : student.currentAddress.district,
                    'city': student.currentAddress.city === 0 ? null : student.currentAddress.city,
                    'pincode': (student.currentAddress.pincode) ? student.currentAddress.pincode : null
                },
            },
            'fees': student.fees
        }
        if (isUploaded) {
                const url = POST_URL.application.api
                postRequest(url, post_data, this.props).then(response => {
                    if (response && response.status === 200) {
                        let props = { ...this.props };
                        props.title = `Application Fees collected for ${student.first_name} ${student.middle_name} ${student.last_name}`;
                        props.url = GET_URL.applicationFeesReceipt.api + response.data.data.receipt_id + '/';
                        printPDF(props);
                        if(isFromLogin){
                            this.props.history.push({
                                pathname: '/login',
                            })
                        }
                        else{
                            this.props.history.push({
                                pathname: Actions.application_student_list.view.url,
                            })
                        }
                    }
                    else {
                        this.refs.review.closeFeePaymentModal()
                    }
                    this.setState({ payDisabled: false })
                })
        }
        else if (isUploadFailed) {
            Swal.fire({
                type: 'error',
                title: 'Something Went Wrong Upload Profile Pic Again',
                showConfirmButton: true,
            })
        }
    }

    /** POST application with is_active: 0 for online payment flow; returns Promise<{ application_student_id }> */
    createApplicationForPayment = (student) => {
        const { enquiryID, parentId, guardianId, profile_pic } = this.state;
        const post_data = {
            'student': {
                'first_name': student.first_name.trim(),
                'middle_name': student.middle_name.trim(),
                'last_name': student.last_name.trim(),
                'sts': student.sts,
                'gender': student.gender,
                'dob': student.dob,
                'mobile_num': student.mobile_num,
                'email': typeof (student.email) === 'string' ? student.email.trim() : student.email,
                'entry_academic_year': student.entry_academic_year === 0 ? null : student.entry_academic_year,
                'current_standard': student.current_standard === 0 ? null : student.current_standard,
                'enquiry': enquiryID ? enquiryID : null,
                'application_date': student.application_date,
                'student_type': student.student_type ? student.student_type : 'Day Scholar',
                ...((profile_pic) ? { 'profile_pic': profile_pic } : { 'profile_pic': null }),
                'is_active': 0,
            },
            'student_detail': {
                'aadhar_num': student.aadhar_num,
                'eid_num': student.eid_num,
                'mother_tongue': student.mother_tongue,
                'place_of_birth': student.place_of_birth.trim(),
                'nationality': student.nationality ? student.nationality : '',
                'religion': student.religion ? student.religion : '',
                'caste': student.caste ? student.caste.id : '',
                'category': student.category ? student.category : '',
                'blood_group': student.blood_group ? student.blood_group : '',
                ...((student.physically_handicaped) ? { 'handicap_reason': student.handicap_reason.trim() } : {}),
                'physically_handicaped': student.physically_handicaped,
                'previous_school_details': student.previous_school_details,
                'medical_details': {
                    'physician_name': typeof (student.medical?.physician_name) === 'string' ? student.medical.physician_name.trim() : student.medical?.physician_name,
                    'med_mobile': student.medical?.med_mobile,
                    'med_altmobile': student.medical?.med_altmobile,
                    'hospital': typeof (student.medical?.hospital) === 'string' ? student.medical.hospital.trim() : student.medical?.hospital,
                    'ins_company': typeof (student.medical?.ins_company) === 'string' ? student.medical.ins_company.trim() : student.medical?.ins_company,
                },
                'is_bpl': student.is_bpl,
                'bpl_num': student.bpl_num ? student.bpl_num : '',
                'bpl_issue_authority': typeof (student.bpl_issue_authority) === 'string' ? student.bpl_issue_authority.trim() : '',
                'bpl_issue_date': student.bpl_issue_date ? student.bpl_issue_date : null,
            },
            'parent_detail': {
                'father_name': student.father_name.trim(),
                'f_aadhar': student.f_aadhar,
                'f_mobile_num': student.f_mobile_num,
                'f_occupation': student.f_occupation.trim(),
                'f_education': student.f_education,
                'f_office_address': student.f_office_address.trim(),
                'f_dob': (student.f_dob) ? student.f_dob : null,
                'm_dob': (student.m_dob) ? student.m_dob : null,
                'f_pan': student.f_pan.trim(),
                'f_email': student.f_email.trim(),
                'mother_name': student.mother_name.trim(),
                'm_aadhar': student.m_aadhar,
                'm_mobile_num': student.m_mobile_num,
                'm_occupation': student.m_occupation.trim(),
                'm_education': student.m_education.trim(),
                'm_office_address': student.m_office_address.trim(),
                'm_pan': student.m_pan,
                'dependents': student.dependents,
                'm_email': student.m_email.trim(),
                'f_annual_income': (student.f_annual_income) ? student.f_annual_income : null,
                'm_annual_income': (student.m_annual_income) ? student.m_annual_income : null,
                'f_tax_payee': (Boolean(student.father_name) || Boolean(student.mother_name)) ? student.f_tax_payee : null,
                'm_tax_payee': (Boolean(student.mother_name) || Boolean(student.father_name)) ? student.m_tax_payee : null,
                ...((this.state.isEditForm) ? { 'id': parentId } : {}),
            },
            'guardian_detail': {
                'g_tax_payee': Boolean(student.guardian_name) ? student.g_tax_payee : null,
                'guardian_name': student.guardian_name.trim(),
                'g_dob': (student.g_dob) ? student.g_dob : null,
                'g_aadhar': student.g_aadhar.trim(),
                'g_mobile_num': student.g_mobile_num.trim(),
                'g_occupation': student.g_occupation.trim(),
                'g_education': student.g_education.trim(),
                'g_office_address': student.g_office_address.trim(),
                'g_pan': student.g_pan.trim(),
                'g_email': student.g_email.trim(),
                'annual_income': (student.annual_income) ? student.annual_income : null,
                ...((this.state.isEditForm) ? { 'id': guardianId } : {}),
            },
            'student_address': {
                'cp': student.current_address_checked,
                ...((!student.current_address_checked) ? {
                    'permanent_address': {
                        ...((this.state.isEditForm) ? { 'id': student.permanent_address_id } : {}),
                        'address': (student.permanentAddress?.address) ? student.permanentAddress.address : null,
                        'country': student.permanentAddress?.country === 0 ? null : student.permanentAddress?.country,
                        'state': student.permanentAddress?.state === 0 ? null : student.permanentAddress?.state,
                        'district': student.permanentAddress?.district === 0 ? null : student.permanentAddress?.district,
                        'city': student.permanentAddress?.city === 0 ? null : student.permanentAddress?.city,
                        'pincode': (student.permanentAddress?.pincode) ? student.permanentAddress.pincode : null,
                    },
                } : {}),
                'current_address': {
                    ...((this.state.isEditForm) ? { 'id': student.current_address_id } : {}),
                    'address': (student.currentAddress?.address) ? student.currentAddress.address : null,
                    'country': student.currentAddress?.country === 0 ? null : student.currentAddress?.country,
                    'state': student.currentAddress?.state === 0 ? null : student.currentAddress?.state,
                    'district': student.currentAddress?.district === 0 ? null : student.currentAddress?.district,
                    'city': student.currentAddress?.city === 0 ? null : student.currentAddress?.city,
                    'pincode': (student.currentAddress?.pincode) ? student.currentAddress.pincode : null,
                },
            },
            'fees': student.fees || {},
        };
        const url = POST_URL.application.api;
        return postRequest(url, post_data, { ...this.props, return_error: true })
            .then(response => {
                if (response && response.status === 200 && response.data?.data) {
                    const data = response.data.data;
                    return { application_student_id: data.id ?? data.application_student_id };
                }
                return Promise.reject(response?.data || new Error('Application creation failed'));
            });
    };

    getFormDetails = (form_name) => {
        let storedApplicationFormList = this.props.getApplicationFormList;
        if (!storedApplicationFormList) {
            const url = GET_URL.formdefinition.api
            const params = { form_name: form_name }
            getRequest(url, params, this.props).then(response => {
                if (response && response.status === 200) {
                    this.updateFields(response.data.data)
                    this.props.setLoginApplicationFormList(response.data.data);
                }
            })
        } else {
            this.updateFields(storedApplicationFormList)
        }
    }

    updateFields = (backendFieldsValue) => {
        let { student_form_details } = this.state;
        let updated_form_details
        if (backendFieldsValue.length !== 0) {
            updated_form_details = updateFormFields(Forms, backendFieldsValue, 'login_application_form', 'update_label')
            updated_form_details.map((data) => {
                if (data['page_details']['form_name'] === 'login_application_form') {
                    student_form_details = data['page_details']['sub_sections']
                }
            })
        }
        else {
            Forms.map((data) => {
                if (data['page_details']['form_name'] === 'login_application_form') {
                    student_form_details = data['page_details']['sub_sections']
                }
            })
        }
        this.setState({
            student_form_details,
            loading: false,
        })
    }

    getStudentDetails = async () => {
        // Check if location.state exists and has detail
        if (!this.props.location || !this.props.location.state || !this.props.location.state.detail) {
            return; // Exit early if state is not available
        }
        const id = this.props.location.state.detail;
        const g_url = GET_URL.getapplication.api
        const params = id + '/'
        const url = g_url + params
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    studentDetail: response.data.data,
                    isEditForm: true,
                    parentId: response.data.data.student_parent ? response.data.data.student_parent.application_parent : '',
                    guardianId: response.data.data.student_parent ? response.data.data.student_parent.application_guardian : '',
                    year_name: response.data.data.entry_academic_year_value
                })
            }
        })
    }

    UpdatingEnquiryStudentDetails(data) {
        let student = data.data
        let parent = { ...data.data.student_details, ...data.data }
        this.refs.studentInformation.updateEnquiryStudent(student);
        let previousSchool = data.data.student_details
        this.refs.studentInformation.updatePreviousSchool(previousSchool);
        this.refs.parentInformation.updateEnquiryParent(parent)
    }
    UpdatingApplicationStudentDetails(data) {
        let student = data.data
        let previousSchool = data.data.student_details
        let parent = { ...data.data.student_details, ...data.data.student_parent }
        this.refs.studentInformation.updateApplicationStudent(student);
        this.refs.parentInformation.updateApplicationParent(parent);
        this.refs.studentInformation.updatePreviousSchool(previousSchool);
    }

    scrollTop = () => {
        this.refs.student.scroll()
        this.refs.parent.scroll()
        this.refs.review.scroll()
    }

    loadingFalse = () => {
        this.setState({
            loading: false
        })
    }

    isUpload = (name, id) => {
        let { profile_pic, student, payDisabled, isUploadFailed } = this.state
        profile_pic = id ? id : null
        if (payDisabled && id) {
            this.setState({
                profile_pic,
                isUploaded: true
            }, () => {
                this.check(student);
            })
        }
        else if (name === 'failed') {
            payDisabled = false
            isUploadFailed = true
        }
        this.setState({
            profile_pic,
            isUploadFailed,
            isUploaded: name,
            payDisabled
        })
    }

    handlePrompt = (name) => {
        this.setState({
            isPrompt: name
        })
    }

    emptyStudentDetails = () => {
        this.setState({
            studentDetail: null,
            isEditForm: null
        }, () => {
            this.setState({
                isEditForm: false
            })
        })
    }

    handleDialog = () => {
        this.setState({
            isDialogOpenForm: true
        })
    }

    componentDidMount=()=>{
        const pathname = this.props.location?.pathname || '';
        const isFromLogin = (pathname === '/apply/application') ? true : false
        if (isFromLogin) {
            // First visit (no public token): expire main session and redirect to public login.
            // After successful public login, application_form_token exists and this block is skipped.
            const hasApplicationToken = !!localStorage.getItem('application_form_token');
            if (!hasApplicationToken) {
                localStorage.removeItem('user');
                localStorage.removeItem('menu');
                localStorage.removeItem('token');
                localStorage.removeItem('previewVideo');
                localStorage.removeItem('boards');
                localStorage.removeItem('board');
                localStorage.removeItem('branch');
                localStorage.removeItem('branches');
                localStorage.removeItem('signupconfig');
                localStorage.removeItem('userdetail');
                localStorage.removeItem('application_form_mobile');
                localStorage.removeItem('application_form_expiry');
                window.location.replace('/apply/login');
                return;
            }
        }
        const hasApplicationToken = !!localStorage.getItem('application_form_token')
        this.setState({
            isFromLogin,
            isFromDashboard: hasApplicationToken
        },()=>{
            this.getYearList()
        })
    }

    handleCloseDialog = () => {
        // If coming from dashboard, go back to dashboard, otherwise go to login
        const fromDashboard = localStorage.getItem('application_form_token');
        if (fromDashboard) {
            this.props.history.push('/apply/dashboard');
        } else {
            window.location = '/login';
        }
    }

    handleLogout = () => {
        localStorage.removeItem('application_form_token');
        localStorage.removeItem('application_form_mobile');
        localStorage.removeItem('application_form_expiry');
        this.props.history.push('/apply/login');
    }

    handleNavigation = (section) => {
        if (section === 'dashboard') {
            this.props.history.push('/apply/dashboard');
        } else if (section === 'payment') {
            this.props.history.push('/apply/dashboard');
            // Set active section in dashboard
        } else if (section === 'download') {
            this.props.history.push('/apply/dashboard');
            // Set active section in dashboard
        }
    }

    renderSidebar = () => {
        return (
            <Box
                style={{
                    width: '280px',
                    backgroundColor: '#1e3a8a',
                    color: 'white',
                    minHeight: '100vh',
                    padding: '20px 0',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 1000
                }}
            >
                <Box padding="20px" borderBottom="1px solid rgba(255,255,255,0.1)">
                    <Typography variant="h6" style={{ fontWeight: 600 }}>
                        APPLICATION FORM
                    </Typography>
                </Box>
                
                <Box style={{ flex: 1, overflowY: 'auto' }}>
                    <List style={{ paddingTop: '10px' }}>
                        <ListItem
                            button
                            onClick={() => this.handleNavigation('dashboard')}
                            style={{
                                paddingLeft: '20px'
                            }}
                        >
                            <ListItemIcon style={{ color: 'white', minWidth: '40px' }}>
                                <CheckCircleIcon />
                            </ListItemIcon>
                            <ListItemText primary="Admission Form" />
                        </ListItem>
                        
                        <ListItem
                            button
                            onClick={() => this.handleNavigation('download')}
                            style={{
                                paddingLeft: '20px'
                            }}
                        >
                            <ListItemIcon style={{ color: 'white', minWidth: '40px' }}>
                                <GetAppIcon />
                            </ListItemIcon>
                            <ListItemText primary="Download/Pdf" />
                        </ListItem>
                        
                        <ListItem
                            button
                            onClick={() => this.handleNavigation('payment')}
                            style={{
                                paddingLeft: '20px'
                            }}
                        >
                            <ListItemIcon style={{ color: 'white', minWidth: '40px' }}>
                                <PaymentIcon />
                            </ListItemIcon>
                            <ListItemText primary="Payment" />
                        </ListItem>
                        
                        <ListItem
                            button
                            selected={true}
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                borderLeft: '4px solid #60a5fa',
                                paddingLeft: '20px'
                            }}
                        >
                            <ListItemIcon style={{ color: 'white', minWidth: '40px' }}>
                                <AddCircleIcon />
                            </ListItemIcon>
                            <ListItemText primary="Add New Application" />
                        </ListItem>
                    </List>
                </Box>
                
                <Box 
                    padding="20px" 
                    style={{ 
                        width: '100%',
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                        marginTop: 'auto'
                    }}
                >
                    <Button
                        fullWidth
                        variant="outlined"
                        onClick={this.handleLogout}
                        style={{
                            color: 'white',
                            borderColor: 'white',
                            textTransform: 'none',
                            padding: '10px'
                        }}
                    >
                        Logout
                    </Button>
                </Box>
            </Box>
        );
    }

    renderFormContent = () => {
        const { open, alertData, isEditForm, payDisabled, studentDetail, loading, isPrompt, value, year, year_name, start_date, end_date,
            student_form_details, isFromLogin, submitDisable, selectedYear, yearList, fieldError } = this.state;
        
        return (
            <>
                {loading &&
                    <Box>
                        <LoadingGif />
                    </Box>
                }
                {!selectedYear && !loading && yearList.length === 0 &&
                    <Box className='mt-20'><FormattedMessage {...commonMessages.academicYear} /> not available.</Box>
                }
                {selectedYear &&
                    <div className={loading ? 'display-none' : 'width-form-95'}>
                        <Box className='md-down-justify-start md-up-justify-start mb-y-20 mt-20' display="flex" alignItems="center" flexWrap="wrap">
                            <Box className="mt-10 align-items-center display-flex">
                                <Box className="academic-std-head"> <FormattedMessage {...commonMessages.academicYear} /></Box>
                                <Box className=" exam-mark-add-heading-bg">{year_name}</Box>
                            </Box>
                        </Box>
                        <AppBar position="static" className='app-bar-heading m-t-20px m-b-20px'>
                            <Tabs value={value} variant='fullWidth' aria-selected='false' onChange={this.handleChange}
                                backgroundColor="#ffffff" indicatorColor="transparent"
                                className='md-up-justify-space-between'>
                                <Tab classes='' icon={
                                    <Box display="flex" width="100%">
                                        <Box className='form-number-heading'>1</Box>
                                        <Box className="tabs-heading" >
                                            <span>Student Information</span>
                                        </Box>
                                    </Box>}
                                    style={this.state.studentError ? { color: 'red' } : {}} {...a11yProps(3)} >
                                </Tab>
                                {this.state.disable &&
                                    <Box display='flex' width="80%" justifyContent='center'>
                                        <Skeleton variant="circle" width={40} height={40} className='skeleton-circle' />
                                        <Skeleton variant="rect" width={270} height={48} className='skeleton-rect' />
                                    </Box>
                                }
                                {!this.state.disable &&
                                    <Tab classes={{ root: 'form-tab' }} icon={
                                        <Box display="flex" width="100%" >
                                            <Box className='form-number-heading'>2</Box>
                                            <div className="tabs-heading">
                                                <span>Parent Information</span>
                                            </div>
                                        </Box>}
                                        style={this.state.parentError ? { color: 'red' } : {}} {...a11yProps(3)} />
                                }
                                {this.state.disable &&
                                    <Box display='flex' width="80%" justifyContent='flex-start'>
                                        <Skeleton variant="circle" width={40} height={40} className='skeleton-circle' />
                                        <Skeleton variant="rect" width={270} height={48} className='skeleton-rect' />
                                    </Box>
                                }
                                {!this.state.disable &&
                                    <Tab classes={{ root: 'form-tab' }} icon={
                                        <Box display="flex" width="100%">
                                            <Box className='form-number-heading'>3</Box>
                                            <div className="tabs-heading">
                                                <span>Review and Submission</span>
                                            </div>
                                        </Box>}
                                        {...a11yProps(5)} />
                                }
                            </Tabs>
                        </AppBar>

                        <TabPanel value={value} index={0} className='box-padding-0'>
                            {(studentDetail || isEditForm !== null) && student_form_details &&
                                <ApplicationStudentInformation
                                    studentDetail={studentDetail}
                                    form_details={student_form_details}
                                    isEditForm={isEditForm}
                                    loadingFalse={this.loadingFalse}
                                    verifyEnquiry={this.verifyEnquiry}
                                    isUpload={this.isUpload}
                                    loadingForm={loading}
                                    handlePrompt={this.handlePrompt}
                                    emptyStudentDetails={this.emptyStudentDetails}
                                    ref={'student'}
                                    yearInformation={{ year: year, year_name: year_name, start_date: start_date, end_date: end_date }}
                                    isFromLogin={isFromLogin}
                                />
                            }
                        </TabPanel>

                        <TabPanel value={value} index={1} className='box-padding-0'>
                            {(studentDetail || isEditForm !== null) && student_form_details &&
                                <ApplicationParentInformation
                                    studentDetail={studentDetail}
                                    form_details={student_form_details}
                                    isEditForm={isEditForm}
                                    verifyEnquiry={this.verifyEnquiry}
                                    loading={loading}
                                    handlePrompt={this.handlePrompt}
                                    ref={'parent'}
                                />
                            }
                        </TabPanel>

                        <TabPanel value={value} index={2} className='box-padding-0'>
                            {(studentDetail || isEditForm !== null) && student_form_details &&
                                <ApplicationStudentSubmission
                                    payDisabled={payDisabled}
                                    form_details={student_form_details}
                                    value={value}
                                    ref={'review'}
                                    check={this.check}
                                    onClick={this.review}
                                    isFromLogin={isFromLogin}
                                    createApplicationForPayment={this.createApplicationForPayment}
                                />
                            }
                        </TabPanel>
                        <Box display='flex' justifyContent='flex-end' mr={3} onClick={this.scrollTop}>
                            <Box marginRight='10px' display={value === 1 ? '' : 'none'} onClick={value === 1 ? (e) => this.handleChange(e, 0) : ''}>
                                <Button className='form-next-pre-button'>Previous</Button>
                            </Box>
                            <Box display={value === 2 ? 'none' : 'flex'} onClick={value === 0 ? (e) => this.handleChange(e, 1) : (e) => this.handleChange(e, 2)}>
                                <Button className='form-next-pre-button' ml={2}> Next </Button>
                            </Box>
                        </Box>
                        <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={open} autoHideDuration={2000} onClose={this.handleClose}>
                            <Alert onClose={this.handleClose} severity="error">
                                {alertData}
                            </Alert>
                        </Snackbar>
                    </div>
                }
                <Prompt
                    when={isPrompt}
                    message='Application Form is not submitted, Are you sure to exit ?'
                />
            </>
        );
    }

    handleSelectYear = () => {
        this.getFormDetails('login_application_form')
    }

    onChange = (e) => {
        let { name, value } = e.target;
        this.setState({
            [name]: value
        })
    }

    handleProceed = () => {
        const { year , yearList} = this.state;
        if (!year) {
            let fieldError = { year: <FormattedMessage {...commonMessages.fieldMandatoryError} /> }
            this.setState({ fieldError })
        }
        else {
            let year_name,start_date,end_date         
            yearList.map((data)=>{
                if(year===data['id']){
                    year_name=data['name']
                    start_date=data['start_date']
                    end_date=data['end_date']
                }
            })
            this.setState({
                isEditForm: false,
                year_name,
                start_date,
                end_date,
                selectedYear:true,
                loading:true
            })
            this.getFormDetails('login_application_form')
        }
    }

    render() {
        const { isFromDashboard } = this.state;
        
        // If accessed from dashboard, render with sidebar layout
        if (isFromDashboard) {
            return (
                <Box display="flex" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
                    {this.renderSidebar()}
                    
                    <Box
                        style={{
                            marginLeft: '280px',
                            padding: '30px',
                            width: 'calc(100% - 280px)',
                            backgroundColor: '#f5f5f5'
                        }}
                    >
                        <Paper style={{ padding: '30px', minHeight: 'calc(100vh - 60px)' }}>
                            <Box display="flex" alignItems="center" marginBottom="20px">
                                <Button
                                    startIcon={<ArrowBackIcon />}
                                    onClick={() => this.props.history.push('/apply/dashboard')}
                                    style={{ marginRight: '15px' }}
                                >
                                    Back to Dashboard
                                </Button>
                                <Typography variant="h5" style={{ fontWeight: 600 }}>
                                    Online Registration Form for Admission
                                </Typography>
                            </Box>
                            {this.renderFormContent()}
                        </Paper>
                    </Box>
                </Box>
            );
        }
        
        // Otherwise, render as dialog (original behavior)
        return (
            <div>
                <> 
                    <Dialog open={true}
                        className={'dialog-custom-application-form'}
                        aria-labelledby='form-dialog-title'>
                        <AppBar style={{ width: '1000px', right: 'auto' }}>
                            <Toolbar>
                                <IconButton edge="start" color="inherit" onClick={this.handleCloseDialog} aria-label="close">
                                    <CloseIcon />
                                </IconButton>
                                <Typography variant="h6">
                                    Apply Application Form
                                </Typography>
                            </Toolbar>
                        </AppBar>
                        <DialogTitle id='form-dialog-title'></DialogTitle>
                        <DialogContent>
                            {this.renderFormContent()}
                        </DialogContent>
                    </Dialog>
                </>
            </div>
        );
    }
}

const mapStateToProps = createStructuredSelector({
    getApplicationFormList: makeLoginApplicationFormList()
})
function mapDispatchToProps(dispatch) {
    return bindActionCreators({ setLoginApplicationFormList }, dispatch);
}
export default withRouter(connect(mapStateToProps, mapDispatchToProps)(LoginApplicationForm));
