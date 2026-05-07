import React, { Component } from 'react'
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link } from 'react-router-dom';
import { Box, Grid, Button } from '@material-ui/core';
import { withRouter } from 'react-router-dom';

import PrintForm from 'Components/PrintForm'
import { getRequest, } from 'Includes/api/apicall';
import { GET_URL, } from 'Includes/urls'
import LoadingGif from 'Components/LoadingGif';
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, dateFormat, getSettingValue } from 'Includes/functions';

const isResidential = parseInt(getSettingValue('is_residential'));
const admission_in_reg = parseInt(getSettingValue('admission_in_reg'));
const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

class AdmissionPrintForm extends Component {

    constructor(props) {
        super(props)

        this.state = {
            profile: 1,
            student_id: '',
            loading: true,
            enablePrint: false,
            isSslcPucPresent: false,
            isPucPresent: false,
            enabledAction: [],
            formDetails: []
        }
    }

    onClicked = (key) => {
        this.setState({
            profile: key
        })
    }

    componentDidMount() {
        this.getStandardList();
    }

    getStandardList = (year) => {
        const url = GET_URL.getstandard.api
        const params = { academic_year: year }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    standardList: response.data.data
                }, () => {
                    this.setApplicationView();
                })
            }
        })
    }

    setApplicationView = () => {
        let { isSslcPucPresent, standardList, isPucPresent, formDetails } = this.state;
        let { student_id } = this.props;
        const id = student_id;
        const url = GET_URL.getallstudents.api + id + '/'
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                let student = response.data.data

                standardList.map((data) => {
                    if (data.id == student.current_standard && data.codename === 'standard11') {
                        isSslcPucPresent = true
                    }
                    if (data.id == student.current_standard && data.codename === 'standard12') {
                        isPucPresent = true
                        isSslcPucPresent = true
                    }
                })


                let student_basic = {
                    'sub_heading': 'Student Basic Details',
                    'data': [{ label: 'First Name', value: student['first_name'] }, { label: 'Middle Name', value: student['middle_name'] },
                    { label: 'Last Name', value: student['last_name'] }, { label: 'User Name', value: student['username'], className: 'text-transform-none' }, { label: 'Date Of Birth', value: dateFormat(student['dob'], 'DD-MM-YYYY') }, { label: 'Gender', value: student['gender'] },
                    { label: 'Mobile Number', value: student['mobile_num'] }, { label: 'Email', value: student['email'], className: 'text-transform-none' },
                    { label: 'Admission Year', value: student['admission_year'] }, { label: 'Admission Date', value: dateFormat(student['admission_date'], 'DD-MM-YYYY') },
                    (admission_in_reg) &&
                    {
                        label: 'Register Number', value: student['current_reg_num']
                    },
                    (!admission_in_reg) &&
                    {
                        label: 'Admission Number', value: student['admission_num']
                    },
                    (isResidential) &&
                    {
                        label: 'Student Type', value: student['student_type']
                    },

                    { label: 'Admission Number', value: student['admission_num'] }, { label: 'Standard', value: student['current_standard_name'] },
                    { label: 'Mother Tongue', value: student['student_details']['mother_tongue'] }, { label: 'Sts Number', value: student['sts'] },

                    ]
                };
                formDetails.push(student_basic)

                let student_detail = student.student_details
                if (student.student_details !== null) {
                    student_basic = {
                        'sub_heading': 'Student Detail Details',
                        'data': [{ label: 'Aadhaar Number', value: student_detail['aadhar_num'] }, { label: 'Adhar UID Number', value: student_detail['eid_num'] },
                        { label: 'Place Of Birth', value: student_detail['place_of_birth'] }, { label: 'Nationality', value: student_detail['nationality_name'] },
                        { label: 'Religion', value: student_detail['religion_name'], className: 'text-transform-none' }, { label: 'Category', value: student_detail['category_name'] },
                        { label: 'Caste', value: student_detail['caste_name'] }, { label: 'Is Physically Handicaped', value: student_detail['physically_handicaped'] ? 'Yes' : 'No' },
                        { label: 'Handicaped Reason', value: student_detail['handicap_reason'] }]
                    };
                    formDetails.push(student_basic)

                    student_basic = {
                        'sub_heading': 'Bank Details',
                        'data': [{ label: 'Account Number', value: student_detail['account_num'] }, { label: 'IFSC Code', value: student_detail['ifsc'] },
                        ]
                    }
                    formDetails.push(student_basic)

                    let medical = student.student_details.medical_details
                    student_basic = {
                        'sub_heading': 'Student physician/Medical Contact Details',
                        'data': [{ label: 'Physician Name', value: medical['physician_name'] }, { label: 'Hospital', value: medical['hospital'] },
                        { label: 'Contact Number', value: medical['med_mobile'] }, { label: 'Alternative Number ', value: medical['med_altmobile'] },
                        { label: 'Insurance Company', value: medical['ins_company'] }]
                    };
                    formDetails.push(student_basic)


                }

                let extraActivity = student.student_details.previous_school_details.extraActivity ? student.student_details.previous_school_details.extraActivity : {}
                student_basic = {
                    'sub_heading': 'Extra Activity Details',
                    'data': [{ label: 'Extra Activities', value: extraActivity['extra_activity'] },
                    ]
                }
                formDetails.push(student_basic)

                if (student.student_parent !== null) {
                    let parent = student.student_parent.parent ? student.student_parent.parent : {}
                    let guardian = student.student_parent.guardian ? student.student_parent.guardian : {}
                    student_basic = {
                        'sub_heading': 'Student Father Details',
                        'data': [{ label: 'Name', value: parent['father_name'] }, { label: 'Number', value: parent['f_mobile_num'] },
                        { label: 'Email', value: parent['f_email'] }, { label: 'Date Of Birth', value: dateFormat(parent['f_dob'], 'DD-MM-YYYY') },
                        { label: 'Aadhaar Number', value: parent['f_aadhar'] }, { label: 'Occupation', value: parent['f_occupation'] },
                        { label: 'Office Address', value: parent['f_office_address'] }, { label: 'Education', value: parent['f_education'] },
                        { label: 'Pan Number', value: parent['f_pan'] }, { label: 'Tax Payee', value: parent['f_tax_payee'] ? 'Yes' : 'No' }]
                    }
                    formDetails.push(student_basic)
                    student_basic = {
                        'sub_heading': 'Student Mother Details',
                        'data': [{ label: 'Name', value: parent['mother_name'] }, { label: 'Number', value: parent['m_mobile_num'] },
                        { label: 'Email', value: parent['m_email'], className: 'text-transform-none' }, { label: 'Date Of Birth', value: dateFormat(parent['m_dob'], 'DD-MM-YYYY') },
                        { label: 'Aadhaar Number', value: parent['m_aadhar'] }, { label: 'Occupation', value: parent['m_occupation'] },
                        { label: 'Office Address', value: parent['m_office_address'] }, { label: 'Education', value: parent['m_education'] },
                        { label: 'Pan Number', value: parent['m_pan'] }, { label: 'Tax Payee', value: parent['m_tax_payee'] ? 'Yes' : 'No' },
                        { label: 'Parents Annual Income', value: parent['parents_annual_income'] }, { label: 'No of dependents', value: parent['dependents'] }]
                    }
                    formDetails.push(student_basic)
                    student_basic = {
                        'sub_heading': 'Student Guardian Details',
                        'data': [{ label: 'Name', value: guardian['guardian_name'] }, { label: 'Number', value: guardian['g_mobile_num'] },
                        { label: 'Email', value: guardian['g_email'] }, { label: 'Date Of Birth', value: dateFormat(guardian['g_dob'], 'DD-MM-YYYY') },
                        { label: 'Aadhaar Number', value: guardian['g_aadhar'] }, { label: 'Occupation', value: guardian['g_occupation'] },
                        { label: 'Office Address', value: guardian['g_office_address'] }, { label: 'Education', value: guardian['g_education'] },
                        { label: 'Pan Number', value: guardian['g_pan'] }, { label: 'Tax Payee', value: guardian['g_tax_payee'] ? 'Yes' : 'No' },
                        { label: 'Annual Income', value: guardian['annual_income'] }]
                    }

                    formDetails.push(student_basic)
                }
                if (student_detail['is_bpl'] === true) {
                    student_basic = {
                        'sub_heading': 'Student BPL Card Details',
                        'data': [{ label: 'Is BPL Card Holder', value: student_detail['is_bpl'] ? 'Yes' : 'No' }, { label: 'BPL Number', value: student_detail['bpl_num'] },
                        { label: 'BPL Issue Authority', value: student_detail['bpl_issue_authority'] }, { label: 'BPL Issue Date ', value: dateFormat(student_detail['bpl_issue_date'], 'DD-MM-YYYY') }]
                    };
                    formDetails.push(student_basic)
                }
                let c_address = student.student_address
                let cp = [];
                c_address.map((data) => {
                    if (data['type'] === 'CP') {
                        cp.push({ label: 'Address Line', value: data['address'] }, { label: 'Country', value: data['country_name'] },
                            { label: 'State', value: data['state_name'] }, { label: 'District', value: data['district_name'] },
                            { label: 'City', value: data['city_name'] }, { label: 'Pincode', value: data['pincode'] })
                        student_basic = {
                            'sub_heading': 'Current and Permanent Address',
                            'data': cp
                        }
                    }
                    else {
                        cp.push({ label: 'Address Line', value: data['address'] }, { label: 'Country', value: data['country_name'] },
                            { label: 'State', value: data['state_name'] }, { label: 'District', value: data['district_name'] },
                            { label: 'City', value: data['city_name'] }, { label: 'Pincode', value: data['pincode'] })
                        student_basic = {
                            'sub_heading': (data['type'] === 'C') ? 'Current Address' : 'Permanant Address',
                            'data': cp
                        }
                        cp = [];
                    }
                    formDetails.push(student_basic)
                })
                let school = student.student_details.previous_school_details ? student.student_details.previous_school_details : {}
                student_basic = {
                    'sub_heading': `Previous ${alias_names['school']} Details`,
                    'data': [{ label: 'School Name', value: school['school_name'], className: 'text-transform-none' }, { label: 'School Address', value: school['school_address'] },
                    { label: 'From Date', value: dateFormat(school['from_date'], 'DD-MM-YYYY') }, { label: 'To Date', value: dateFormat(school['to_date'], 'DD-MM-YYYY') }, { label: 'TC Number', value: school['school_tc_number'] },
                    { label: 'TC Issued Date', value: dateFormat(school['tc_issued_date'], 'DD-MM-YYYY') }, { label: 'Left Standard', value: school['left_standard'] },
                    { label: 'Particulars of the last exam passed', value: school['particulars_last_exam_passed'] },
                    ]
                }
                formDetails.push(student_basic)

                if (isSslcPucPresent) {

                    let sslc = student.student_details.previous_school_details.sslc ? student.student_details.previous_school_details.sslc : {}
                    student_basic = {
                        'sub_heading': 'SSLC Details',
                        'data': [{ label: 'No of Attempts', value: sslc['attempts'] }, { label: 'Year & Month of Passing', value: sslc['year_month_passing'] },
                        { label: 'Register Number', value: sslc['reg_num'] }, { label: 'Result With Class', value: sslc['result'] }, { label: 'Percentage', value: sslc['percentage'] },
                        ]
                    }
                    formDetails.push(student_basic)


                    let language = student.student_details.previous_school_details.language ? student.student_details.previous_school_details.language : {}
                    student_basic = {
                        'sub_heading': 'Second Language & Medium Instruction offered in SSLC or its equivalent Exam',
                        'data': [{ label: 'Second Language', value: language['second_language'] }, { label: 'Medium Instruction', value: language['medium_instruction'] },
                        ]
                    }
                    formDetails.push(student_basic)

                    let sslcMarks = student.student_details.previous_school_details.sslcMarks ? student.student_details.previous_school_details.sslcMarks : {}
                    student_basic = {
                        'sub_heading': 'SSLC Marks Details',
                        'data': [{ label: 'Kannada', value: sslcMarks['kannada'] }, { label: 'English', value: sslcMarks['english'] }, { label: 'Hindi', value: sslcMarks['hindi'] },
                        { label: 'Mathematics', value: sslcMarks['mathematics'] }, { label: 'Science', value: sslcMarks['science'] }, { label: 'Social Studies', value: sslcMarks['social_studies'] },
                        { label: 'Total Marks', value: sslcMarks['total_marks'] }, { label: 'Max Marks', value: sslcMarks['max_marks'] }, { label: 'Percentage', value: sslcMarks['percentage'] },
                        ]
                    }
                    formDetails.push(student_basic)

                    if (isPucPresent) {
                        let puc = student.student_details.previous_school_details.puc ? student.student_details.previous_school_details.puc : {}
                        student_basic = {
                            'sub_heading': 'PUC Details',
                            'data': [{ label: 'No of Attempts', value: puc['attempts'] }, { label: 'Year & Month of Passing', value: puc['year_month_passing'] },
                            { label: 'Register Number', value: puc['reg_num'] }, { label: 'Result With Class', value: puc['result'] }, { label: 'Percentage', value: puc['percentage'] },
                            ]
                        }
                        formDetails.push(student_basic)

                        let pucMarks = student.student_details.previous_school_details.pucMarks ? student.student_details.previous_school_details.pucMarks : {}
                        student_basic = {
                            'sub_heading': 'PUC Marks Details',
                            'data': [{ label: 'Kannada', value: pucMarks['kannada_hindi'] }, { label: 'English', value: pucMarks['english'] }, { label: 'Physics', value: pucMarks['physics'] },
                            { label: 'Chemistry', value: pucMarks['chemistry'] }, { label: 'Mathematics', value: pucMarks['mathematics'] }, { label: 'Biology', value: pucMarks['biology'] },
                            { label: 'Total Marks', value: pucMarks['total_marks'] }, { label: 'Max Marks', value: pucMarks['max_marks'] }, { label: 'Percentage', value: pucMarks['percentage'] },
                            ]
                        }
                        formDetails.push(student_basic)
                    }
                }

                this.setState({
                    formDetails,
                    loading: false,
                    student_id: student.id,
                })

            }
        })

    }

    render() {
        const { loading, formDetails } = this.state;
        return (
            <div>
                <PrintForm
                    formDetails={formDetails}
                    handleClosePopup={this.props.handleClosePopup}
                    heading='Admission Form'
                    loading={loading}
                />
            </div>
        )
    }
}

export default withRouter(AdmissionPrintForm);



