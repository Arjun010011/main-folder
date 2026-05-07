import React, { useState, useEffect, useImperativeHandle } from 'react'
import {
    Tooltip, Button, FormControlLabel, Box, Dialog, AppBar, Toolbar, IconButton, Typography, Slide,
    FormGroup, Paper,
    FormControl, DialogTitle, RadioGroup, Divider, Radio, Checkbox, TextField
} from '@material-ui/core';
import MultiSelect from "react-multi-select-component";
import {
    MuiPickersUtilsProvider,
    KeyboardDateTimePicker,
} from '@material-ui/pickers';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import { makeStyles } from '@material-ui/core/styles';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import DateFnsUtils from '@date-io/date-fns';
import CloseIcon from '@material-ui/icons/Close';
import LoadingGif from 'Components/LoadingGif';
import clsx from 'clsx';
import { getRequest, putRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL } from 'Includes/urls';
import Snackbar from '@material-ui/core/Snackbar';
import './styles.scss'
import { dateFormat, getKeyValueMap, Alert, getFullName, getUrlParam } from 'Includes/functions';
import messages from './messages';
import { withRouter } from 'react-router-dom';
import { Actions } from 'Constants/permissions';
import { floatNumberWithTwoDecimalRegex } from 'Constants/regularExpression';
import { FormattedMessage } from 'react-intl';
import Swal from 'sweetalert2'
import commonMessages from 'Constants/messages'
import { questionTypeList } from 'Containers/FeedBackForm/constants';

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const user = localStorage.getItem("user")!='undefined'?JSON.parse(localStorage.getItem("user")):'';

const useStyles = makeStyles({
    root: {
        '&:hover': {
            backgroundColor: 'transparent',
        },
    },
    icon: {
        borderRadius: '50%',
        width: 16,
        height: 16,
        boxShadow: 'inset 0 0 0 1px rgba(16,22,26,.2), inset 0 -1px 0 rgba(16,22,26,.1)',
        backgroundColor: '#f5f8fa',
        backgroundImage: 'linear-gradient(180deg,hsla(0,0%,100%,.8),hsla(0,0%,100%,0))',
        '$root.Mui-focusVisible &': {
            outline: '2px auto rgba(19,124,189,.6)',
            outlineOffset: 2,
        },
        'input:hover ~ &': {
            backgroundColor: '#ebf1f5',
        },
        'input:disabled ~ &': {
            boxShadow: 'none',
            background: 'rgba(206,217,224,.5)',
        },
    },
    checkedIcon: {
        backgroundColor: '#137cbd',
        backgroundImage: 'linear-gradient(180deg,hsla(0,0%,100%,.1),hsla(0,0%,100%,0))',
        '&:before': {
            display: 'block',
            width: 16,
            height: 16,
            backgroundImage: 'radial-gradient(#fff,#fff 28%,transparent 32%)',
            content: '""',
        },
        'input:hover ~ &': {
            backgroundColor: '#106ba3',
        },
    },
});



function StyledRadio(props) {
    const classes = useStyles();

    return (
        <Radio
            disableRipple
            color="default"
            checkedIcon={<span className={clsx(classes.icon, classes.checkedIcon)} />}
            icon={<span className={classes.icon} />}
            className='padding-l-20-bt-0-r-10px'
            {...props}
        />
    );
}

function getIndex(value, arr, prop) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i][prop] === value) {
            return i;
        }
    }
    return -1; //to handle the case where the value doesn't exist
}

