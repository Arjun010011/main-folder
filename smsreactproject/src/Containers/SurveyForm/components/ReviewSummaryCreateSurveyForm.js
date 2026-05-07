import React, { useState, useImperativeHandle } from 'react'
import {
    Switch, Grid, FormControlLabel, Box, TextField, Tooltip
} from '@material-ui/core';
import {
    MuiPickersUtilsProvider,
    KeyboardDateTimePicker,
} from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import { getKeyValueMap, dateFormat, validateDate, Alert } from 'Includes/functions';
import { FormattedMessage } from 'react-intl';
import commonMessages from 'Constants/messages'
import Snackbar from '@material-ui/core/Snackbar';
import '../styles.scss'

const ReviewSummaryCreateSurveyForm = React.forwardRef((props, ref) => {
    const { section_list, subject_list, year, maxDate, isEdit, feedbackFormDetails,student_list,department_list,response_staff_list } = props;

    const [reviewDetails, set_reviewDetails] = useState({
        staff_list: [],
        subject: null,
        selected_sections: [],
        start_date: null,
        end_date: null,
        is_total_time: 'no',
        total_time: '',
        section_list:[],
        student_list:[],
        response_staff_list:[],
        department_list:[]
    });
    const [error, setError] = useState({});
    const [openSnackBar, set_openSnackBar] = useState(false)
    const [alertData, set_alertData] = useState('')
    const [loading, set_loading] = useState(true)

    const onChange = (e) => {
        const { name, value } = e.target;
        let error_temp = { ...error };
        delete error_temp[name];
        setError(error_temp);

        let reviewDetailsTemp = { ...reviewDetails };
        reviewDetailsTemp[name] = value;
        set_reviewDetails(reviewDetailsTemp);

        if (name === 'is_total_time') {
            props.updateIsTotalTime(value);
        }
    }

    React.useEffect(() => {
        set_reviewDetails((prev) => {
          let updated = { ...prev };
      
          // If editing, copy feedbackFormDetails into state
          if (isEdit) {
            updated = {
              ...updated,
              id: feedbackFormDetails.id,
              feedback_form_title: feedbackFormDetails.title,
              start_date: feedbackFormDetails.start_date,
              end_date: feedbackFormDetails.end_date,
              subject: feedbackFormDetails.subject,
              total_time: feedbackFormDetails.total_time,
              is_total_time: parseInt(feedbackFormDetails.total_time) ? "yes" : "no",
            };
          }
      
          // Always update array lists (safe fallback if not array)
          updated.section_list = Array.isArray(section_list)
            ? section_list
            : updated.section_list || [];
          updated.department_list = Array.isArray(department_list)
            ? department_list
            : updated.department_list || [];
          updated.student_list = Array.isArray(student_list)
            ? student_list
            : updated.student_list || [];
          updated.response_staff_list = Array.isArray(response_staff_list)
            ? response_staff_list
            : updated.response_staff_list || [];
      
          return updated;
        });
        set_loading(false)
        console.log(reviewDetails, "reviewDetails");
      }, [
        isEdit,
        feedbackFormDetails,
        section_list,
        department_list,
        student_list,
        response_staff_list,
      ]);

    React.useEffect(() => {
    console.log("reviewDetails updated:", reviewDetails);
    }, [reviewDetails]);

    
    const onChangeDatesYears = (e, name) => {
        let error_temp = { ...error };
        delete error_temp[name];
        setError(error_temp);

        let reviewDetailsTemp = { ...reviewDetails };
        reviewDetailsTemp[name] = e;
        set_reviewDetails(reviewDetailsTemp);
    }

    React.useEffect(() => {
        if (!props.isEdit) {
            set_loading(false);
        }
    }, [props.isEdit]);

    const onBlurValidation = (e, name) => {
        let error_temp = { ...error };
        delete error_temp[name];

        if (name === 'start_date') {
            const errorMsg = validateDate(new Date(reviewDetails.start_date), new Date(), maxDate, 'time');
            if (errorMsg) {
                error_temp[name] = `${dateFormat(new Date(), 'DD-MM-yyyy hh:mm a')} - ${dateFormat(maxDate, 'DD-MM-yyyy hh:mm a')}`;
            }
        }

        if (name === 'end_date') {
            const errorMsg = validateDate(new Date(reviewDetails.end_date), new Date(reviewDetails.start_date), maxDate, 'time');
            if (errorMsg) {
                error_temp[name] = `${dateFormat(reviewDetails.start_date, 'DD-MM-yyyy hh:mm a')} - ${dateFormat(maxDate, 'DD-MM-yyyy hh:mm a')}`;
            }
        }

        setError(error_temp);
        return Object.keys(error_temp).length === 0 ? true : error_temp;
    }

    useImperativeHandle(ref, () => ({
        updateReviewDetails(getDetails) {
            let reviewDetailsTemp = {
                id: getDetails.id,
                feedback_form_title: getDetails.title,
                start_date: getDetails.start_date,
                end_date: getDetails.end_date,
                subject: getDetails.subject,
                total_time: getDetails.total_time,
                is_total_time: parseInt(getDetails.total_time) ? 'yes' : 'no'
            };
            console.log(department_list,'department_listttt')
            if (section_list){
                reviewDetailsTemp['section_list'] = section_list
            }
            if (department_list){
                reviewDetailsTemp['department_list'] = department_list
            }
            if (student_list){
                reviewDetailsTemp['student_list'] = student_list
            }
            if (response_staff_list){
                reviewDetailsTemp['response_staff_list'] = response_staff_list
            }

            let staffId = [];
            getDetails.alternate_teacher_mapping_form.forEach(data => {
                staffId.push(data);
            });
            reviewDetailsTemp['staff_list'] = staffId;

            set_reviewDetails(reviewDetailsTemp);
            set_loading(false);
        },
        getDetails() {
            let validate = true;
            let return_value = false;
            let error_temp = {};
            let alertData = '';
            console.log(reviewDetails,'reviewdetailsssss')
            if (!reviewDetails.feedback_form_title) {
                error_temp['feedback_form_title'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />;
            }

            if (reviewDetails.section_list.length === 0 && reviewDetails.department_list.length === 0 && 
                reviewDetails.student_list.length === 0 && reviewDetails.response_staff_list.length === 0) {
                error_temp['selected_sections'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />;
            }

            if (!reviewDetails.start_date) {
                error_temp['start_date'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />;
            } else if (reviewDetails.start_date) {
                if (onBlurValidation('a', 'start_date') !== true) {
                    error_temp = { ...error_temp, ...onBlurValidation('a', 'start_date') };
                }
            }

            if (!reviewDetails.end_date) {
                error_temp['end_date'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />;
            } else if (reviewDetails.end_date) {
                if (onBlurValidation('a', 'end_date') !== true) {
                    error_temp = { ...onBlurValidation('a', 'end_date') };
                }
            }

            if (Object.keys(error_temp).length !== 0) {
                validate = false;
                alertData = <FormattedMessage {...commonMessages.clearAllErrors} />;
            }
            if (validate) {
                if (reviewDetails['subject']) {
                    let subject_name = getKeyValueMap(subject_list, 'subject_id', 'subject_name');
                    reviewDetails['subject_name'] = subject_name[reviewDetails['subject']];
                }
                return_value = reviewDetails;
            } else {
                setError(error_temp);
                set_openSnackBar(true);
                set_alertData(alertData);
            }
            return return_value;
        }
    }));

    const handleClose = () => {
        set_openSnackBar(false);
    }

    return (
        <Box className='padding-0'>
            {!loading &&
                <Grid container spacing={2}>
                    <Grid item md={8} xs={12}>
                        <TextField
                            autoComplete='off'
                            label='Survey Form Title'
                            required
                            name='feedback_form_title'
                            type='text'
                            value={reviewDetails.feedback_form_title}
                            InputLabelProps={{ shrink: !!reviewDetails.feedback_form_title }}
                            inputProps={{ maxLength: '100', autoComplete: 'new-password' }}
                            fullWidth
                            variant="outlined"
                            helperText={error.feedback_form_title}
                            error={!!error.feedback_form_title}
                            onChange={onChange}
                        />
                    </Grid>

                    <Grid item md={2} xs={12} className='set-question-align-text-center'>
                        <FormControlLabel
                            control={<Switch
                                checked={reviewDetails.is_total_time === "yes"}
                                name="is_total_time"
                                value={reviewDetails.is_total_time === "yes" ? "no" : "yes"}
                                color="primary"
                                onChange={onChange}
                            />}
                            label="Survey Form time"
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
                                fullWidth
                                inputProps={{ maxLength: 4 }}
                                onChange={onChange}
                                error={!!error['total_time']}
                                helperText={error['total_time']}
                            />
                        </Grid>
                    }

                    <Grid item md={4} xs={12}>
                        <MuiPickersUtilsProvider utils={DateFnsUtils}>
                            <KeyboardDateTimePicker
                                variant="inline"
                                ampm
                                className='w-100'
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
                                KeyboardButtonProps={{ 'aria-label': 'change date' }}
                                InputLabelProps={{ shrink: !!reviewDetails.start_date }}
                                helperText={error.start_date}
                                error={!!error.start_date}
                            />
                        </MuiPickersUtilsProvider>
                    </Grid>

                    <Grid item md={4} xs={12}>
                        <MuiPickersUtilsProvider utils={DateFnsUtils}>
                            <KeyboardDateTimePicker
                                variant="inline"
                                ampm
                                className='w-100'
                                autoOk
                                inputVariant='outlined'
                                label='End Date'
                                name='end_date'
                                minDate={reviewDetails.start_date || new Date()}
                                maxDate={maxDate}
                                disabled={!reviewDetails.start_date}
                                format='dd-MM-yyyy hh:mm a'
                                value={reviewDetails.end_date}
                                onChange={(e) => onChangeDatesYears(e, 'end_date')}
                                onBlur={(e) => onBlurValidation(e, 'end_date')}
                                onClose={(e) => onBlurValidation(e, 'end_date')}
                                KeyboardButtonProps={{ 'aria-label': 'change date' }}
                                InputLabelProps={{ shrink: !!reviewDetails.end_date }}
                                helperText={error.end_date}
                                error={!!error.end_date}
                            />
                        </MuiPickersUtilsProvider>
                    </Grid>

                    <Tooltip enterDelay={400} enterNextDelay={400} placement='top-start'
                        classes={{ tooltip: 'tooltip-show-data' }}
                        title="The survey form is automatically evaluated based on the answers selected" followCursor>
                        <Grid item md={2} xs={12} className='set-question-align-text-center'>
                            {/* Optional automatic evaluation switch */}
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
});

export default ReviewSummaryCreateSurveyForm;
