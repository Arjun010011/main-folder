import React, { Component } from 'react';
import {
    Paper, Box, Button, Grid, TableContainer, Table, TableHead, TableCell, TableRow, TableBody,
    Tooltip, TextField,
} from '@material-ui/core';
import { withRouter } from 'react-router-dom';
import Snackbar from '@material-ui/core/Snackbar';
import _ from 'lodash';
import Swal from 'sweetalert2'
import MultiSelect from "react-multi-select-component";
import loadingBar from 'images/loading.gif';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Dropdown } from 'Components/DropDown';

import InfoIcon from '@material-ui/icons/Info';
import { Actions } from 'Constants/permissions';
import { isObjectEmpty, Alert, getUrlParam } from 'Includes/functions';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls';
import { numberRegex } from 'Constants/regularExpression';
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";
import './styles.scss'
import commonMessages from 'Constants/messages'
import { FormattedMessage } from 'react-intl';
import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import { cloneDeep } from 'lodash';

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}
const exam_config = JSON.parse(localStorage.getItem('exam_configurations')) ? JSON.parse(localStorage.getItem('exam_configurations')) : {}
const is_grade_plan = exam_config['grade_plan'] == 1 ? true : false;

class TermResultConfiguration extends Component {
    constructor(props) {
        super(props)

        this.state = {
            open: false,
            alertData: '',
            blank: true,
            loadingExam: false,
            isExpand: false,
            isExpanded: false,
            resultConfigutionDetails: { schedule_data: [], available_exam_list: [], exam_result_configuration: {} },
            blankData: 'Please select academic year, Exam and expect the result',
            fieldError: {},
            searchStudent: '',
            student_list: [],
            subjectList: [],
            selectedExamTestDropdown: [],
            submitDisable: false,
            loading: true,
            gradePlanList: [],
            selectedGradePlan: '',
            alias_names: JSON.parse(localStorage.getItem('alias_name')),
            exam_name: '',
            is_approved: false,
            part_type: {},
            isBlankData: false,
            blankData: ''
        }
    }

    async componentDidMount() {
        let { selectedStandard, selectedExam, selectedTerm, selectedYear, year_name, term_name, exam_name, standard_section_id, standard_name, section_name } = getUrlParam()
        this.setState({
            selectedStandard,
            selectedTerm,
            selectedYear,
            standard_section_id,
            standard_name,
            section_name,
            year_name,
            term_name,
            exam_name,
            selectedExam,
            is_enable_disable_test: false
        }, () => {
            this.getExamConfigDetails()
        })
    }

    getExamConfigDetails = async (finalizeName) => {
        let { selectedExam, standard_section_id } = this.state;
        try {
            const param = { is_active: true, standard_section: standard_section_id, exam: selectedExam }
            let props = { ...this.props };
            props['return_error_message'] = true
            const res = await Promise.all([
                getRequest(GET_URL.examresultconfigindividual.api, param, props),
                is_grade_plan ? getRequest(GET_URL.studentgrade.api, { is_active: true }, this.props) : '',
            ]);
            this.getResultConfiguration(res[0], finalizeName)
            if (is_grade_plan) {
                this.getGradePlanList(res[1])
                this.setState({
                    selectedGradePlan: res[0].data?.data?.configuration_data?.grade_plan
                })
            }
        } catch {
            throw Error("Promise failed");
        }
    }

    getGradePlanList = (response) => {
        if (response && response.status === 200) {
            this.setState({
                gradePlanList: response.data.data
            })
        }
    }

    getAliasLanguage = (sequence) => {
        let return_value
        let { alias_names } = this.state;
        if (sequence == 1) {
            return_value = alias_names['first_language']
        }
        else if (sequence == 2) {
            return_value = alias_names['second_language']
        }
        else if (sequence == 3) {
            return_value = alias_names['third_language']
        }
        return return_value
    }

    scroll = () => {
        window.scrollTo(0, 0);
    }