const EvaluateStudentFeedBackForm = React.forwardRef((props, ref) => {

    const [error, set_error] = useState({});
    const [openSnackBar, set_openSnackBar] = useState(false)
    const [openDialog, set_openDialog] = useState(false)
    const [loadingDetails, set_loadingDetails] = useState(false)
    const [alertData, set_alertData] = useState('')
    const [quizDetails, set_quizDetails] = useState({ question_form: [], student_details: {} })
    const [largeImagePreview, set_largeImagePreview] = useState('')
    const [submitDisable, set_submitDisable] = useState(false)
    const [isEvaluated, set_isEvaluated] = useState(false)

    const handleImagePreview = (imagePreview) => {
        return (
            <Tooltip title='Preview Image' placement='top-start'>
                <Box className='set-question-image-preview-outer-box'>
                    <img src={imagePreview} alt='image' className='set-question-uploaded-image' />
                    <Box onClick={() => handleLargePreview(imagePreview)} className='set-question-image-preview-icon'><VisibilityOutlinedIcon /> </Box>
                </Box>
            </Tooltip>
        )
    }

    const handleLargePreview = (image) => {
        set_largeImagePreview(() => image)
    }

    React.useEffect(() => {
        let { form_code, student } = getUrlParam()
        if (form_code && student) {
            if (user['is_staff']) {
                getQuestionDetails()
            }
            else {
                props.history.push('/dashboard')
            }
        }
        else {
            goToReviewPage()
        }
    }, []);

    const getQuestionDetails = () => {
        let { form_code, student } = getUrlParam()
        set_openDialog(() => true)
        set_loadingDetails(() => true)
        const url = GET_URL.feedbackformforms.api + form_code + '/'
        const param = { student: student }
        getRequest(url, param, props).then(response => {
            if (response && response.status === 200) {
                let radio_answer = ''
                let entered_radio_answer = ''
                let quizUpdated = { ...response.data.data }
                let question_type = getKeyValueMap(questionTypeList, 'id', 'name')
                quizUpdated.question_form.map((data) => {
                    data.question_type_name = `${data.question_type} ( ${question_type[data.question_type]} )`
                    if (data.question_type === 1) {
                        radio_answer = ''
                        data.choice_question.map((choice) => {
                            if (choice.is_answer) {
                                radio_answer = choice.data
                            }
                            if (choice.id == data['response']['choices']) {
                                entered_radio_answer = choice.data
                            }
                        })
                        data.radio_answer = radio_answer
                        data.entered_radio_answer = entered_radio_answer
                    }
                    else if (data.question_type === 2 && data['response']['choices']) {
                        data.choice_question.map((choice) => {
                            if (data['response']['choices'].includes(choice.id)) {
                                choice.is_entered = true
                            }
                        })
                    }
                    else if (data.question_type === 4) {
                        let matchValues = []
                        let matchAnsweredOptions = []
                        let temp = { label: {}, value: {} }
                        let answered_temp = { label: {}, value: {} }
                        let tempAnsweredOptions = {}
                        let answeredIndex = ''
                        data.choice_question.map((field, index) => {
                            tempAnsweredOptions[field['id']] = field
                            if (field.is_answer) {
                                temp['label'] = {}
                                temp['value'] = {}
                                temp['label']['id'] = field.id
                                temp['label']['label'] = field.data
                                temp['label']['uploadedId'] = field.document
                                temp['label']['imagePreview'] = field.document
                                temp['label']['imageName'] = field.document
                                temp['label']['key_value'] = index
                                answered_temp['label'] = { ...temp['label'] }
                                answered_temp['value'] = {}
                                temp['value'] = {}
                                temp['value']['id'] = data.choice_question[field['correct_match_index']].id
                                temp['value']['value'] = data.choice_question[field['correct_match_index']].data
                                temp['value']['uploadedId'] = data.choice_question[field['correct_match_index']].document
                                temp['value']['imagePreview'] = data.choice_question[field['correct_match_index']].document
                                temp['value']['imageName'] = data.choice_question[field['correct_match_index']].document
                                temp['value']['key_value'] = field['correct_match_index']
                                answeredIndex = getIndex(data['response']['extra_data']['match_the_following'][field.id], data.choice_question, 'id');
                                answered_temp['value']['id'] = data.choice_question[answeredIndex].id
                                answered_temp['value']['value'] = data.choice_question[answeredIndex].data
                                answered_temp['value']['correctValue'] = data.choice_question[field['correct_match_index']].id
                                answered_temp['value']['uploadedId'] = data.choice_question[answeredIndex].document
                                answered_temp['value']['imagePreview'] = data.choice_question[answeredIndex].document
                                answered_temp['value']['imageName'] = data.choice_question[answeredIndex].document
                                answered_temp['value']['key_value'] = answeredIndex
                            }
                            if (Object.keys(temp['label']).length !== 0 && Object.keys(temp['value']).length !== 0) {
                                matchValues.push(temp)
                                matchAnsweredOptions.push(answered_temp)
                                temp = { label: {}, value: {} }
                                answered_temp = { label: {}, value: {} }
                            }
                        })
                        data.correctOptions = matchValues
                        data.answeredOptions = matchAnsweredOptions
                    }
                })
                set_quizDetails(() => quizUpdated)
                set_isEvaluated(() => quizUpdated['response_data']['is_evaluated'])
            }
            set_loadingDetails(() => false)
        })
    }

    const handleCloseSnackBar = () => {
        set_openSnackBar(() => false)
    }


    const goToReviewPage = () => {
        if (quizDetails.form_standard_section_mapping_form) {

            let yearInformation = {
                year: quizDetails.academic_year,
                year_name: quizDetails.academic_year_value,
                start_date: quizDetails.start_date,
                end_date: quizDetails.end_date,
                standard_name: quizDetails.form_standard_section_mapping_form[0]['standard_name'],
                current_standard: quizDetails.form_standard_section_mapping_form[0]['standard'],
                currentTab: 'isResponse'
            }
            let searchParam = "?" + new URLSearchParams(yearInformation).toString()
            props.history.push({
                pathname: Actions.set_feedbackform.update.url,
                search: searchParam,
                state: { detail: quizDetails['form_code'] }
            });
        }
        else {
            props.history.push({
                pathname: Actions.set_feedbackform.view.url,
            });
        }
    }

    const handleDialogClose = () => {
        goToReviewPage()
        set_openDialog(() => false)
    }

    const handleOnChange = (e, index) => {
        let { name, value } = e.target;
        let quizDetailsTemp = { ...quizDetails }
        quizDetailsTemp.question_form[index]['response'][name] = value
        set_quizDetails(() => quizDetailsTemp)
        let errorTemp = {}
        delete errorTemp[`points${index}`]
        set_error(() => errorTemp)
        if (value && !floatNumberWithTwoDecimalRegex.value.test(value)) {
            errorTemp = {}
            errorTemp[`points${index}`] = `Invalid Points`
        }
        else if (parseInt(value) > quizDetailsTemp.question_form[index]['score']) {
            errorTemp = {}
            errorTemp[`points${index}`] = `Enter below ${quizDetailsTemp.question_form[index]['score']}`
        }
        set_error(() => errorTemp)
        if (Object.keys(errorTemp).length === 0) {
            updateTotalObtained()
        }
    }

    const updateTotalObtained = () => {
        let total_obtained = 0
        quizDetails.question_form.map((data) => {
            data['response']['points'] = data['response']['points'] ? parseInt(data['response']['points']) : 0
            total_obtained = total_obtained + data['response']['points']
        })
        let quizDetailsTemp = { ...quizDetails }
        quizDetailsTemp['obtained_points'] = total_obtained
        set_quizDetails(() => quizDetailsTemp)
    }

    const validatePostData = (name) => {
        let returnValue = {}
        if (Object.keys(error).length > 0) {
            return false
        }
        let choice_answers = []
        let temp = {}
        quizDetails.question_form.map((data) => {
            if (data.response['id']) {
                temp = {}
                temp['id'] = data.response['id']
                temp['points'] = data.response['points']
                choice_answers.push(temp)
            }
        })
        returnValue['choice_answer_data'] = choice_answers
        returnValue['is_evaluated'] = (name === 'finalize') ? true : false
        return returnValue
    }

    const saveData = (name) => {
        let validate = validatePostData(name)
        if (validate) {
            let title = "<strong>Are you sure want to Submit</strong>"
            let text = "Evaluate is only saving, only when it is finalized student can see points!"
            if (name === 'finalize') {
                title = `<strong>Are you sure want to Finalize</strong>`
                text = "You won't be able to update evaluate!"
            }
            Swal.fire({
                title: title,
                text: text,
                type: 'info',
                showCloseButton: true,
                showCancelButton: true,
                focusConfirm: false,
                confirmButtonText: 'OK',
                cancelButtonText: 'Cancel',
                confirmButtonColor: 'green',
                cancelButtonColor: 'orange',
            }).then((result) => {
                if (result.value) {
                    let url = PUT_URL.feedbackformevaluate.api + quizDetails['response_data']['id'] + '/';
                    putRequest(url, validate, props)
                        .then((response) => {
                            if (response && response.status === 200) {
                                Swal.fire({
                                    position: 'top-end',
                                    type: 'success',
                                    title: response.data.Reason,
                                    showConfirmButton: false,
                                    timer: 1500
                                })
                                handleDialogClose()
                            }
                            set_submitDisable(() => false)
                        });
                }
            })
        }
        else {
            set_alertData(() => <FormattedMessage {...commonMessages.clearAllErrors} />)
            set_openSnackBar(() => true)
        }
    }

    const handleCloseLargeImage = () => {
        set_largeImagePreview(() => '')
    }

    return (
        <Dialog
            fullScreen open={openDialog} onClose={handleDialogClose} TransitionComponent={Transition}>
            <AppBar>
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={() => handleDialogClose()} aria-label="close">
                        <CloseIcon />
                    </IconButton>
                    <Typography variant="h6">
                        Quiz Title - {quizDetails.title}
                    </Typography>
                    {!loadingDetails && isEvaluated &&
                        <Typography variant="h6" className='margin-left-auto'>
                            Evaluated
                        </Typography>
                    }
                </Toolbar>
            </AppBar>
            <Box className='exam-optional-grid-container p-20px'>
                {loadingDetails ?
                    <LoadingGif />
                    :
                    <>
                        {largeImagePreview &&
                            <Box className='set-question-large-image-preview-box'>
                                <img src={largeImagePreview} alt='Image Preview' className='set-question-large-image-preview' />
                                <Tooltip title='Close Image' placement='top-start'>
                                    <Box className='set-question-large-image-remove-icon-box'
                                        onClick={handleCloseLargeImage}>
                                        <HighlightOffIcon className='set-question-large-image-remove-icon' />
                                    </Box>
                                </Tooltip>
                            </Box>
                        }
                        <Box className="year-std-box mr-40">
                            <Box className="academic-std-head"> Student Name</Box>
                            <Box className=" exam-mark-add-heading-bg">{getFullName(quizDetails['student_details']['student_first_name'], quizDetails['student_details']['student_middle_name'], quizDetails['student_details']['student_last_name'])}</Box>
                            <Tooltip
                                title={'Attended / Total'}
                                enterDelay={400}
                                enterNextDelay={400} placement='top-start'
                                classes={{ tooltip: 'tooltip-show-data' }}>
                                <Box display='flex' className='cursor-pointer'>
                                    <Box className="exam-mark-heading-box align-self-center"> Questions</Box>
                                    <Box className=" exam-mark-add-heading-bg">{`${quizDetails['total_question']} / ${quizDetails['total_question']}`}</Box>
                                </Box>
                            </Tooltip>
                            <Box display='flex'>
                                <Box className="academic-std-head align-self-center">
                                    Schedule Range :
                                </Box>
                                <Box className='exam-mark-add-heading-bg fs-18 margin-left-0'>
                                    {dateFormat(quizDetails.start_date, 'DD-MM-YYYY hh:mm A')}
                                </Box>
                                <Box className="academic-std-head align-self-center">
                                    To
                                </Box>
                                <Box className='exam-mark-add-heading-bg fs-18'>
                                    {dateFormat(quizDetails.end_date, 'DD-MM-YYYY hh:mm A')}
                                </Box>
                            </Box>
                            <Tooltip
                                title={'Obtained / Total'}
                                enterDelay={400}
                                enterNextDelay={400} placement='top-start'
                                classes={{ tooltip: 'tooltip-show-data' }}>
                                <Box display='flex' className='cursor-pointer'>
                                    <Box className="exam-mark-heading-box align-self-center"> Points</Box>
                                    <Box className=" exam-mark-add-heading-bg">{`${quizDetails['obtained_points']} / ${quizDetails['total_points']}`}</Box>
                                </Box>
                            </Tooltip>

                        </Box>
                        {quizDetails.question_form.map((data, index) => {
                            return (<Box className='m-t-20px' key={index}>
                                <Box className='m-b-10px m-t-10px fs-18'>{`${index + 1}. ${data.question}`}</Box>
                                <Box display='flex'>
                                    <Box className='quiz-review-left-set'>
                                        <Box display='flex'>
                                            <Box className='quiz-review-label'>Description :</Box>
                                            <Box className='quiz-review-value'> {data.description}</Box>
                                        </Box>
                                        <Box display='flex'>
                                            <Box className='quiz-review-label'>Question Type :</Box>
                                            <Box className='quiz-review-value'> {data.question_type_name}</Box>
                                        </Box>
                                        {data.question_type === 1 &&
                                            <Box display='flex'>
                                                <Box className='quiz-review-label'>Options :</Box>
                                                <Box className='w-40 quiz-review-value'>
                                                    <Box className='quiz-review-label'>Correct Option :</Box>
                                                    <Box>
                                                        <FormControl component="fieldset" className='m-t-10px'>
                                                            <RadioGroup value={data.radio_answer}
                                                                name="selectedRadio" aria-label='selectedRadio'>
                                                                {data.choice_question.map((temp, optionIndex) => {
                                                                    return (
                                                                        <Box key={optionIndex} className='radio-options-outer-box'>
                                                                            <Tooltip
                                                                                title={data.radio_answer === temp.data ? 'Correct Answer' : ''}
                                                                                enterDelay={400}
                                                                                enterNextDelay={400} placement='top-start'
                                                                                classes={{ tooltip: 'tooltip-show-data' }}>
                                                                                <Box display='flex' className='cursor-pointer'>
                                                                                    <Box className={data.radio_answer === temp.data ? 'text-green radio-options-box' : 'radio-options-box'}>
                                                                                        <FormControlLabel value={temp.data} control={<StyledRadio />} label={temp.data} />
                                                                                        {temp.document &&
                                                                                            <Box>{handleImagePreview(temp.document.file)}</Box>
                                                                                        }
                                                                                    </Box>
                                                                                </Box>
                                                                            </Tooltip>
                                                                        </Box>
                                                                    )
                                                                })
                                                                }
                                                            </RadioGroup>
                                                        </FormControl>
                                                    </Box>
                                                </Box>
                                                <Box className='w-40 quiz-review-value'>
                                                    <Box className='quiz-review-label'>Answered Option :</Box>
                                                    <Box>
                                                        <FormControl component="fieldset" className='m-t-10px'>
                                                            <RadioGroup value={data.entered_radio_answer}
                                                                name="selectedRadio" aria-label='selectedRadio'>
                                                                {data.choice_question.map((temp, optionIndex) => {
                                                                    return (
                                                                        <Box key={optionIndex} className='radio-options-outer-box'>
                                                                            <Tooltip
                                                                                title={data.entered_radio_answer === temp.data ? data.radio_answer === data.entered_radio_answer ? 'Correct Answer' : 'Wrong Answer' : ''}
                                                                                enterDelay={400}
                                                                                enterNextDelay={400} placement='top-start'
                                                                                classes={{ tooltip: 'tooltip-show-data' }}>

                                                                                <Box display='flex' className='cursor-pointer'>
                                                                                    <Box className={data.entered_radio_answer === temp.data ? data.radio_answer !== data.entered_radio_answer ? 'text-red radio-options-box' : 'text-green radio-options-box' : data.radio_answer === temp.data ? 'radio-options-box' : 'radio-options-box'}>
                                                                                        <FormControlLabel value={temp.data} control={<StyledRadio />} label={temp.data} />
                                                                                        {temp.document &&
                                                                                            <Box>{handleImagePreview(temp.document.file)}</Box>
                                                                                        }
                                                                                    </Box>
                                                                                </Box>
                                                                            </Tooltip>
                                                                        </Box>
                                                                    )
                                                                })
                                                                }
                                                            </RadioGroup>
                                                        </FormControl>
                                                    </Box>
                                                </Box>
                                            </Box>
                                        }
                                        {data.question_type === 2 &&
                                            <Box display='flex'>
                                                <Box className='quiz-review-label'>Options :</Box>
                                                <Box className='w-40 quiz-review-value'>
                                                    <Box className='quiz-review-label'>Correct Options :</Box>
                                                    <Box>
                                                        <FormControl component="fieldset" className='m-t-10px'>
                                                            <FormGroup>
                                                                {data.choice_question.map((temp, optionIndex) => {
                                                                    return (
                                                                        <Box key={optionIndex} className='radio-options-outer-box'>
                                                                            <Tooltip
                                                                                title={temp.is_answer ? 'Correct Answer' : ''}
                                                                                enterDelay={400}
                                                                                enterNextDelay={400} placement='top-start'
                                                                                classes={{ tooltip: 'tooltip-show-data' }}>
                                                                                <Box className={temp.is_answer ? 'text-green radio-options-box' : 'radio-options-box'}>
                                                                                    <FormControlLabel
                                                                                        control={<Checkbox checked={temp.is_answer} name={temp.data} color='primary' className='padding-l-20-bt-0-r-10px' />}
                                                                                        label={temp.data}
                                                                                    />
                                                                                    {temp.document &&
                                                                                        <Box>{handleImagePreview(temp.document['file'])}</Box>
                                                                                    }
                                                                                </Box>
                                                                            </Tooltip>
                                                                        </Box>
                                                                    )
                                                                })
                                                                }
                                                            </FormGroup>
                                                        </FormControl>
                                                    </Box>
                                                </Box>
                                                <Box className='w-40 quiz-review-value'>
                                                    <Box className='quiz-review-label'>Answered Options :</Box>
                                                    <Box>
                                                        <FormControl component="fieldset" className='m-t-10px'>
                                                            <FormGroup>
                                                                {data.choice_question.map((temp, optionIndex) => {
                                                                    return (
                                                                        <Box key={optionIndex} className='radio-options-outer-box'>
                                                                            <Tooltip
                                                                                title={temp.is_entered ? temp.is_entered === temp.is_answer ? 'Correct Answer' : 'Wrong Answer' : ''}
                                                                                enterDelay={400}
                                                                                enterNextDelay={400} placement='top-start'
                                                                                classes={{ tooltip: 'tooltip-show-data' }}>

                                                                                <Box className={temp.is_entered ? temp.is_answer ? 'text-green radio-options-box' : 'text-red radio-options-box' : 'radio-options-box'}>
                                                                                    <FormControlLabel
                                                                                        control={<Checkbox checked={temp.is_entered} name={temp.data} color='primary' className='padding-l-20-bt-0-r-10px' />}
                                                                                        label={temp.data}
                                                                                    />
                                                                                    {temp.document &&
                                                                                        <Box>{handleImagePreview(temp.document['file'])}</Box>
                                                                                    }
                                                                                </Box>
                                                                            </Tooltip>
                                                                        </Box>
                                                                    )
                                                                })
                                                                }
                                                            </FormGroup>
                                                        </FormControl>
                                                    </Box>
                                                </Box>
                                            </Box>
                                        }
                                        {data.question_type === 3 &&
                                            <Box display='flex'>
                                                <Box className='quiz-review-label'>Options :</Box>
                                                <Box className='w-40 quiz-review-value'>
                                                    <Box className='quiz-review-label'>Correct Answer :   </Box>
                                                    <Box className='quiz-review-value text-bold text-underline'>{data.choice_question[0]['data']}</Box>

                                                </Box>
                                                <Box className='w-40 quiz-review-value'>
                                                    <Box className='quiz-review-label'>Entered Answer :   </Box>
                                                     <Box className='quiz-review-value text-bold text-underline'>{data.response ? data.response['extra_data'] && data.response['extra_data']['oneword'] : ''}</Box>
                                                </Box>
                                            </Box>
                                        }
                                        {data.question_type === 4 &&
                                            <Box display='flex'>
                                                <Box className='quiz-review-label'>Options :</Box>
                                                <Box className='w-40 quiz-review-value'>
                                                    <Box className='quiz-review-label'>Correct Options :</Box>
                                                    <Box>
                                                        {data.correctOptions.map((temp, opIndex) => {
                                                            return (<Box className='match-values-outer-box' key={opIndex}>
                                                                <Box className='match-values-box-90'>
                                                                    <Box className='match-value-index'>
                                                                        {opIndex + 1}.
                                                                    </Box>
                                                                    <Box className='match-values-box'>
                                                                        <Box className='match-value-border'>
                                                                            {temp.label.label}
                                                                            {temp.label.imagePreview &&
                                                                                <Box>{handleImagePreview(temp.label.imagePreview.file)}</Box>
                                                                            }
                                                                        </Box>
                                                                        <Box className='match-value-border'>
                                                                            {temp.value.secondImagePreview &&
                                                                                <Box>{handleImagePreview(temp.value.secondImagePreview.file)}</Box>
                                                                            }
                                                                            {temp.value.value}
                                                                        </Box>
                                                                    </Box>
                                                                </Box>
                                                            </Box>
                                                            )
                                                        })}
                                                    </Box>
                                                </Box>
                                                <Box className='w-40 quiz-review-value'>
                                                    <Box className='quiz-review-label'>Answered Options :</Box>
                                                    <Box>
                                                        {data.answeredOptions.map((temp, opIndex) => {
                                                            return (<Box className='match-values-outer-box' key={opIndex}>
                                                                <Box className='match-values-box-90'>
                                                                    <Box className='match-value-index'>
                                                                        {opIndex + 1}.
                                                                    </Box>
                                                                    <Box className='match-values-box'>
                                                                        <Box className='match-value-border'>
                                                                            {temp.label.label}
                                                                            {temp.label.imagePreview &&
                                                                                <Box>{handleImagePreview(temp.label.imagePreview.file)}</Box>
                                                                            }
                                                                        </Box>
                                                                        <Box className={temp.value.id === temp.value.correctValue ? 'background-green match-value-border' : 'background-red match-value-border'}>
                                                                            {temp.value.secondImagePreview &&
                                                                                <Box>{handleImagePreview(temp.value.secondImagePreview.file)}</Box>
                                                                            }
                                                                            {temp.value.value}
                                                                        </Box>
                                                                    </Box>
                                                                </Box>
                                                            </Box>
                                                            )
                                                        })}
                                                    </Box>
                                                </Box>
                                            </Box>
                                        }
                                    </Box>
                                    <Box className='quiz-review-right-set'>
                                        <Box display='flex'>
                                            <Box className='quiz-review-label'>Points :</Box>
                                            <Box className='quiz-review-value'>{data.score}</Box>
                                        </Box>
                                        <Box display='flex'>
                                            <Box className='quiz-review-label'>Obtained Points :</Box>
                                            {isEvaluated ?
                                                <Box className='quiz-review-value'>{data.response['points'] ? data.response['points'] : 0}</Box> :
                                                <Box className='quiz-review-value'>
                                                    <TextField
                                                        id='points'
                                                        autoComplete='off'
                                                        label=''
                                                        name='points'
                                                        value={data.response['points']}
                                                        className=''
                                                        inputProps={{ maxLength: 4 }}
                                                        fullWidth
                                                        onChange={(e) => handleOnChange(e, index)}
                                                        error={error[`points${index}`] && (error[`points${index}`])}
                                                        helperText={error[`points${index}`] && (error[`points${index}`])}
                                                    />
                                                </Box>
                                            }

                                        </Box>
                                    </Box>
                                </Box>
                                <Box mt={1} mb={1}>
                                    <Divider />
                                </Box>
                            </Box>)
                        })}
                        {!isEvaluated &&
                            <Box className="submt-button-float-bottom ">
                                <Box className='display-flex'>
                                    <Button variant='contained'
                                        color='primary' className='submit'
                                        onClick={() => saveData()}
                                        disabled={submitDisable}
                                    >submit

                                    </Button>
                                    <Button variant='contained'
                                        color='primary' className='submit ml-20'
                                        onClick={() => saveData('finalize')}
                                        disabled={submitDisable}
                                    >Finalize
                                    </Button>
                                </Box>
                            </Box>
                        }
                    </>
                }
                <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={openSnackBar} autoHideDuration={2000} onClose={handleCloseSnackBar}>
                    <Alert onClose={handleCloseSnackBar} severity="error">
                        {alertData}
                    </Alert>
                </Snackbar>
            </Box>
        </Dialog>
    )
}
)
export default withRouter(EvaluateStudentFeedBackForm)