import React, { useState, useEffect, useImperativeHandle } from 'react'
import {
    Switch, Grid, FormControlLabel, Box, TextField, Tooltip
} from '@material-ui/core';
import MultiSelect from "react-multi-select-component";
import {
    MuiPickersUtilsProvider,
    KeyboardDateTimePicker,
} from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import { Actions } from 'Constants/permissions';
import { Dropdown } from 'Components/DropDown';
import clsx from 'clsx';
import Snackbar from '@material-ui/core/Snackbar';
import './../styles.scss'
import { dateFormat, validateDate, Alert, getKeyValueMap } from 'Includes/functions';
import messages from './../messages';
import AddStudentToCreateQuiz from './AddStudentToCreateQuiz';
import { FormattedMessage } from 'react-intl';
import commonMessages from 'Constants/messages'
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";


const ReviewSummaryCreateQuiz = React.forwardRef((props, ref) => {

    const { section_list, subject_list, current_standard, year, maxDate, isEdit, quizDetails } = props;

    const [reviewDetails, set_reviewDetails] = useState({ student_list: [], staff_list: [], subject: null, selected_sections: [], start_date: null, end_date: null, is_total_time: 'no' });
    const [error, setError] = useState({});
    const [openSnackBar, set_openSnackBar] = useState(false)
    const [alertData, set_alertData] = useState('')
    const [loading, set_loading] = useState(true)

    const onChange = (e) => {
        let { name, value } = e.target;
        let error_temp = error
        delete error_temp[name]
        setError(error_temp)
        let reviewDetailsTemp = { ...reviewDetails }
        reviewDetailsTemp[name] = value
        set_reviewDetails(() => reviewDetailsTemp)
        if (name === 'is_total_time') {
            props.updateIsTotalTime(value)
        }
    }


    const onChangeSelect = (e) => {
        let error_temp = { ...error }
        delete error_temp['selected_sections']
        setError(() => error_temp)
        let reviewDetailsTemp = { ...reviewDetails }
        reviewDetailsTemp['selected_sections'] = e
        set_reviewDetails(() => reviewDetailsTemp)
    }

    const onChangeDatesYears = (e, name) => {
        let error_temp = { ...error }
        delete error_temp[name]
        setError(() => error_temp)
        let reviewDetailsTemp = { ...reviewDetails }
        reviewDetailsTemp[name] = e
        set_reviewDetails(() => reviewDetailsTemp)
        // if (name === 'start_date') {
        //     onBlurValidation(e, 'start_date')
        // }
        // if (name === 'end_date') {
        //     onBlurValidation(e, 'end_date')
        // }
    }

    React.useEffect(() => {
        if (!props.isEdit) {
            set_loading(() => false)
        }
    }, []);

    const onBlurValidation = (e, name) => {
        let error_end_date = ''
        let error_start_date = ''
        var today = new Date();
        let error_temp = { ...error }
        delete error_temp[name]
        setError(()=> error_temp)
        if (name === 'start_date') {
            error_start_date = validateDate(new Date(reviewDetails.start_date), today, maxDate, 'time')
            if (error_start_date !== '') {
                error_temp[name] = `${dateFormat(new Date(), 'DD-MM-yyyy hh:mm a')} - ${dateFormat(maxDate, 'DD-MM-yyyy hh:mm a')}`
                setError(() => error_temp)
            }
        }
        else if (name === 'end_date') {
            error_end_date = validateDate(new Date(reviewDetails.end_date), new Date(reviewDetails.start_date), maxDate, 'time')
            if (error_end_date !== '') {
                error_temp[name] = `${dateFormat(reviewDetails.start_date, 'DD-MM-yyyy hh:mm a')} - ${dateFormat(maxDate, 'DD-MM-yyyy hh:mm a')}`
                setError(() => error_temp)
            }
        }
        return (error_start_date === '' && error_end_date === '') ? true : error_temp
    }

    const updateStaff = (list) => {
        let reviewDetailsTemp = { ...reviewDetails }
        reviewDetailsTemp['staff_list'] = list
        set_reviewDetails(() => reviewDetailsTemp)
    }

    const updateStudent = (list) => {
        let reviewDetailsTemp = { ...reviewDetails }
        reviewDetailsTemp['student_list'] = list
        set_reviewDetails(() => reviewDetailsTemp)
    }

    const updateSectionError = () => {
        let error_temp = { ...error }
        error_temp['selected_sections'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
        setError(() => error_temp)
    }

    useImperativeHandle(ref, () => ({
        updateReviewDetails(getDetails) {
            let reviewDetailsTemp = {}
            reviewDetailsTemp['id'] = getDetails.id
            reviewDetailsTemp['quiz_title'] = getDetails.title
            reviewDetailsTemp['start_date'] = getDetails.start_date
            reviewDetailsTemp['end_date'] = getDetails.end_date
            reviewDetailsTemp['subject'] = getDetails.subject
            reviewDetailsTemp['total_time'] = getDetails.total_time
            if (parseInt(getDetails.total_time)) {
                reviewDetailsTemp['is_total_time'] = 'yes'
            }
            let section_temp = []
            section_list.map((section) => {
                getDetails.form_standard_section_mapping_form.map((data) => {
                    if (section.standard_section == data.standard_section) {
                        section_temp.push(section)
                    }
                })
            })
            reviewDetailsTemp['selected_sections'] = section_temp

            let studentId = []
            getDetails.student_form_mapping_form.map((data) => {
                studentId.push(data)
            })
            reviewDetailsTemp['student_list'] = studentId
            let staffId = []
            getDetails.alternate_teacher_mapping_form.map((data) => {
                staffId.push(data)
            })
            reviewDetailsTemp['staff_list'] = staffId

            set_reviewDetails(() => reviewDetailsTemp)
            set_loading(() => false)

        },
        getDetails() {
            let validate = true
            let return_value = false
            let error_temp = {}
            let alertData = ''

            if (!reviewDetails.quiz_title) {
                error_temp['quiz_title'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
            }
            if (reviewDetails.selected_sections.length === 0) {
                error_temp['selected_sections'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
            }

            if (!reviewDetails.start_date) {
                error_temp['start_date'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
            }
            else if (reviewDetails.start_date) {
                if (onBlurValidation('a', 'start_date') !== true) {
                    error_temp = { ...error_temp, ...onBlurValidation('a', 'start_date') }
                }
            }

            if (!reviewDetails.end_date) {
                error_temp['end_date'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
            }
            else if (reviewDetails.end_date) {
                if (onBlurValidation('a', 'end_date') !== true) {
                    error_temp = { ...onBlurValidation('a', 'end_date') }
                }
            }
            if (reviewDetails.student_list.length === 0) {
                alertData = <FormattedMessage {...messages.studentError} />
                validate = false
            }
            if (Object.keys(error_temp).length !== 0) {
                validate = false
                alertData = <FormattedMessage {...commonMessages.clearAllErrors} />
            }
            if (validate) {
                if (reviewDetails['subject']) {
                    let subject_name = getKeyValueMap(subject_list, 'subject_id', 'subject_name')
                    subject_name = subject_name[reviewDetails['subject']]
                    reviewDetails['subject_name'] = subject_name
                }
                return_value = reviewDetails
            }
            else {
                setError(() => error_temp)
                set_openSnackBar(() => true)
                set_alertData(() => alertData)
            }
            return return_value
        }
    }));

    const handleClose = () => {
        set_openSnackBar(() => false)
    }

    return (
        <Box className='padding-0'>
            {!loading &&
                <Grid container spacing={2}>
                    <Grid item md={8} xs={12}>
                        <TextField
                            autoComplete='off'
                            label='Quiz Title'
                            required={true}
                            name='quiz_title'
                            type='text'
                            value={reviewDetails.quiz_title}
                            InputLabelProps={{
                                shrink: reviewDetails.quiz_title ? true : false,
                            }}
                            // className='width-100'
                            inputProps={{ maxLength: '100', autoComplete: 'new-password' }}
                            fullWidth={true}
                            variant="outlined"
                            helperText={error.quiz_title}
                            error={error.quiz_title}
                            onChange={onChange}
                        />
                    </Grid>
                    <Grid item md={2} xs={12} className='set-question-align-text-center'>
                        <FormControlLabel
                            control={<Switch checked={reviewDetails.is_total_time === "yes" ?
                                true : false}
                                name="is_total_time"
                                value={(reviewDetails.is_total_time === "yes") ?
                                    "no" : "yes"}
                                color="primary"
                                onChange={(e) => onChange(e)} />}
                            label="Quiz time"
                        />
                    </Grid>
                    {reviewDetails.is_total_time === "yes" &&
                        <Grid item md={2} xs={12}>
                            <TextField
                                id='total_time'
                                autoComplete='off'
                                label='Time Limits in sec'
                                name='total_time'
                                value={reviewDetails.total_time}
                                className=''
                                inputProps={{ maxLength: 4 }}
                                fullWidth
                                onChange={(e) => onChange(e)}
                                error={error['total_time'] && (error['total_time'])}
                                helperText={error['total_time'] && (error['total_time'])}
                            />
                        </Grid>
                    }
                    <Grid item md={4} xs={12}>
                        <MultipleSelectDropdown
                            data_list={section_list}
                            selected_list={reviewDetails.selected_sections ? reviewDetails.selected_sections : []}
                            error={error.selected_sections && error.selected_sections}
                            label={'Select Sections *'}
                            onChange={onChangeSelect}
                        />
                        {/* <MultiSelect
                        options={section_list}
                        value={}
                        onChange={(e) => onchangeSelect(e)}
                        style={{ minWidth: '250px', maxWidth: '400px' }}
                        className={error.selected_sections ? "review-quiz-section-error " : "review-quiz-section"}
                        overrideStrings={{
                            selectSomeItems: "Sections",
                            allItemsAreSelected: "All sections are selected",
                            selectAll: "Select All",
                            search: "Search",
                        }}
                    /> */}
                        {/* <Box className='section-error'>{error.selected_sections}</Box> */}
                    </Grid>

                    <Grid item md={4} xs={12}>
                        <MuiPickersUtilsProvider utils={DateFnsUtils}>
                            <KeyboardDateTimePicker
                                variant="inline"
                                autoComplete='off'
                                ampm={true}
                                className='w-100'
                                required={true}
                                autoOk
                                inputVariant='outlined'
                                label='Start Date'
                                name='start_date'
                                minDate={new Date()}
                                maxDate={maxDate}
                                format='dd-MM-yyyy hh:mm a'
                                value={reviewDetails.start_date}
                                onChange={(e) => onChangeDatesYears(e, 'start_date')}
                                onBlur={(e) => onBlurValidation(e, 'start_date')}
                                onClose={(e) => onBlurValidation(e, 'start_date')}
                                KeyboardButtonProps={{
                                    'aria-label': 'change date',
                                }}
                                inputProps={{ maxLength: 50 }}
                                InputLabelProps={{
                                    shrink: reviewDetails.start_date ? true : false,
                                }}
                                helperText={error.start_date}
                                error={error.start_date}
                            />
                        </MuiPickersUtilsProvider>
                    </Grid>
                    <Grid item md={4} xs={12}>
                        <MuiPickersUtilsProvider utils={DateFnsUtils}>
                            <KeyboardDateTimePicker
                                variant="inline"
                                ampm={true}
                                autoComplete='off'
                                className='w-100'
                                autoOk
                                inputVariant='outlined'
                                label='End Date'
                                name='end_date'
                                minDate={reviewDetails.start_date ? reviewDetails.start_date : new Date()}
                                maxDate={maxDate}
                                disabled={reviewDetails.start_date ? false : true}
                                format='dd-MM-yyyy hh:mm a'
                                value={reviewDetails.end_date}
                                onChange={(e) => onChangeDatesYears(e, 'end_date')}
                                onBlur={(e) => onBlurValidation(e, 'end_date')}
                                onClose={(e) => onBlurValidation(e, 'end_date')}
                                KeyboardButtonProps={{
                                    'aria-label': 'change date',
                                }}
                                inputProps={{ maxLength: 50 }}
                                InputLabelProps={{
                                    shrink: reviewDetails.end_date ? true : false,
                                }}
                                helperText={error.end_date}
                                error={error.end_date}
                            />
                        </MuiPickersUtilsProvider>
                    </Grid>
                    <Grid item md={4} xs={12}>
                        <Dropdown
                            customName='subject_name'
                            customId='subject_id'
                            data={subject_list}
                            name='subject'
                            value={reviewDetails.subject}
                            onChange={onChange}
                            label={<FormattedMessage {...commonMessages.subjects} />}
                            error={error.subject}
                            className='width-100'
                        />
                    </Grid>
                    <Grid item md={6} xs={12}>
                        <AddStudentToCreateQuiz
                            selected_sections={reviewDetails.selected_sections ? reviewDetails.selected_sections : []}
                            year={year}
                            current_standard={current_standard}
                            updateSectionError={updateSectionError}
                            updateStaff={updateStaff}
                            updateStudent={updateStudent}
                            isEdit={isEdit}
                            get_details={quizDetails}
                        />
                    </Grid>
                    <Tooltip  enterDelay={400}
                    enterNextDelay={400} placement='top-start'
                    classes={{ tooltip: 'tooltip-show-data' }}                
                     title="The quiz is automatically evaluated based on the answers selected" followCursor>
                    <Grid item md={2} xs={12} className='set-question-align-text-center'>
                        <FormControlLabel
                            control={<Switch checked={reviewDetails.is_automatic_evaluation === "yes" ?
                                true : false}
                                name="is_automatic_evaluation"
                                value={(reviewDetails.is_automatic_evaluation === "yes") ?
                                    "no" : "yes"}
                                color="primary"
                                onChange={(e) => onChange(e)} />}
                            label="Automatic Evaluation"
                        />
                    </Grid>

                    </Tooltip>
                </Grid>
            }


            <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={openSnackBar} autoHideDuration={2000} onClose={handleClose}>
                <Alert onClose={handleClose} severity="error">
                    {alertData}
                </Alert>
            </Snackbar>
        </Box>
    )
}
)
export default ReviewSummaryCreateQuiz