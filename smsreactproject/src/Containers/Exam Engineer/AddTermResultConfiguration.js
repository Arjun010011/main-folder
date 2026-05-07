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

import InfoIcon from '@material-ui/icons/Info';
import { Actions } from 'Constants/permissions';
import { isObjectEmpty, Alert, getUrlParam } from 'Includes/functions';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls';
import { numberRegex } from 'Constants/regularExpression';
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";
import './styles.scss'
import BlankPagewithIcon from 'Components/BlankPageWithIcon';

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

class AddTermResultConfiguration extends Component {
    constructor(props) {
        super(props)

        this.state = {
            open: false,
            alertData: '',
            blank: true,
            loadingExam: false,
            isExpand: false,
            isExpanded: false,
            resultConfigutionDetails: { result_data: [], available_exam_list: [] },
            blankData: 'Please select academic year, Exam and expect the result',
            fieldError: {},
            searchStudent: '',
            student_list: [],
            subjectList: [],
            selectedExamTestDropdown: [],
            submitDisable: false,
            loading: true,
            alias_names: JSON.parse(localStorage.getItem('alias_name')),
            part_type: { part1: [], part2: [] }
        }
    }

    async componentDidMount() {
        let { selectedStandard, selectedTerm, selectedYear, year_name, term_name, exam_name, standard_section_id, standard_name, section_name } = getUrlParam()
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
            is_enable_disable_test: false
        }, () => {
            this.getResultConfiguration()
        })
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

    getResultConfiguration = () => {
        let { selectedYear, selectedTerm, standard_section_id, part_type } = this.state;
        part_type = { part1: [], part2: [] }
        const url = GET_URL.individual.api
        const param = { is_active: true, standard_section: standard_section_id, academic_year: selectedYear, term: selectedTerm }
        let props = { ...this.props };
        props['return_error_message'] = true
        getRequest(url, param, props).then(response => {
            if (response && response.status === 200) {
                let select_all = {}
                response.data.data.result_data.map((subject, subIndex) => {
                    if (subject?.subject_part_type === 'part1' && !part_type['part1'].includes(subject.subject) && !part_type['part2'].includes(subject.subject)) {
                        part_type['part1'].push(subject.subject)
                    }
                    else if (subject?.subject_part_type === 'part2' && !part_type['part2'].includes(subject.subject) && !part_type['part1'].includes(subject.subject)) {
                        part_type['part2'].push(subject.subject)
                    }
                    if (subject.configured_max_marks) {
                        Object.keys(subject.exam_test_list).map((exam) => {
                            if (!(exam in select_all)) {
                                select_all[exam] = true
                            }
                            subject.exam_test_list[exam].is_disabled = subject.exam_test_list[exam]?.is_disabled ?? false
                            if (('is_disabled' in subject.exam_test_list[exam]) && !subject.exam_test_list[exam]?.is_disabled) {
                                if (exam in select_all) {
                                    select_all[exam] = false
                                }
                            }
                        })
                    }
                })
                response.data.data.available_exam_list.map((data) => {
                    data.is_disabled = select_all?.[data['id']] ?? false
                    data.value = data.id
                    data.label = data.exam_type__name
                    data.name = data.exam_type__name
                })
                this.setState({
                    resultConfigutionDetails: response.data.data,
                    all_student_list: response.data.data.subject_list,
                    selectedExamTestDropdown: response.data.data.available_exam_list,
                    loadingExam: false,
                    blank: false,
                    loading: false,
                    part_type
                })
            }
            else {
                this.setState({
                    resultConfigutionDetails: {},
                    loadingExam: false,
                    blankData: response,
                    blank: true
                })
            }
        })
    }


    handleClose = () => {
        this.setState({
            open: false
        })
    }


    handleChange = (e, subIndex, examTestIndex, id) => {
        let { resultConfigutionDetails, fieldError } = this.state;
        let { name, value } = e.target;
        delete fieldError[`${name}${subIndex}${examTestIndex}`]
        resultConfigutionDetails.result_data[subIndex]['exam_test_list'][id][name] = value
        resultConfigutionDetails.result_data[subIndex]['configured_min_marks'] = ''
        if ((!numberRegex.value.test(value) && value) || parseInt(value) > 200) {
            if (parseInt(value) > 200) {
                fieldError[`${name}${subIndex}${examTestIndex}`] = 'Enter equal to or below 200'
            }
            else {
                fieldError[`${name}${subIndex}${examTestIndex}`] = numberRegex.errorText

            }
            this.setState({
                fieldError,
            })
            return
        }
        else {
            resultConfigutionDetails.result_data[subIndex]['configured_max_marks'] = this.getSubjectTotal(subIndex)
            resultConfigutionDetails.result_data[subIndex]['configured_min_marks'] = this.getSubjectTotal(subIndex) === 0 ? '' : resultConfigutionDetails.result_data[subIndex]['configured_min_marks']
            this.setState({
                resultConfigutionDetails,
                fieldError
            })
        }
    }

    updatedResultConfiguration = () => {
        let { resultConfigutionDetails } = this.state;
        resultConfigutionDetails.result_data.map((result, index) => {
            result['configured_max_marks'] = this.getSubjectTotal(index)
            result['configured_min_marks'] = this.getSubjectTotal(index) === 0 ? '' : result['configured_min_marks']
        })
        this.setState({
            resultConfigutionDetails
        })
    }

    handleChangeDisable = (e, subIndex, examTestIndex, id) => {
        let { resultConfigutionDetails, fieldError } = this.state;
        let { name } = e.target;
        delete fieldError[`${name}${subIndex}${examTestIndex}`]
        const updated_value = resultConfigutionDetails.result_data[subIndex]['exam_test_list'][id][name] ? 0 : 1
        if (resultConfigutionDetails.result_data[subIndex]['exam_test_list'][id]) {
            resultConfigutionDetails.result_data[subIndex]['exam_test_list'][id][name] = updated_value
        }
        if (!updated_value) {
            resultConfigutionDetails.available_exam_list[examTestIndex]['is_disabled'] = updated_value
        }
        else {
            let select_all = {}
            resultConfigutionDetails.result_data.map((subject, subIndex) => {
                if (subject.configured_max_marks) {
                    Object.keys(subject.exam_test_list).map((exam) => {
                        if (!(exam in select_all)) {
                            select_all[exam] = true
                        }
                        subject.exam_test_list[exam].is_disabled = subject.exam_test_list[exam]?.is_disabled ?? false
                        if (('is_disabled' in subject.exam_test_list[exam]) && !subject.exam_test_list[exam]?.is_disabled) {
                            if (exam in select_all) {
                                select_all[exam] = false
                            }
                        }
                    })
                }
            })
            resultConfigutionDetails.available_exam_list.map((data) => {
                data.is_disabled = select_all?.[data['id']] ?? false
                data.value = data.id
                data.label = data.exam_type__name
                data.name = data.exam_type__name
            })
        }
        this.setState({
            resultConfigutionDetails,
            fieldError
        }, () => {
            resultConfigutionDetails.result_data[subIndex]['configured_max_marks'] = this.getSubjectTotal(subIndex)
            resultConfigutionDetails.result_data[subIndex]['configured_min_marks'] = this.getSubjectTotal(subIndex) === 0 ? '' : resultConfigutionDetails.result_data[subIndex]['configured_min_marks']
            this.setState({
                resultConfigutionDetails
            })
        })
    }

    handleSubjectChange = (e, subIndex) => {
        let { resultConfigutionDetails, fieldError } = this.state;
        let { name, value } = e.target;
        delete fieldError[`${name}${subIndex}`]
        resultConfigutionDetails.result_data[subIndex]['configured_max_marks'] = this.getSubjectTotal(subIndex)
        resultConfigutionDetails.result_data[subIndex][name] = value
        this.setState({
            resultConfigutionDetails,
            fieldError,
        })
    }

    onBlurMinMarkValidation = (subIndex) => {
        let { resultConfigutionDetails, fieldError } = this.state;
        let configured_min_marks = resultConfigutionDetails.result_data[subIndex]['configured_min_marks']
        let configured_max_marks = resultConfigutionDetails.result_data[subIndex]['configured_max_marks']
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

    validationAndPostData = () => {
        let { fieldError, resultConfigutionDetails, selectedExamTestDropdown, selectedTerm, alertData, open, selectedYear, standard_section_id } = this.state;

        resultConfigutionDetails.available_exam_list.map((parent) => {
            parent.is_disabled = true
            selectedExamTestDropdown.map((child) => {
                if (child.id == parent.id) {
                    parent.is_disabled = false
                }
            })
        })
        let validate = true
        fieldError = {}
        let student_data = []
        let subject_temp = {}
        let exam_test_temp = {}
        let examTestIndexTemp = ''
        let subject_config_is_present = false
        if (selectedExamTestDropdown.length !== 0) {
            resultConfigutionDetails.result_data.map((subject, stIndex) => {
                if ((subject.configured_min_marks && parseFloat(subject.configured_max_marks) >= (parseFloat(subject.configured_min_marks))) || !subject.configured_min_marks) {
                    subject_temp = { marks_configuration: [] }
                    subject_temp['subject'] = subject.subject
                    subject_temp['max_marks'] = subject.configured_max_marks ? parseInt(subject.configured_max_marks) : null
                    subject_temp['min_marks'] = subject.configured_min_marks ? parseInt(subject.configured_min_marks) : null
                    subject_config_is_present = false
                    resultConfigutionDetails.available_exam_list.map((sub, subIndex) => {
                        exam_test_temp = {}
                        Object.keys(subject.exam_test_list).map((exam_test, examTestIndex) => {
                            if (subject.exam_test_list[sub.id] && (!subject.exam_test_list[sub.id].is_disabled || !sub.is_disabled)) {
                                exam_test_temp['exam'] = sub.id
                                exam_test_temp['marks'] = parseFloat(subject.exam_test_list[sub.id].configured_marks)
                                exam_test_temp['is_disabled'] = 0
                            }
                            if (subject.exam_test_list[sub.id] && (sub.is_disabled || subject.exam_test_list[sub.id].is_disabled)) {
                                exam_test_temp['exam'] = sub.id
                                exam_test_temp['is_disabled'] = 1
                                exam_test_temp['marks'] = 0
                            }
                            if (subject.exam_test_list[sub.id] && subject.exam_test_list[sub.id].id && !subject.exam_test_list[sub.id].is_disabled) {
                                exam_test_temp['id'] = subject.exam_test_list[sub.id].id
                            }
                            examTestIndexTemp = examTestIndex
                        })
                        if (subject.exam_test_list[sub.id] && (subject.exam_test_list[sub.id].configured_marks || sub.is_disabled || subject.exam_test_list[sub.id].is_disabled)) {
                            if (parseInt(subject.exam_test_list[sub.id].configured_marks) > 200) {
                                validate = false
                                fieldError[`configured_marks${subIndex}${examTestIndexTemp}`] = 'Enter equal to or below 200'
                            }
                            else {
                                subject_config_is_present = true
                                if (!isObjectEmpty(exam_test_temp)) {
                                    subject_temp['marks_configuration'].push(exam_test_temp)
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
                if (subject_config_is_present) {
                    if (!subject.configured_min_marks) {
                        validate = false
                        fieldError[`configured_min_marks${stIndex}`] = `Enter min marks`
                    }
                    else if (parseInt(subject.configured_min_marks) > parseInt(subject.configured_max_marks)) {
                        validate = false
                        fieldError[`configured_min_marks${stIndex}`] = `Enter Below ${subject.configured_max_marks}`
                    }
                    else {
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
                term: selectedTerm,
                academic_year: selectedYear,
                section_list: [{
                    standard_section: standard_section_id,
                    grade_plan: '1',
                    subject_list: student_data
                }]
            }
            if (resultConfigutionDetails.config_id) {
                return_data['id'] = resultConfigutionDetails.config_id
            }
            validate = return_data
        }
        return validate
    }

    submitMarks = () => {
        this.updatedResultConfiguration()
        let post_data = this.validationAndPostData()
        if (post_data) {
            this.setState({ submitDisable: true })
            let url = POST_URL.resultconfiguration.api;
            postRequest(url, post_data, this.props).then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: 'Your Data has been saved',
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.setState({ submitDisable: false })
                    this.goToViewPage()
                }
            });
        }
    }

    goToViewPage = () => {
        const { selectedStandard, selectedTerm, selectedYear } = this.state;
        let sectionInformation = {
            'selectedTerm': selectedTerm,
            'selectedYear': selectedYear,
        }
        let searchParam = "?" + new URLSearchParams(sectionInformation).toString()
        this.props.history.push({
            pathname: Actions.result_config.view.url,
            search: searchParam,
        });
    }

    getSubjectTotal = (subIndex) => {
        let { resultConfigutionDetails } = this.state;
        let total = 0
        let subject = resultConfigutionDetails.result_data[subIndex]
        if (!_.isEmpty(subject.exam_test_list)) {
            Object.keys(subject.exam_test_list).map((exam_test) => {
                if (resultConfigutionDetails.available_exam_list.some(key => key.value == exam_test)) {
                    if (subject.exam_test_list[exam_test].configured_marks && !subject.exam_test_list[exam_test]['is_disabled']) {
                        total = parseFloat(total) + parseFloat(subject.exam_test_list[exam_test].configured_marks)
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

    handleSelectAllTest = (e, index, exam_id) => {
        let { resultConfigutionDetails } = this.state;
        let updated_value = resultConfigutionDetails.available_exam_list[index]?.is_disabled ? 0 : 1
        resultConfigutionDetails.result_data.map((data) => {
            if (data.exam_test_list[exam_id]) {
                data.exam_test_list[exam_id]['is_disabled'] = updated_value
            }
        })
        resultConfigutionDetails.available_exam_list[index].is_disabled = updated_value
        this.setState({
            resultConfigutionDetails
        })
    }

    getSubjectFormat = (part) => {
        let { fieldError, resultConfigutionDetails, selectedExamTestDropdown,
            is_enable_disable_test, part_type } = this.state;
        return (
            <TableBody className='selectable-row-table-body'>
                {part_type['part1'].length > 0 && part_type['part2'].length > 0 &&
                    <TableRow className={is_enable_disable_test ? 'height-37px' : 'height-35px'}>
                        <TableCell className='mark-add-table-cell padding-y-zero  text-bold fs-18 ' component='th' scope='row'>
                            <div className='text-blue'>
                                {part === 'part1' ? 'Part 1' : 'Part 2'}
                            </div>
                        </TableCell>
                    </TableRow>
                }
                {resultConfigutionDetails.result_data.map((subject, subIndex) => {
                    return (
                        <>
                            {part_type[part].includes(subject.subject) && !subject.hidden &&
                                <TableRow className='selectable-row-table-row'>
                                    <TableCell className='mark-add-table-cell padding-y-zero ' component='th' scope='row'>
                                        {subject.subject_name}
                                    </TableCell>
                                    {resultConfigutionDetails.available_exam_list.map((exam_test, examTestIndex) => {
                                        return (selectedExamTestDropdown.some(key => key.value === exam_test.id) &&
                                            <TableCell className='mark-add-table-cell padding-y-zero' component='th' scope='row' align='center'>
                                                <TableRow
                                                    className={is_enable_disable_test ? 'height-36px' : 'height-34px'}
                                                >
                                                    <TableCell className='mark-add-table-cell padding-y-zero' component='th' scope='row'>
                                                        {/* {(subject.exam_test_list[exam_test.id] && ((is_enable_disable_test) || (!is_enable_disable_test && !subject.exam_test_list[exam_test.id].is_disabled))) && */}
                                                        {(subject.exam_test_list[exam_test.id]) &&
                                                            <Box className='width-50-px'>
                                                                {subject.exam_test_list[exam_test.id].max_marks}
                                                            </Box>
                                                        }
                                                        {!subject.exam_test_list[exam_test.id]?.max_marks &&
                                                            <Tooltip title='Subject is not scheduled'
                                                                enterDelay={400}
                                                                enterNextDelay={400} placement='top-start'
                                                                classes={{ tooltip: 'tooltip-show-data' }}>
                                                                <Box className='width-50-px'>
                                                                    <InfoIcon className='time-table-info-icon cursor-pointer' />
                                                                </Box>
                                                            </Tooltip>
                                                        }
                                                    </TableCell>
                                                    <TableCell className='mark-add-table-cell padding-y-zero' component='th' scope='row' align='center'>
                                                        {!is_enable_disable_test && subject.exam_test_list[exam_test.id] && !subject.exam_test_list[exam_test.id].is_disabled &&
                                                            <TextField
                                                                id="number"
                                                                label=""
                                                                type="text"
                                                                name='configured_marks'
                                                                autoComplete="off"
                                                                value={subject.exam_test_list[exam_test.id] ? subject.exam_test_list[exam_test.id].configured_marks : ''}
                                                                className={'result-config-text'}
                                                                onChange={(e) => this.handleChange(e, subIndex, examTestIndex, exam_test.id)}
                                                                defaultValue=""
                                                                InputLabelProps={{
                                                                    shrink: true,
                                                                }}
                                                                InputProps={{
                                                                    max: 200,
                                                                    min: 0,
                                                                    maxLength: 4,
                                                                    endAdornment: (
                                                                        fieldError[`configured_marks${subIndex}${examTestIndex}`] ?
                                                                            <Tooltip title={fieldError[`configured_marks${subIndex}${examTestIndex}`]}
                                                                                enterDelay={400}
                                                                                enterNextDelay={400} placement='top-start'
                                                                                classes={{ tooltip: 'tooltip-show-data' }}>
                                                                                <InfoIcon className='time-table-info-icon cursor-pointer' />
                                                                            </Tooltip>
                                                                            : ''
                                                                    )
                                                                }}
                                                                // helperText={(!fieldError[`configured_marks${subIndex}${examTestIndex}`]) ? '' : fieldError[`configured_marks${subIndex}${examTestIndex}`]}
                                                                error={fieldError[`configured_marks${subIndex}${examTestIndex}`] && (fieldError[`configured_marks${subIndex}${examTestIndex}`] ? true : false)}
                                                            />
                                                        }
                                                        {!is_enable_disable_test && subject.exam_test_list[exam_test.id] && subject.exam_test_list[exam_test.id].is_disabled === 1 &&
                                                            <Box class="">
                                                                <Tooltip title='Disabled'
                                                                    enterDelay={400}
                                                                    enterNextDelay={400} placement='top-start'
                                                                    classes={{ tooltip: 'tooltip-show-data' }}>
                                                                    <Box className=''>
                                                                        <InfoIcon className='time-table-info-icon cursor-pointer' />
                                                                    </Box>
                                                                </Tooltip>
                                                            </Box>
                                                        }
                                                        {is_enable_disable_test && subject.exam_test_list[exam_test.id] &&
                                                            <Box class="exam-mark-checkbox padding-y-zero">
                                                                <input type="checkbox" id={`${subIndex}${examTestIndex}`}
                                                                    name='is_disabled'
                                                                    checked={(subject.exam_test_list[exam_test.id] && subject.exam_test_list[exam_test.id].is_disabled === 1) ? true : false}
                                                                    value={(subject.exam_test_list[exam_test.id] && subject.exam_test_list[exam_test.id].is_disabled === 1) ? true : false}
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
                    resultConfigutionDetails.result_data.length === 0 && (
                        <tr className="text-center font-weight-bold">
                            No Data Found
                        </tr>
                    )
                }
            </TableBody>
        )
    }

    getTotalFormat = (part) => {
        const { fieldError, resultConfigutionDetails, is_enable_disable_test, part_type } = this.state;
        return (
            <TableBody className='selectable-row-table-body'>
                {part_type['part1'].length > 0 && part_type['part2'].length > 0 &&
                    <TableRow className={is_enable_disable_test ? 'height-37px' : 'height-35px'}>
                        <TableCell className='mark-add-table-cell'>{` `}</TableCell>
                    </TableRow>
                }
                {resultConfigutionDetails.result_data.map((subject, subIndex) => {
                    return (
                        <>
                            {part_type[part].includes(subject.subject) && !subject.hidden &&
                                <TableRow
                                    className={is_enable_disable_test ? 'height-37px' : 'height-35px'}>
                                    <TableCell className='mark-add-table-cell padding-y-zero'></TableCell>
                                    <TableCell className='mark-add-table-cell padding-y-zero' component='th' scope='row'>
                                        <Box className=''>
                                            {subject.configured_max_marks}
                                        </Box>
                                    </TableCell>
                                    <TableCell className='mark-add-table-cell padding-y-zero' component='th' scope='row' align='center'>
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
                                    </TableCell>
                                </TableRow>
                            }

                        </>
                    )
                })}
                {
                    resultConfigutionDetails.result_data.length === 0 && (
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
            term_name, standard_name, is_enable_disable_test, section_name, part_type } = this.state;
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
                                Term Result Configuration
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
                            <Box className="exam-mark-heading-box">{`${alias_names['standard']}`}</Box>
                            <Box className=" exam-mark-add-heading-bg">{standard_name}</Box>
                            <Box className=" exam-mark-add-heading-bg">{section_name}</Box>
                        </Box>
                    </Box>

                    <Grid container className='header-align'>
                        <Grid item md={3} xs={12} className='margin-top-10'>
                            <MultipleSelectDropdown
                                data_list={resultConfigutionDetails.available_exam_list}
                                selected_list={selectedExamTestDropdown}
                                error={false}
                                label={'Select Exams'}
                                onChange={this.onchangeSubject}
                            />
                        </Grid>
                        {selectedExamTestDropdown.length > 0 &&
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
                                            <Box>Disable Test</Box>
                                        }
                                        {is_enable_disable_test &&
                                            <Box>Enter Marks</Box>
                                        }
                                    </Button>
                                </Tooltip>
                            </Grid>
                        }
                    </Grid>
                    {selectedExamTestDropdown.length === 0 &&
                        <BlankPagewithIcon data="Select exam to see the details" />
                    }
                    {selectedExamTestDropdown.length > 0 &&
                        <Box display='flex'>
                            <TableContainer className='result-config-bg time-table-create header-align '>
                                <Table size='small' aria-label='simple table' className='exam-mark-row-table'>
                                    <TableHead className='mark-add-table-cell'>
                                        <TableRow className='mark-add-table-cell'>
                                            <TableCell className='selectable-table-head'>Subject</TableCell>
                                            {resultConfigutionDetails.available_exam_list.map((data) => {
                                                return (selectedExamTestDropdown.some(key => key.value === data.id) &&
                                                    <TableCell className='selectable-table-head' align='center'>{data.exam_type__name}

                                                    </TableCell>
                                                )
                                            })
                                            }
                                        </TableRow>
                                    </TableHead>
                                    <TableHead >
                                        <TableRow className=''>
                                            <TableCell className=''></TableCell>
                                            {resultConfigutionDetails.available_exam_list.map((data, index) => {
                                                return (selectedExamTestDropdown.some(key => key.value === data.id) &&
                                                    <TableCell className='' style={{ padding: '0px' }}>
                                                        <TableHead style={{ lineHeight: '0.2rem' }}>
                                                            <TableCell className='mark-add-table-cell padding-y-zero' component='th' scope='row' align='center'>
                                                                <TableRow>
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
                                                                        <TableCell className='mark-add-table-cell pl-0'>Configured</TableCell>
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
                                    {part_type['part1'].length > 0 && this.getSubjectFormat('part1')}
                                    {part_type['part2'].length > 0 && this.getSubjectFormat('part2')}
                                </Table>
                            </TableContainer>
                            <TableContainer className='result-config-bg header-align w-auto'>
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
                                            <TableCell className='height-table-cell'>Max</TableCell>
                                            <TableCell className='height-table-cell'>Min</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    {part_type['part1'].length > 0 && this.getTotalFormat('part1')}
                                    {part_type['part2'].length > 0 && this.getTotalFormat('part2')}

                                </Table>
                            </TableContainer>
                        </Box>
                    }
                    {selectedExamTestDropdown.length > 0 &&
                        <Box className="submt-button-float-bottom" mt={3}>
                            <Button
                                className={`submit`}
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
export default withRouter(AddTermResultConfiguration)