    getResultConfiguration = (response, finalizeName) => {
        let { alias_names } = this.state;
        if (response && response.status === 200) {
            let response_data = response.data.data
            let part_type = {}
            response_data.part_type_list.map((data) => {
                part_type[data['id']] = { list: [], id: data['id'], name: data['name'] }
            })
            let cumulative_list = []
            let updated_cumulative_list = [
                {
                    id: 'written', value: 'written', label: alias_names['written'], name: alias_names['written'],
                    selected_ids: [], cumulative_type: []
                }
            ]
            let temp_cum = ''
            response_data.cumulative_data.map((data) => {
                temp_cum = ''
                data.value = data.id
                data.label = this.getCumulativeNames(data.cumulative_type_data)
                data.name = this.getCumulativeNames(data.cumulative_type_data)
                temp_cum = data.cumulative_type.join()
                if (cumulative_list.includes(temp_cum)) {
                    updated_cumulative_list.map((updated_data) => {
                        if (updated_data?.cumulative_type.join() === temp_cum) {
                            updated_data.selected_ids.push(data.id)
                        }
                    })
                }
                else {
                    data.selected_ids = [data.id]
                    cumulative_list.push(temp_cum)
                    updated_cumulative_list.push(data)
                }
            })

            response_data.schedule_data.map((subject, subIndex) => {
                Object.keys(part_type).map((part_key) => {
                    if (subject?.subject_part_type_id == part_key && !part_type[part_key].list.includes(subject.subject)) {
                        part_type[part_key].list.push(subject.subject)
                    }
                })
                if (!subject.configuration_data) {
                    subject.configured_max_marks = ''
                    subject.configured_min_marks = ''
                }
                subject.cumulative_mapping['written'] = { max_marks: subject.max_marks, min_marks: subject.min_marks }
                if (subject.configuration_data) {
                    subject.cumulative_mapping['written']['configured_marks'] = subject.configuration_data.configured_marks
                    subject['configured_min_marks'] = subject.configuration_data.configured_min_marks
                    subject.cumulative_mapping['written']['schedule_id'] = subject.configuration_data.id
                }
                updated_cumulative_list.map((updated_data) => {
                    Object.keys(subject.cumulative_mapping).map((cum_key) => {
                        if (updated_data?.selected_ids.includes(parseInt(cum_key))) {
                            subject.cumulative_mapping[updated_data.id] = subject.cumulative_mapping[cum_key]
                            subject.cumulative_mapping[updated_data.id].is_disabled = subject.cumulative_mapping[cum_key]?.cumulative_data?.is_disabled ?? false
                            if (subject.cumulative_mapping[cum_key].cumulative_data) {
                                subject.cumulative_mapping[cum_key].configured_marks = subject.cumulative_mapping[cum_key].cumulative_data.configured_marks
                            }
                            delete subject.cumulative_mapping[subject.cumulative_mapping[cum_key]]
                        }
                    })
                })
            })
            response_data.cumulative_data = [...updated_cumulative_list]
            response_data['exam_result_configuration'] = response_data.configuration_data
            Object.keys(part_type).map((part_key) => {
                if (part_type[part_key].list.length === 0) {
                    delete part_type[part_key]
                }
            })
            this.setState({
                resultConfigutionDetails: response_data,
                all_student_list: response_data.subject_list,
                selectedExamTestDropdown: updated_cumulative_list,
                loadingExam: false,
                blank: false,
                loading: false,
                part_type,
                is_approved: response_data.configuration_data.approval_status == 1 ? true : false
            }, () => {
                response_data.schedule_data.map((subject, subIndex) => {
                    subject.configured_max_marks = this.getSubjectTotal(subIndex)
                })
                if (finalizeName === 'finalize') {
                    this.finalizeMarks()
                }
            })
        }
        else {
            this.setState({
                resultConfigutionDetails: {},
                loadingExam: false,
                blankData: response,
                isBlankData: true,
                loading: false,
            })
        }
    }

    getCumulativeNames = (data_list) => {
        let return_data = []
        data_list.map((data) => {
            return_data.push(data?.['alias'] ?? data['name'])
        })
        return return_data.join(', ')
    }

    handleClose = () => {
        this.setState({
            open: false
        })
    }


    handleChange = (e, subIndex, id) => {
        let { resultConfigutionDetails, fieldError } = this.state;
        let { name, value } = e.target;
        delete fieldError[`${name}${subIndex}${id}`]
        resultConfigutionDetails.schedule_data[subIndex]['cumulative_mapping'][id][name] = value
        resultConfigutionDetails.schedule_data[subIndex]['configured_marks'] = value
        if ((!numberRegex.value.test(value) && value) || parseInt(value) > 200) {
            if (parseInt(value) > 200) {
                fieldError[`${name}${subIndex}${id}`] = 'Enter equal to or below 200'
            }
            else {
                fieldError[`${name}${subIndex}${id}`] = numberRegex.errorText

            }
            this.setState({
                fieldError,
            })
            return
        }
        else {
            resultConfigutionDetails.schedule_data[subIndex]['configured_min_marks'] = ''
            resultConfigutionDetails.schedule_data[subIndex]['configured_max_marks'] = this.getSubjectTotal(subIndex)
            this.setState({
                resultConfigutionDetails,
                fieldError
            })
        }
    }

    updatedResultConfiguration = () => {
        let { resultConfigutionDetails } = this.state;
        resultConfigutionDetails.schedule_data.map((result, index) => {
            result['configured_max_marks'] = this.getSubjectTotal(index)
            result['configured_min_marks'] = this.getSubjectTotal(index) === 0 ? '' : result['configured_min_marks']
        })
        this.setState({
            resultConfigutionDetails,
            selectedExamTestDropdown: cloneDeep(resultConfigutionDetails.cumulative_data)
        })
    }

