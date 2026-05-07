import React from 'react'
import {
    Paper, Box, Button, Grid, Tooltip, TextField, TableContainer, Table, TableHead, TableCell, TableRow, TableBody,
} from '@material-ui/core';
import { Dropdown } from 'Components/DropDown';
import { getRequest, postRequest, putRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL, PUT_URL } from 'Includes/urls';
import loadingBar from 'images/loading.gif';
import BlankPagewithIcon from 'Components/BlankPageWithIcon'
import { withRouter } from 'react-router-dom';
import { isObjectEmpty, Alert, getUrlParam } from 'Includes/functions';
import { setAcademicYear } from 'Components/CommonComponent/actions';
import InfoIcon from '@material-ui/icons/Info';
import Snackbar from '@material-ui/core/Snackbar';
import _ from 'lodash';
import { numberRegex } from 'Constants/regularExpression';
import Swal from 'sweetalert2'

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}
const exam_config = JSON.parse(localStorage.getItem('exam_configurations')) ? JSON.parse(localStorage.getItem('exam_configurations')) : {}
const is_grade_plan = exam_config['grade_plan'] == 1 ? true : false;
function FinalWiseFinalResultConfig(props) {
    const { currentTab, gradePlanList } = props

    const [selectedYear, setSelectedYear] = React.useState('');
    const [fieldError, setFieldError] = React.useState({});
    const [loading, setLoading] = React.useState(true);
    const [isBlankPage, setIsBlankPage] = React.useState(false);
    const [blankData, setBlankData] = React.useState('');
    const [marksCardInformation, setMarksCardInformation] = React.useState({});
    const [is_approved, set_is_approved] = React.useState(false);
    const [is_enable_disable_test, set_is_enable_disable_test] = React.useState(false);
    const [submitDisable, setSubmitDisable] = React.useState(false);
    const [openSnackBar, setOpenSnackBar] = React.useState(false);
    const [alertData, setAlertData] = React.useState(false);
    const [selectedExamTestDropdown, setSelectedExamTestDropdown] = React.useState([])
    const [isAddTermOpen, setIsAddTermOpen] = React.useState(false)
    const [part_type, set_part_type] = React.useState({})
    const [selectedGradePlan, setSelectedGradePlan] = React.useState('');
    const [standardSectionId, setStandardSectionId] = React.useState('');
    const [isModified, setIsModified] = React.useState(false);


    React.useEffect(() => {
        getResultConfiguration()
    }, []);

    const getResultConfiguration = () => {
        let { selectedYear, standard_section_id } = getUrlParam()
        const url = GET_URL.examfinalresultconfigurationindividual.api
        const param = { is_active: true, standard_section: standard_section_id, academic_year: selectedYear }
        let prop = { ...props };
        prop['return_error_message'] = true
        getRequest(url, param, prop).then(response => {
            if (response && response.status === 200) {
                if (response.data.data?.result_data && response.data.data?.result_data.length > 0 && response.data.data?.available_term_list.length > 0) {
                    let part_type_temp = {}
                    response.data.data.part_type_list.map((data) => {
                        part_type_temp[data['id']] = { list: [], id: data['id'], name: data['name'] }
                    })
                    response.data.data.available_term_list.map((data) => {
                        data.value = data.id
                        data.label = data.name
                        data.name = data.name
                    })
                    response.data.data.result_data.map((subject, subIndex) => {
                        subject.configured_max_marks = subject?.subject_max_marks ?? ''
                        subject.configured_min_marks = subject?.subject_min_marks ?? ''
                        Object.keys(part_type_temp).map((part_key) => {
                            if (subject.subject_part_type_id == part_key && !part_type_temp[part_key].list.includes(subject.subject)) {
                                part_type_temp[part_key].list.push(subject.subject)
                            }
                        })
                    })
                    Object.keys(part_type_temp).map((part_key) => {
                        if (part_type_temp[part_key].list.length === 0) {
                            delete part_type_temp[part_key]
                        }
                    })
                    setAcademicYear(() => props.selectedYear)
                    setLoading(() => false)
                    setIsBlankPage(() => false)
                    setBlankData(() => '')
                    setMarksCardInformation(() => response.data.data)
                    setSelectedExamTestDropdown(() => response.data.data.available_term_list)
                    set_part_type(() => part_type_temp)
                    setSelectedYear(() => selectedYear)
                    setStandardSectionId(() => standard_section_id)
                    setSelectedGradePlan(() => response.data.data.grade_plan)
                    set_is_approved(() => response.data.data.is_finalized)
                }
                else {
                    setMarksCardInformation(() => { })
                    setLoading(() => false)
                    setIsBlankPage(() => true)
                    setBlankData(() => 'Terms are not finalized')
                }
            }
            else {
                setMarksCardInformation(() => { })
                setLoading(() => false)
                setIsBlankPage(() => true)
                setBlankData(() => response)
            }
        })
    };

    const getSubjectTotal = (subIndex) => {
        let total = 0
        let subject = marksCardInformation.result_data[subIndex]
        if (!_.isEmpty(subject.term_list)) {
            Object.keys(subject.term_list).map((exam_test) => {
                if (marksCardInformation.available_term_list.some(key => key.id == exam_test)) {
                    if (subject.term_list[exam_test].final_result_configured_marks && !subject.term_list[exam_test]['final_result_disabled']) {
                        total = parseFloat(total) + parseFloat(subject.term_list[exam_test].final_result_configured_marks)
                    }
                }
            })
        }
        return total
    }

    const submitMarks = (name) => {
        let post_data = validationAndPostData()
        if (post_data) {
            setSubmitDisable(() => true)
            let url = POST_URL.examfinalresultconfiguration.api;
            postRequest(url, post_data, {}).then((response) => {
                if (response && response.status === 200) {
                    if (name === 'finalize') {
                        finalizeMarks()
                    }
                    else {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: 'Your Data has been saved',
                            showConfirmButton: false,
                            timer: 1500
                        })
                        props.goToViewPage()
                    }
                }
                setSubmitDisable(() => false)
            });
        }
    }

    const finalizeMarks = () => {
        let validate = validationFinalizePostData();
        if (validate) {
            setSubmitDisable(() => true)
            let url = PUT_URL.examfinalresultconfiguration.api + marksCardInformation.id + '/'
            putRequest(url, {}, {}).then((response) => {
                setSubmitDisable(() => false)
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: 'Your Data has been saved',
                        showConfirmButton: false,
                        timer: 1500
                    })
                    props.goToViewPage()
                }
            })
        }
    }

    const validationFinalizePostData = () => {
        let validate = true
        let fieldError = {}
        if (!selectedGradePlan) {
            fieldError['selectedGradePlan'] = `Select Grade Plan`
        }
        marksCardInformation.result_data.map((subject, subIndex) => {
            marksCardInformation.available_term_list.map((sub) => {
                if (subject.term_list[sub.id]) {
                    Object.keys(subject.term_list).map((exam_test) => {
                        if ((!subject.term_list?.[sub.id]?.final_result_configured_marks || subject.term_list?.[sub.id]?.final_result_configured_marks == 0) && !subject.term_list?.[sub.id]?.final_result_disabled) {
                            fieldError[`final_result_configured_marks${subIndex}${sub.id}`] = `Enter Marks`
                            validate = false
                        }
                    })
                }
            })
            if (subject.term_list) {
                if (!subject.configured_min_marks) {
                    validate = false
                    fieldError[`configured_min_marks${subIndex}`] = `Enter min marks`
                }
                else if (parseInt(subject.configured_min_marks) > parseInt(subject.configured_max_marks)) {
                    validate = false
                    fieldError[`configured_min_marks${subIndex}`] = `Enter Below ${subject.configured_max_marks}`
                }
            }
        })
        setFieldError(() => fieldError)
        if (validate) {
            validate = {
                result_config: marksCardInformation.config_id,
                academic_year: selectedYear,
                standard_section_ids: [parseInt(standardSectionId)],
                term: currentTab === 'term1' ? 1 : 2,
                approval_status: 1,
            }
        }
        return validate
    }


    const validationAndPostData = () => {
        marksCardInformation.available_term_list.map((parent) => {
            parent.final_result_disabled = true
            selectedExamTestDropdown.map((child) => {
                if (child.id == parent.id) {
                    parent.final_result_disabled = false
                }
            })
        })
        let validate = true
        let fieldError = {}
        let alertData = ''
        let student_data = []
        let subject_temp = {}
        let exam_test_temp = {}
        let examTestIndexTemp = ''
        let finalTotal = 0
        let subject_config_is_present = false
        if (selectedExamTestDropdown.length !== 0) {
            marksCardInformation.result_data.map((subject, stIndex) => {
                if ((subject.configured_min_marks && parseFloat(subject.configured_max_marks) >= (parseFloat(subject.configured_min_marks))) || !subject.configured_min_marks) {
                    subject_temp = { terms_list: [] }
                    subject_temp['subject'] = subject.subject
                    subject_temp['max_marks'] = subject.configured_max_marks ? parseInt(subject.configured_max_marks) : null
                    subject_temp['min_marks'] = subject.configured_min_marks ? parseInt(subject.configured_min_marks) : null
                    subject_config_is_present = false
                    marksCardInformation.available_term_list.map((sub, subIndex) => {
                        if (subject.term_list[sub.id].final_result_configured_marks) {
                            finalTotal = finalTotal + parseFloat(subject.term_list[sub.id].final_result_configured_marks)
                        }
                        exam_test_temp = {}
                        Object.keys(subject.term_list).map((exam_test, examTestIndex) => {
                            if (subject.term_list?.[sub.id]?.final_result_configured_marks && (!subject.term_list[sub.id].final_result_disabled)) {
                                exam_test_temp['term'] = sub.id
                                exam_test_temp['final_result_configured_marks'] = parseFloat(subject.term_list[sub.id].final_result_configured_marks)
                                exam_test_temp['final_result_disabled'] = 0
                            }
                            if (subject.term_list?.[sub.id]?.final_result_disabled) {
                                exam_test_temp['term'] = sub.id
                                exam_test_temp['final_result_disabled'] = 1
                                exam_test_temp['final_result_configured_marks'] = 0
                            }
                            if (subject.term_list[sub.id] && subject.term_list[sub.id].id && !subject.term_list[sub.id].final_result_disabled) {
                                exam_test_temp['id'] = subject.term_list[sub.id].id
                            }
                            examTestIndexTemp = examTestIndex
                        })
                        if (subject.term_list[sub.id] && (
                            subject.term_list[sub.id].final_result_configured_marks || subject.term_list[sub.id].final_result_disabled
                        )) {
                            if ((subject.term_list[sub.id].final_result_configured_marks && parseInt(subject.term_list[sub.id].final_result_configured_marks) > 200)) {
                                validate = false
                                fieldError[`final_result_configured_marks${stIndex}${examTestIndexTemp}`] = 'Enter equal to or below 200'
                            }
                            else {
                                subject_config_is_present = true
                                if (!isObjectEmpty(exam_test_temp)) {
                                    exam_test_temp['final_result_configured_min_marks'] = 0
                                    subject_temp['terms_list'].push(exam_test_temp)
                                }
                            }
                        }
                    })
                }
                else if (subject.configured_max_marks || subject.configured_min_marks) {
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
            alertData = 'clear errors'
            setAlertData(() => alertData)
            setFieldError(() => fieldError)
            setOpenSnackBar(() => true)
        }
        else {
            let return_data = {
                academic_year: selectedYear,
                standard_section: standardSectionId,
                grade_plan: selectedGradePlan,
                total_max_marks: finalTotal,
                total_min_marks: 0,
                subject_list: student_data
            }
            if (marksCardInformation.id) {
                return_data['id'] = marksCardInformation.id
            }
            validate = return_data
        }
        return validate
    }

    const onChange = (e) => {
        let fieldErrorTemp = { ...fieldError }
        delete fieldErrorTemp['selectedGradePlan']
        setFieldError(() => fieldErrorTemp)
        setSelectedGradePlan(() => e.target.value)
        setIsModified(() => true)
    }

    const handleEnableDisableTest = () => {
        set_is_enable_disable_test(() => !is_enable_disable_test)
    }

    const getSubjectFormat = (part) => {
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
                {marksCardInformation.result_data.map((subject, subIndex) => {
                    return (
                        <>
                            {part_type[part].list.includes(subject.subject) && !subject.hidden &&
                                <TableRow className='selectable-row-table-row'>
                                    <TableCell className='mark-add-table-cell padding-y-zero ' component='th' scope='row'>
                                        {subject.subject_name}
                                    </TableCell>
                                    {marksCardInformation.available_term_list.map((exam_test, examTestIndex) => {
                                        return (selectedExamTestDropdown.some(key => key.value === exam_test.id) &&
                                            <TableCell className='mark-add-table-cell padding-y-zero' component='th' scope='row' align='center'>
                                                <TableRow
                                                    className={is_enable_disable_test ? 'height-36px' : 'height-34px'}
                                                >
                                                    <TableCell className='mark-add-table-cell padding-y-zero' component='th' scope='row'>
                                                        {(subject.term_list[exam_test.id]) &&
                                                            <Box className='width-50-px text-align-center'>
                                                                {subject.term_list[exam_test.id].max_marks}
                                                            </Box>
                                                        }
                                                        {!subject.term_list[exam_test.id] &&
                                                            <Tooltip title='Exam marks not entered in schedule'
                                                                enterDelay={400}
                                                                enterNextDelay={400} placement='top-start'
                                                                classes={{ tooltip: 'tooltip-show-data' }}>
                                                                <Box className='width-50-px text-align-center'> <InfoIcon className='time-table-info-icon cursor-pointer' /></Box>
                                                            </Tooltip>
                                                        }
                                                    </TableCell>
                                                    <TableCell className='mark-add-table-cell padding-y-zero' component='th' scope='row' align='center'>
                                                        {!is_enable_disable_test && subject.term_list[exam_test.id] && !subject.term_list[exam_test.id]?.final_result_disabled &&
                                                            <>
                                                                {is_approved &&
                                                                    <Box className='width-50-px marks-view-entered'>
                                                                        {subject.term_list[exam_test.id].final_result_configured_marks}
                                                                    </Box>
                                                                }
                                                                {!is_approved &&
                                                                    <TextField
                                                                        id="number"
                                                                        label=""
                                                                        type="text"
                                                                        name='final_result_configured_marks'
                                                                        autoComplete="off"
                                                                        value={subject.term_list?.[exam_test.id] ? subject.term_list[exam_test.id].final_result_configured_marks : ''}
                                                                        className={'result-config-text'}
                                                                        onChange={(e) => handleChange(e, subIndex, exam_test.id)}
                                                                        defaultValue=""
                                                                        InputLabelProps={{
                                                                            shrink: true,
                                                                        }}
                                                                        InputProps={{
                                                                            max: 200,
                                                                            min: 0,
                                                                            maxLength: 4,
                                                                            endAdornment: (
                                                                                fieldError[`final_result_configured_marks${subIndex}${exam_test.id}`] ?
                                                                                    <Tooltip title={fieldError[`final_result_configured_marks${subIndex}${exam_test.id}`]}
                                                                                        enterDelay={400}
                                                                                        enterNextDelay={400} placement='top-start'
                                                                                        classes={{ tooltip: 'tooltip-show-data' }}>
                                                                                        <InfoIcon className='time-table-info-icon cursor-pointer' />
                                                                                    </Tooltip>
                                                                                    : ''
                                                                            )
                                                                        }}
                                                                        error={fieldError[`final_result_configured_marks${subIndex}${exam_test.id}`] && (fieldError[`final_result_configured_marks${subIndex}${exam_test.id}`] ? true : false)}
                                                                    />
                                                                }
                                                            </>
                                                        }
                                                        {!is_enable_disable_test && subject?.term_list?.[exam_test.id] && !!subject?.term_list?.[exam_test.id]?.final_result_disabled &&
                                                            <Tooltip title='Disabled'
                                                                enterDelay={400}
                                                                enterNextDelay={400} placement='top-start'
                                                                classes={{ tooltip: 'tooltip-show-data' }}>
                                                                <Box className='display-flex text-align-center'>
                                                                    <InfoIcon className='time-table-info-icon cursor-pointer' />
                                                                </Box>
                                                            </Tooltip>
                                                        }
                                                        {is_enable_disable_test && subject.term_list?.[exam_test.id] &&
                                                            <Box class="exam-mark-checkbox padding-y-zero">
                                                                <input type="checkbox" id={`${subIndex}${examTestIndex}`}
                                                                    name='final_result_disabled'
                                                                    checked={(subject.term_list[exam_test.id] && subject.term_list[exam_test.id].final_result_disabled)}
                                                                    value={(subject.term_list[exam_test.id] && subject.term_list[exam_test.id].final_result_disabled)}
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
                    marksCardInformation.result_data.length === 0 && (
                        <tr className="text-center font-weight-bold">
                            No Data Found
                        </tr>
                    )
                }
            </TableBody>

        )
    }

    const getTotalFormat = (part) => {
        return (
            <TableBody className='selectable-row-table-body'>
                {Object.keys(part_type).length > 1 &&
                    <TableRow className={is_enable_disable_test ? 'height-37px' : 'height-35px'}>
                        <TableCell className='mark-add-table-cell'>{` `}</TableCell>
                    </TableRow>
                }
                {marksCardInformation.result_data.map((subject, subIndex) => {
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
                                            <TextField
                                                id="number"
                                                label=""
                                                type="text"
                                                name='configured_min_marks'
                                                autoComplete="off"
                                                value={subject.configured_min_marks}
                                                className={'result-config-text '}
                                                onChange={(e) => handleSubjectChange(e, subIndex)}
                                                onBlur={() => onBlurMinMarkValidation(subIndex)}
                                                disabled={false}
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
                    marksCardInformation.result_data.length === 0 && (
                        <tr className="text-center font-weight-bold">
                            No Data Found
                        </tr>
                    )
                }
            </TableBody>
        )
    }

    const handleChange = (e, subIndex, id) => {
        let { name, value } = e.target;
        let tempfieldError = { ...fieldError }
        delete tempfieldError[`${name}${subIndex}${id}`]
        let marksInfo = { ...marksCardInformation }
        marksInfo.result_data[subIndex]['term_list'][id][name] = value
        marksInfo.result_data[subIndex]['configured_marks'] = value
        if (value && parseInt(value) === 0) {
            tempfieldError[`${name}${subIndex}${id}`] = 'Enter above 0'
            setFieldError(() => tempfieldError)
            return
        }
        else if ((!numberRegex.value.test(value) && value) || parseInt(value) > 200) {
            if (parseInt(value) > 200) {
                tempfieldError[`${name}${subIndex}${id}`] = 'Enter equal to or below 200'
            }
            else {
                tempfieldError[`${name}${subIndex}${id}`] = numberRegex.errorText
            }
            setFieldError(() => tempfieldError)
            return
        }
        else {
            // marksInfo.result_data[subIndex]['configured_min_marks'] = ''
            marksInfo.result_data[subIndex]['configured_max_marks'] = getSubjectTotal(subIndex)
            setMarksCardInformation(() => marksInfo)
            setFieldError(() => tempfieldError)
        }
        setIsModified(() => true)
    }

    const handleSubjectChange = (e, subIndex) => {
        let errors = { ...fieldError }
        let marksInfo = { ...marksCardInformation }
        let { name, value } = e.target;
        delete errors[`${name}${subIndex}`]
        marksInfo.result_data[subIndex]['configured_max_marks'] = getSubjectTotal(subIndex)
        marksInfo.result_data[subIndex][name] = value
        setMarksCardInformation(() => marksInfo)
        setFieldError(() => errors)
        setIsModified(() => true)
    }

    const onBlurMinMarkValidation = (subIndex) => {
        let errors = { ...fieldError }
        let configured_min_marks = marksCardInformation.result_data[subIndex]['configured_min_marks']
        let configured_max_marks = marksCardInformation.result_data[subIndex]['configured_max_marks']
        if (parseFloat(configured_max_marks) >= parseFloat(configured_min_marks)) {
            delete errors[`configured_min_marks${subIndex}`]
        }
        else {
            errors[`configured_min_marks${subIndex}`] = `Enter Below ${configured_max_marks}`
        }
        setFieldError(() => errors)
    }

    const handleSelectAllTest = (e, index, exam_id) => {
        let marksInfo = { ...marksCardInformation }
        let updated_value = marksInfo.available_term_list[index]?.final_result_disabled ? 0 : 1
        marksInfo.result_data.map((data) => {
            if (data.term_list[exam_id]) {
                data.term_list[exam_id]['final_result_disabled'] = updated_value
            }
        })
        marksInfo.available_term_list[index].final_result_disabled = updated_value
        setMarksCardInformation(() => marksInfo)
    }

    const submitAndFinalize = () => {
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
                if (isModified) {
                    submitMarks('finalize')
                }
                else {
                    finalizeMarks()
                }
            }
        });
    }

    const handleCloseSnacBar = () => {
        setOpenSnackBar(() => false)
        setAlertData(() => '')
    }

    return (
        <>
            {loading &&
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            }
            {!loading &&
                <>
                    <Grid container className='header-align' spacing={2}>
                        <Grid item md={3} xs={12} className='margin-top-10'>
                            {is_grade_plan && selectedExamTestDropdown.length > 0 && !is_approved &&
                                <Dropdown
                                    data={gradePlanList}
                                    name='selectedGradePlan'
                                    // className={'width-300px'}
                                    value={selectedGradePlan}
                                    onChange={onChange}
                                    label='Grade Plan'
                                    error={fieldError.selectedGradePlan && fieldError.selectedGradePlan}
                                    helperText={fieldError.selectedGradePlan && fieldError.selectedGradePlan}
                                />
                            }
                            {is_grade_plan && selectedExamTestDropdown.length > 0 && is_approved &&
                                <Box className="year-std-box mr-40">
                                    <Box className="academic-std-head"> Grade Plan</Box>
                                    <Box className=" exam-mark-add-heading-bg">{marksCardInformation?.grade_plan_name}</Box>
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
                                        onClick={handleEnableDisableTest}
                                        style={{
                                            height: '40px',
                                            alignSelf: 'center'
                                        }}
                                    >
                                        {!is_enable_disable_test &&
                                            <Box>Disable Exam</Box>
                                        }
                                        {is_enable_disable_test &&
                                            <Box>Enter Exam</Box>
                                        }
                                    </Button>
                                </Tooltip>
                            </Grid>)
                        }

                    </Grid>
                    {isBlankPage &&
                        <BlankPagewithIcon data={blankData} />
                    }
                    {selectedExamTestDropdown.length > 0 &&
                        <Box display='flex'>
                            <TableContainer className='result-config-bg time-table-create header-align m-b-60px p-b-20px'>
                                <Table size='small' aria-label='simple table' className='exam-mark-row-table'>
                                    <TableHead>
                                        <TableRow className=''>
                                            <TableCell className='selectable-table-head'>Subject</TableCell>
                                            {marksCardInformation.available_term_list.map((data) => {
                                                return (selectedExamTestDropdown.some(key => key.value === data.id) &&
                                                    <TableCell className='selectable-table-head' align='center'>{data.name}

                                                    </TableCell>
                                                )
                                            })
                                            }
                                        </TableRow>
                                    </TableHead>
                                    <TableHead>
                                        <TableRow className=''>
                                            <TableCell className=''></TableCell>
                                            {marksCardInformation.available_term_list.map((data, index) => {
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
                                                                                        name='final_result_disabled'
                                                                                        checked={data?.final_result_disabled ?? false}
                                                                                        value={data?.final_result_disabled ?? false}
                                                                                        onChange={(e) => handleSelectAllTest(e, index, data.id)}
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
                                            getSubjectFormat(part_key)
                                        )
                                    })
                                    } 
                                </Table>
                            </TableContainer>
                            <TableContainer className='result-config-bg header-align w-auto m-b-60px'>
                                <Table size='small' aria-label='simple table' className='w-auto'>
                                    <TableHead>
                                        <TableRow className=''>
                                            <TableCell ></TableCell>
                                            <TableCell className='selectable-table-head'>Total</TableCell>
                                            <TableCell className='selectable-table-head'>Min Marks</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableHead>
                                        <TableRow className={is_enable_disable_test ? 'height-49px' : 'height-39px'}>
                                            <TableCell></TableCell>
                                            <TableCell className='height-table-cell text-align-center'>Max</TableCell>
                                            <TableCell className='height-table-cell'>Min</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    {Object.keys(part_type).map((part_key) => {
                                        return (part_type[part_key].list.length > 0 &&
                                            getTotalFormat(part_key)
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
                                onClick={(e) => submitAndFinalize()}>
                                Finalize
                            </Button>
                            <Button
                                className={`submit mr-20`}
                                variant="contained"
                                style={{ 'float': 'right' }}
                                disabled={submitDisable}
                                onClick={(e) => submitMarks()}>
                                Submit
                            </Button>
                        </Box>
                    }
                    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={openSnackBar} autoHideDuration={2000} onClose={handleCloseSnacBar}>
                        <Alert onClose={handleCloseSnacBar} severity="error">
                            {alertData}
                        </Alert>
                    </Snackbar>
                </>
            }
        </>
    )
}

export default withRouter(FinalWiseFinalResultConfig)