    handleChangeDisable = (e, subIndex, examTestIndex, id) => {
        let { resultConfigutionDetails, fieldError } = this.state;
        let { name } = e.target;
        delete fieldError[`${name}${subIndex}${examTestIndex}`]
        const updated_value = resultConfigutionDetails.schedule_data[subIndex]['cumulative_mapping'][id][name] ? false : true
        if (resultConfigutionDetails.schedule_data[subIndex]['cumulative_mapping'][id]) {
            resultConfigutionDetails.schedule_data[subIndex]['cumulative_mapping'][id][name] = updated_value
        }
        if (updated_value) {
            let select_all = {}
            resultConfigutionDetails.schedule_data.map((subject, subIndex) => {
                Object.keys(subject.cumulative_mapping).map((exam) => {
                    if (!(exam in select_all)) {
                        select_all[exam] = true
                    }
                    subject.cumulative_mapping[exam].is_disabled = subject.cumulative_mapping[exam]?.is_disabled ?? false
                    if (('is_disabled' in subject.cumulative_mapping[exam]) && !subject.cumulative_mapping[exam]?.is_disabled) {
                        if (exam in select_all) {
                            select_all[exam] = false
                        }
                    }
                })
            })
            resultConfigutionDetails.cumulative_data.map((data) => {
                data.is_disabled = select_all?.[data['id']] ?? false
            })
        }
        else {
            resultConfigutionDetails.cumulative_data[examTestIndex]['is_disabled'] = updated_value
        }
        this.setState({
            resultConfigutionDetails,
            fieldError
        }, () => {
            resultConfigutionDetails.schedule_data[subIndex]['configured_max_marks'] = this.getSubjectTotal(subIndex)
            resultConfigutionDetails.schedule_data[subIndex]['configured_min_marks'] = this.getSubjectTotal(subIndex) === 0 ? '' : resultConfigutionDetails.schedule_data[subIndex]['configured_min_marks']
            this.setState({
                resultConfigutionDetails
            })
        })
    }

    handleSubjectChange = (e, subIndex) => {
        let { resultConfigutionDetails, fieldError } = this.state;
        let { name, value } = e.target;
        delete fieldError[`${name}${subIndex}`]
        resultConfigutionDetails.schedule_data[subIndex]['configured_max_marks'] = this.getSubjectTotal(subIndex)
        resultConfigutionDetails.schedule_data[subIndex][name] = value
        this.setState({
            resultConfigutionDetails,
            fieldError,
        })
    }

    onBlurMinMarkValidation = (subIndex) => {
        let { resultConfigutionDetails, fieldError } = this.state;
        let configured_min_marks = resultConfigutionDetails.schedule_data[subIndex]['configured_min_marks']
        let configured_max_marks = resultConfigutionDetails.schedule_data[subIndex]['configured_max_marks']
        if (parseFloat(configured_max_marks) >= parseFloat(configured_min_marks)) {
            delete fieldError[`configured_min_marks${subIndex}`]
        }
        else {
            fieldError[`configured_min_marks${subIndex}`] = `Enter Below ${configured_max_marks}`
        }
        this.setState({
            fieldError,
        })
    }


    handleFilter = (e) => {
        let { name, value, filterList } = e.target;
        let { resultConfigutionDetails, all_student_list } = this.state;
        if (value !== '') {
            let lowerCasedFilter = value.toLowerCase().replace(/\s+/g, "");
            filterList = all_student_list.filter(item => {
                return Object.keys(item).some(key =>
                    typeof (item[key]) === "string" && item[key].toLowerCase().replace(/\s+/g, "").includes(lowerCasedFilter)
                );
            });
            resultConfigutionDetails.student_list = filterList
        }
        else {
            resultConfigutionDetails.student_list = [...all_student_list]
            filterList = []
        }
        this.setState({
            [name]: value,
            resultConfigutionDetails,
            filterList
        })
    }

    onchangeSubject = (e) => {
        this.setState({
            selectedExamTestDropdown: e
        })
    }

    onChange = (e) => {
        let { name, value } = e.target;
        let { fieldError } = this.state;
        delete fieldError[name]
        this.setState({
            [name]: value,
            fieldError
        })
    }

    validationAndPostData = (isFinalize) => {
        let { fieldError, resultConfigutionDetails, selectedExamTestDropdown, alertData, open,
            standard_section_id, selectedGradePlan, selectedExam } = this.state;
        resultConfigutionDetails.exam_result_configuration['exam'] = selectedExam
        resultConfigutionDetails.exam_result_configuration['standard_section'] = standard_section_id
        resultConfigutionDetails.exam_result_configuration['grade_plan'] = selectedGradePlan
        resultConfigutionDetails.cumulative_data.map((parent) => {
            parent.is_disabled = true
            selectedExamTestDropdown.map((child) => {
                if (child.id == parent.id) {
                    parent.is_disabled = false
                }
            })
        })
        let validate = true
        fieldError = {}
        if (!selectedGradePlan) {
            validate = false
            fieldError['selectedGradePlan'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />;
        }
        let student_data = []
        let subject_temp = {}
        let exam_test_temp = {}
        let examTestIndexTemp = ''
        let subject_config_is_present = false
        if (selectedExamTestDropdown.length !== 0) {
            resultConfigutionDetails.schedule_data.map((subject, stIndex) => {
                if ((subject.configured_min_marks && parseFloat(subject.configured_max_marks) >= (parseFloat(subject.configured_min_marks))) || !subject.configured_min_marks) {
                    subject_temp = { cumulative_data: [] }
                    subject_temp['subject'] = subject.subject
                    subject_temp['configured_marks'] = subject.cumulative_mapping['written']['configured_marks'] ? parseInt(subject.cumulative_mapping['written']['configured_marks']) : null
                    subject_temp['configured_min_marks'] = subject.configured_min_marks ? parseInt(subject.configured_min_marks) : null
                    if (subject.cumulative_mapping['written'].schedule_id) {
                        subject_temp['id'] = subject.cumulative_mapping['written'].schedule_id
                    }
                    subject_config_is_present = false
                    resultConfigutionDetails.cumulative_data.map((sub, subIndex) => {
                        exam_test_temp = {}
                        Object.keys(subject.cumulative_mapping).map((exam_test, examTestIndex) => {
                            if (subject.cumulative_mapping[sub.id] && !subject.cumulative_mapping[sub.id].is_disabled && !sub.is_disabled) {
                                exam_test_temp['schedule_cumulative'] = subject.cumulative_mapping[sub.id].id
                                exam_test_temp['configured_marks'] = parseFloat(subject.cumulative_mapping[sub.id].configured_marks)
                                exam_test_temp['is_disabled'] = 0
                            }
                            if (subject.cumulative_mapping[sub.id] && (sub.is_disabled || subject.cumulative_mapping[sub.id].is_disabled)) {
                                exam_test_temp['schedule_cumulative'] = subject.cumulative_mapping[sub.id].id
                                exam_test_temp['is_disabled'] = 1
                                exam_test_temp['configured_marks'] = 0
                            }
                            if (subject.cumulative_mapping?.[sub.id]?.cumulative_data) {
                                exam_test_temp['id'] = subject.cumulative_mapping[sub.id]?.cumulative_data.id
                            }
                            if (subject.cumulative_mapping[sub.id] && !subject.cumulative_mapping[sub.id].is_disabled && !subject.cumulative_mapping[sub.id].configured_marks) {
                                validate = false
                                fieldError[`configured_marks${stIndex}${sub.id}`] = 'Enter equal to or below 200'
                            }
                            examTestIndexTemp = examTestIndex
                        })
                        if (subject.cumulative_mapping[sub.id] && (subject.cumulative_mapping[sub.id].configured_marks || sub.is_disabled || subject.cumulative_mapping[sub.id].is_disabled)) {
                            if (parseInt(subject.cumulative_mapping[sub.id].configured_marks) > 200) {
                                validate = false
                                fieldError[`configured_marks${subIndex}${examTestIndexTemp}`] = 'Enter equal to or below 200'
                            }
                            else {
                                subject_config_is_present = true
                                if (!isObjectEmpty(exam_test_temp) && exam_test_temp.schedule_cumulative) {
                                    subject_temp['cumulative_data'].push(exam_test_temp)
                                }
                            }
                        }
                    })
                }
                else if (subject.configured_max_marks && subject.configured_min_marks) {
                    validate = false
                    alertData = `Enter Below ${subject.configured_max_marks} in ${subject.subject_name}`
                    fieldError[`configured_min_marks${stIndex}`] = `Enter Below ${subject.configured_max_marks}`
                    subject_config_is_present = true
                }
                if (subject_config_is_present || isFinalize) {
                    if (!subject.configured_min_marks && this.getSubjectTotal(stIndex) !== '') {
                        validate = false
                        fieldError[`configured_min_marks${stIndex}`] = `Enter min marks`
                    }
                    else if (this.getSubjectTotal(stIndex) !== '' && parseInt(subject.configured_min_marks) > parseInt(subject.configured_max_marks)) {
                        validate = false
                        fieldError[`configured_min_marks${stIndex}`] = `Enter Below ${subject.configured_max_marks}`
                    }
                    else {
                        if (this.getSubjectTotal(stIndex) === '') {
                            subject_temp['is_disabled'] = 1
                        }
                        student_data.push(subject_temp)
                    }
                }
            })
        }
        else {
            validate = false
            alertData = 'clear errors'
        }
        if (!validate) {
            open = true
            alertData = 'clear errors'
            this.setState({
                open,
                alertData,
                fieldError
            })
        }
        else {
            let return_data = {
                exam_result_configuration: resultConfigutionDetails.exam_result_configuration,
                exam_result_subject_config: student_data
            }
            validate = { result_config_list: [return_data] }
        }
        return validate
    }

    submitMarks = (value) => {
        this.updatedResultConfiguration()
        let post_data = this.validationAndPostData()
        if (post_data) {
            this.setState({ submitDisable: true })
            let url = POST_URL.examresultconfig.api;
            postRequest(url, post_data, this.props).then((response) => {
                if (response && response.status === 200) {
                    if (value === 'finalize') {
                        this.getExamConfigDetails('finalize')
                    }
                    else {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: 'Your Data has been saved',
                            showConfirmButton: false,
                            timer: 1500
                        })
                        this.goToViewPage()
                    }
                }
                this.setState({ submitDisable: false })
            });
        }
    }

    finalizeMarks = () => {
        let validate = this.validationAndPostData(true)
        if (validate) {
            const { resultConfigutionDetails } = this.state;
            let post_data = {
                result_configuration_ids: [resultConfigutionDetails.configuration_data.id]
            }
            this.setState({ submitDisable: true })
            let url = POST_URL.approveexamresultconfig.api
            postRequest(url, post_data, this.props).then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: 'Your Data has been saved',
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.goToViewPage()
                }
                else {
                    this.setState({
                        open: true,
                        alertData: 'Please clear the errors'
                    })
                }
                this.setState({ submitDisable: false })
            })
        }
    }


    goToViewPage = () => {
        const { selectedTerm, selectedYear, selectedExam } = this.state;
        let sectionInformation = {
            'selectedTerm': selectedTerm,
            'selectedYear': selectedYear,
            'selectedExam': selectedExam
        }
        let searchParam = "?" + new URLSearchParams(sectionInformation).toString()
        this.props.history.push({
            pathname: Actions.result_config.view.url,
            search: searchParam,
        });
    }

    getSubjectTotal = (subIndex) => {
        let { resultConfigutionDetails } = this.state;
        let total = ''
        let subject = resultConfigutionDetails.schedule_data[subIndex]
        if (!_.isEmpty(subject.cumulative_mapping)) {
            Object.keys(subject.cumulative_mapping).map((exam_test) => {
                if (resultConfigutionDetails.cumulative_data.some(key => key.value == exam_test)) {
                    if (total === '' && !subject.cumulative_mapping[exam_test]['is_disabled']) {
                        total = 0
                    }
                    if (subject.cumulative_mapping[exam_test].configured_marks) {
                        if (!subject.cumulative_mapping[exam_test]['is_disabled']) {
                            total = parseFloat(total) + parseFloat(subject.cumulative_mapping[exam_test].configured_marks)
                        }
                    }
                }
            })
        }
        return total
    }

    handleEnableDisableTest = () => {
        let { is_enable_disable_test } = this.state;
        this.setState({ is_enable_disable_test: !is_enable_disable_test })
    }

    submitAndFinalize = () => {
        return Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to change marks!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, Finalize it!'
        }).then(async (result) => {
            if (result.value) {
                this.submitMarks('finalize')
            }
        });
    }

    handleSelectAllTest = (e, index, exam_id) => {
        let { resultConfigutionDetails } = this.state;
        let updated_value = resultConfigutionDetails.cumulative_data[index]?.is_disabled ? 0 : 1
        resultConfigutionDetails.schedule_data.map((data) => {
            if (data.cumulative_mapping[exam_id]) {
                data.cumulative_mapping[exam_id]['is_disabled'] = updated_value
            }
        })
        resultConfigutionDetails.cumulative_data[index].is_disabled = updated_value
        this.setState({
            resultConfigutionDetails
        })
    }

    getSubjectFormat = (part) => {
        let { fieldError, resultConfigutionDetails, selectedExamTestDropdown, is_approved,
            is_enable_disable_test, part_type } = this.state;
        return (
            <TableBody className='selectable-row-table-body'>
                {Object.keys(part_type).length > 1 &&
                    <TableRow className={is_enable_disable_test ? 'height-37px' : 'height-35px'}>
                        <TableCell className='mark-add-table-cell padding-y-zero  text-bold fs-18 ' component='th' scope='row'>
                            <div className='text-blue'>
                                {part_type[part]['name']}
                            </div>
                        </TableCell>
                    </TableRow>
                }
                {resultConfigutionDetails.schedule_data.map((subject, subIndex) => {
                    return (
                        <>
                            {part_type[part].list.includes(subject.subject) && !subject.hidden &&
                                <TableRow className='selectable-row-table-row'>
                                    <TableCell className='mark-add-table-cell padding-y-zero ' component='th' scope='row'>
                                        {subject.subject_name}
                                    </TableCell>
                                    {resultConfigutionDetails.cumulative_data.map((exam_test, examTestIndex) => {
                                        return (selectedExamTestDropdown.some(key => key.value === exam_test.id) &&
                                            <TableCell className='mark-add-table-cell padding-y-zero' component='th' scope='row' align='center'>
                                                <TableRow
                                                    className={is_enable_disable_test ? 'height-36px' : 'height-34px'}
                                                >
                                                    <TableCell className='mark-add-table-cell padding-y-zero' component='th' scope='row'>
                                                        {(subject.cumulative_mapping[exam_test.id]) &&
                                                            <Box className='width-50-px text-align-center'>
                                                                {subject.cumulative_mapping[exam_test.id].max_marks}
                                                            </Box>
                                                        }
                                                        {!subject.cumulative_mapping[exam_test.id] &&
                                                            <Tooltip title='Exam marks not entered in schedule'
                                                                enterDelay={400}
                                                                enterNextDelay={400} placement='top-start'
                                                                classes={{ tooltip: 'tooltip-show-data' }}>
                                                                <Box className='width-50-px text-align-center'> <InfoIcon className='time-table-info-icon cursor-pointer' /></Box>
                                                            </Tooltip>
                                                        }
                                                    </TableCell>
                                                    <TableCell className='mark-add-table-cell padding-y-zero' component='th' scope='row' align='center'>
                                                        {!is_enable_disable_test && subject.cumulative_mapping[exam_test.id] && !subject.cumulative_mapping[exam_test.id]?.is_disabled &&
                                                            <>
                                                                {is_approved &&
                                                                    <Box className='width-50-px marks-view-entered'>
                                                                        {subject.cumulative_mapping[exam_test.id].configured_marks}
                                                                    </Box>
                                                                }
                                                                {!is_approved &&
                                                                    <TextField
                                                                        id="number"
                                                                        label=""
                                                                        type="text"
                                                                        name='configured_marks'
                                                                        autoComplete="off"
                                                                        value={subject.cumulative_mapping?.[exam_test.id] ? subject.cumulative_mapping[exam_test.id].configured_marks : ''}
                                                                        className={'result-config-text'}
                                                                        onChange={(e) => this.handleChange(e, subIndex, exam_test.id)}
                                                                        defaultValue=""
                                                                        InputLabelProps={{
                                                                            shrink: true,
                                                                        }}
                                                                        InputProps={{
                                                                            max: 200,
                                                                            min: 0,
                                                                            maxLength: 4,
                                                                            endAdornment: (
                                                                                fieldError[`configured_marks${subIndex}${exam_test.id}`] ?
                                                                                    <Tooltip title={fieldError[`configured_marks${subIndex}${exam_test.id}`]}
                                                                                        enterDelay={400}
                                                                                        enterNextDelay={400} placement='top-start'
                                                                                        classes={{ tooltip: 'tooltip-show-data' }}>
                                                                                        <InfoIcon className='time-table-info-icon cursor-pointer' />
                                                                                    </Tooltip>
                                                                                    : ''
                                                                            )
                                                                        }}
                                                                        // helperText={(!fieldError[`configured_marks${subIndex}${exam_test.id}`]) ? '' : fieldError[`configured_marks${subIndex}${exam_test.id}`]}
                                                                        error={fieldError[`configured_marks${subIndex}${exam_test.id}`] && (fieldError[`configured_marks${subIndex}${exam_test.id}`] ? true : false)}
                                                                    />
                                                                }
                                                            </>
                                                        }
                                                        {!is_enable_disable_test && subject?.cumulative_mapping?.[exam_test.id] && !!subject?.cumulative_mapping?.[exam_test.id]?.is_disabled &&
                                                            <Tooltip title='Disabled'
                                                                enterDelay={400}
                                                                enterNextDelay={400} placement='top-start'
                                                                classes={{ tooltip: 'tooltip-show-data' }}>
                                                                <Box className='display-flex text-align-center'>
                                                                    <InfoIcon className='time-table-info-icon cursor-pointer' />
                                                                </Box>
                                                            </Tooltip>
                                                        }
                                                        {is_enable_disable_test && subject.cumulative_mapping?.[exam_test.id] &&
                                                            <Box class="exam-mark-checkbox padding-y-zero">
                                                                <input type="checkbox" id={`${subIndex}${examTestIndex}`}
                                                                    name='is_disabled'
                                                                    checked={(subject.cumulative_mapping[exam_test.id] && subject.cumulative_mapping[exam_test.id].is_disabled)}
                                                                    value={(subject.cumulative_mapping[exam_test.id] && subject.cumulative_mapping[exam_test.id].is_disabled)}
                                                                    onChange={(e) => this.handleChangeDisable(e, subIndex, examTestIndex, exam_test.id)}
                                                                />
                                                                <label for={`${subIndex}${examTestIndex}`}><span></span></label>
                                                            </Box>
                                                        }
                                                    </TableCell>
                                                </TableRow>
                                            </TableCell>
                                        )
                                    })}
                                </TableRow>
                            }

                        </>
                    )
                })}
                {
                    resultConfigutionDetails.schedule_data.length === 0 && (
                        <tr className="text-center font-weight-bold">
                            No Data Found
                        </tr>
                    )
                }
            </TableBody>

        )
    }

    getTotalFormat = (part) => {
        const { fieldError, resultConfigutionDetails, is_enable_disable_test, part_type, is_approved } = this.state;
        return (
            <TableBody className='selectable-row-table-body'>
                {Object.keys(part_type).length > 1 &&
                    <TableRow className={is_enable_disable_test ? 'height-37px' : 'height-35px'}>
                        <TableCell className='mark-add-table-cell'>{` `}</TableCell>
                    </TableRow>
                }
                {resultConfigutionDetails.schedule_data.map((subject, subIndex) => {
                    return (
                        <>
                            {part_type[part].list.includes(subject.subject) && !subject.hidden &&
                                <TableRow className={is_enable_disable_test ? 'height-37px' : 'height-35px'}>
                                    <TableCell className='mark-add-table-cell'></TableCell>
                                    <TableCell className='mark-add-table-cell' component='th' scope='row'>
                                        <Box className='marks-view-entered'>
                                            {subject.configured_max_marks}
                                        </Box>
                                    </TableCell>
                                    <TableCell className='mark-add-table-cell padding-y-zero' component='th' scope='row' align='center'>
                                        {is_approved ?
                                            <Box className='marks-view-entered'>
                                                {subject.configured_min_marks}
                                            </Box>
                                            :
                                            this.getSubjectTotal(subIndex) !== '' &&
                                            <TextField
                                                id="number"
                                                label=""
                                                type="text"
                                                name='configured_min_marks'
                                                autoComplete="off"
                                                value={subject.configured_min_marks}
                                                className={'result-config-text '}
                                                onChange={(e) => this.handleSubjectChange(e, subIndex)}
                                                onBlur={() => this.onBlurMinMarkValidation(subIndex)}
                                                disabled={this.getSubjectTotal(subIndex) ? false : true}
                                                defaultValue=""
                                                InputLabelProps={{
                                                    shrink: true,
                                                }}
                                                InputProps={{
                                                    max: 200,
                                                    min: 0,
                                                    maxLength: 4,
                                                    endAdornment: (
                                                        fieldError[`configured_min_marks${subIndex}`] ?
                                                            <Tooltip title={fieldError[`configured_min_marks${subIndex}`]}
                                                                enterDelay={400}
                                                                enterNextDelay={400} placement='top-start'
                                                                classes={{ tooltip: 'tooltip-show-data' }}>
                                                                <InfoIcon className='time-table-info-icon cursor-pointer' />
                                                            </Tooltip>
                                                            : ''
                                                    )
                                                }}
                                                // helperText={(!fieldError[`configured_min_marks${subIndex}`]) ? '' : fieldError[`configured_min_marks${subIndex}`]}
                                                error={fieldError[`configured_min_marks${subIndex}`] && (fieldError[`configured_min_marks${subIndex}`] ? true : false)}
                                            />
                                        }
                                    </TableCell>
                                </TableRow>
                            }

                        </>
                    )
                })}
                {
                    resultConfigutionDetails.schedule_data.length === 0 && (
                        <tr className="text-center font-weight-bold">
                            No Data Found
                        </tr>
                    )
                }
            </TableBody>
        )
    }

    render() {
        let { open, alertData, fieldError, resultConfigutionDetails, loading, selectedExamTestDropdown, submitDisable, year_name,
            term_name, standard_name, is_enable_disable_test, section_name, gradePlanList, selectedGradePlan, exam_name,
            is_approved, part_type, isBlankData, blankData } = this.state;
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <Paper className='paper-background'>
                    <Grid container>
                        <Grid item md={6} xs={12} className='header-align'>
                            <Box className='heading'>
                                Result Configuration
                            </Box>
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Box className='header-align end-flex-prop'>
                                <Button
                                    variant="contained"
                                    onClick={this.goToViewPage}
                                    className='editbutton-view'
                                ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.result_config.view.label}</Button>
                            </Box>
                        </Grid>
                    </Grid>
                    <Box className='md-down-justify-start md-up-justify-start mb-y-20'>
                        <Box className="year-std-box mr-40">
                            <Box className="academic-std-head"> Academic Year</Box>
                            <Box className=" exam-mark-add-heading-bg">{year_name}</Box>
                            <Box className="exam-mark-heading-box"> Term</Box>
                            <Box className=" exam-mark-add-heading-bg">{term_name}</Box>
                            <Box className="exam-mark-heading-box"> Exam</Box>
                            <Box className=" exam-mark-add-heading-bg">{exam_name}</Box>
                            <Box className="exam-mark-heading-box">{`${alias_names['standard']}`}</Box>
                            <Box className=" exam-mark-add-heading-bg">{standard_name}</Box>
                            <Box className=" exam-mark-add-heading-bg">{section_name}</Box>
                        </Box>
                    </Box>
                    {!isBlankData &&
                        <Grid container className='header-align'>
                            <Grid item md={4} xs={12} className='margin-top-10'>
                                <MultipleSelectDropdown
                                    data_list={resultConfigutionDetails.cumulative_data}
                                    selected_list={selectedExamTestDropdown}
                                    error={false}
                                    label={`Select ${alias_names['cumulative']}`}
                                    onChange={this.onchangeSubject}
                                />
                            </Grid>
                            <Grid item md={4} xs={12} className='margin-top-10'>
                                {is_grade_plan && selectedExamTestDropdown.length > 0 && !is_approved &&
                                    <Dropdown
                                        data={gradePlanList}
                                        name='selectedGradePlan'
                                        className={'width-300px'}
                                        value={selectedGradePlan}
                                        onChange={this.onChange}
                                        label='Grade Plan'
                                        error={fieldError.selectedGradePlan && fieldError.selectedGradePlan}
                                        helperText={fieldError.selectedGradePlan && fieldError.selectedGradePlan}
                                    />
                                }
                                {is_grade_plan && selectedExamTestDropdown.length > 0 && is_approved &&
                                    <Box className="year-std-box mr-40">
                                        <Box className="academic-std-head"> Grade Plan Name</Box>
                                        <Box className=" exam-mark-add-heading-bg">{resultConfigutionDetails?.configuration_data?.grade_plan_name}</Box>
                                    </Box>
                                }
                            </Grid>
                            {selectedExamTestDropdown.length > 0 && (is_approved ?
                                <Grid item md={3} xs={12} className='flex-justify-center margin-top-10 pointer-event-none'>
                                    <Tooltip title={'Marks Approved'} enterDelay={400}
                                        enterNextDelay={400} placement='top-start'
                                        classes={{ tooltip: 'tooltip-show-data' }}>
                                        <Button
                                            className={'exam-enter-marks-button'}
                                            style={{
                                                height: '40px',
                                                alignSelf: 'center'
                                            }}
                                        >
                                            <Box>Marks Approved</Box>
                                        </Button>
                                    </Tooltip>
                                </Grid>
                                :
                                <Grid item md={3} xs={12} className='flex-justify-center margin-top-10'>
                                    <Tooltip title='Enable/Disable Test' enterDelay={400}
                                        enterNextDelay={400} placement='top-start'
                                        classes={{ tooltip: 'tooltip-show-data' }}>
                                        <Button
                                            className={!is_enable_disable_test ? 'exam-mark-absent-button' : 'exam-enter-marks-button'}
                                            onClick={this.handleEnableDisableTest}
                                            style={{
                                                height: '40px',
                                                alignSelf: 'center'
                                            }}
                                        >
                                            {!is_enable_disable_test &&
                                                <Box>Disable Marks</Box>
                                            }
                                            {is_enable_disable_test &&
                                                <Box>Enter Marks</Box>
                                            }
                                        </Button>
                                    </Tooltip>
                                </Grid>)
                            }
                        </Grid>
                    }
                    {selectedExamTestDropdown.length === 0 && !isBlankData &&
                        <BlankPagewithIcon data={`Select ${alias_names['cumulative']} to see the details`} />
                    }
                    {isBlankData &&
                        <BlankPagewithIcon data={blankData} />
                    }
                    {!isBlankData && selectedExamTestDropdown.length > 0 &&
                        <Box display='flex'>
                            <TableContainer className='result-config-bg time-table-create header-align m-b-60px p-b-20px'>
                                <Table size='small' aria-label='simple table' className='exam-mark-row-table'>
                                    <TableHead>
                                        <TableRow className=''>
                                            <TableCell className='selectable-table-head'>Subject</TableCell>
                                            {resultConfigutionDetails.cumulative_data.map((data) => {
                                                return (selectedExamTestDropdown.some(key => key.value === data.id) &&
                                                    <TableCell className='selectable-table-head' align='center'>{data.name}

                                                    </TableCell>
                                                )
                                            })
                                            }
                                        </TableRow>
                                    </TableHead>
                                    <TableHead >
                                        <TableRow className=''>
                                            <TableCell className=''></TableCell>
                                            {resultConfigutionDetails.cumulative_data.map((data, index) => {
                                                return (selectedExamTestDropdown.some(key => key.value === data.id) &&
                                                    <TableCell className='' style={{ padding: '0px' }}>
                                                        <TableHead style={{ lineHeight: '0.2rem' }}>
                                                            <TableCell className='mark-add-table-cell padding-y-zero' component='th' scope='row' align='center'>
                                                                <TableRow className=''>
                                                                    <TableCell className='mark-add-table-cell'>
                                                                        <Box className='width-50-px'>
                                                                            Original
                                                                        </Box>
                                                                    </TableCell>
                                                                    {is_enable_disable_test &&
                                                                        <TableCell className='mark-add-table-cell'>
                                                                            <Tooltip title='Select All Subjects'
                                                                                enterDelay={400}
                                                                                enterNextDelay={400} placement='top-start'
                                                                                classes={{ tooltip: 'tooltip-show-data' }}>
                                                                                <Box class="exam-mark-checkbox padding-y-zero">
                                                                                    <input type="checkbox" id={`cumulative_${index}`}
                                                                                        name='is_disabled'
                                                                                        checked={data?.is_disabled ?? false}
                                                                                        value={data?.is_disabled ?? false}
                                                                                        onChange={(e) => this.handleSelectAllTest(e, index, data.id)}
                                                                                    />
                                                                                    <label for={`cumulative_${index}`}><span></span></label>
                                                                                </Box>
                                                                            </Tooltip>
                                                                        </TableCell>
                                                                    }
                                                                    {!is_enable_disable_test &&
                                                                        <TableCell className='mark-add-table-cell'>Configured</TableCell>
                                                                    }
                                                                </TableRow>
                                                            </TableCell>
                                                        </TableHead>
                                                    </TableCell>
                                                )
                                            })
                                            }
                                        </TableRow>
                                    </TableHead>
                                    {Object.keys(part_type).map((part_key) => {
                                        return (part_type[part_key].list.length > 0 &&
                                            this.getSubjectFormat(part_key)
                                        )
                                    })}
                                </Table>
                            </TableContainer>
                            <TableContainer className='result-config-bg header-align w-auto m-b-60px p-b-20px'>
                                <Table size='small' aria-label='simple table' className='w-auto'>
                                    <TableHead>
                                        <TableRow className=''>
                                            <TableCell ></TableCell>
                                            <TableCell className='selectable-table-head'>Total</TableCell>
                                            <TableCell className='selectable-table-head'>Min Marks</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableHead >
                                        <TableRow className={is_enable_disable_test ? 'height-49px' : 'height-39px'}>
                                            <TableCell></TableCell>
                                            <TableCell className='height-table-cell text-align-center'>Max</TableCell>
                                            <TableCell className='height-table-cell '>Min</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    {Object.keys(part_type).map((part_key) => {
                                        return (part_type[part_key].list.length > 0 &&
                                            this.getTotalFormat(part_key)
                                        )
                                    })
                                    }
                                </Table>
                            </TableContainer>
                        </Box>
                    }
                    {!is_approved && selectedExamTestDropdown.length > 0 &&
                        <Box className="submt-button-float-bottom" mt={3}>
                            <Button
                                className={`submit`}
                                variant="contained"
                                style={{ 'float': 'right' }}
                                disabled={submitDisable}
                                onClick={(e) => this.submitAndFinalize()}>
                                Finalize
                            </Button>
                            <Button
                                className={`submit mr-20`}
                                variant="contained"
                                style={{ 'float': 'right' }}
                                disabled={submitDisable}
                                onClick={(e) => this.submitMarks()}>
                                Submit
                            </Button>
                        </Box>
                    }

                    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={open} autoHideDuration={2000} onClose={this.handleClose}>
                        <Alert onClose={this.handleClose} severity="error">
                            {alertData}
                        </Alert>
                    </Snackbar>
                </Paper>
            )
        }
    }
}
export default withRouter(TermResultConfiguration)
