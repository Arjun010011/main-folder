import React, { Component } from 'react'
import {
    Divider, makeStyles, Dialog, AppBar, Toolbar, IconButton, Typography, Slide, Grid, Box, Tooltip, LinearProgress,
    FormControlLabel, Switch, Button, RadioGroup, FormControl, Radio, TextField, FormGroup, Checkbox, CircularProgress
} from '@material-ui/core';
import moment from 'moment';

import clsx from 'clsx';
import CloseIcon from '@material-ui/icons/Close';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import PlayCircleOutlineIcon from '@material-ui/icons/PlayCircleOutline';
import CheckCircle from '@material-ui/icons/CheckCircle';
// import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReplayIcon from '@material-ui/icons/Replay';

// import ArrowCircleLeftOutlinedIcon from '@mui/icons-material/ArrowCircleLeftOutlined';
// import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';

import PauseOutlineIcon from '@material-ui/icons/Pause';
import ReactPlayer from 'react-player'
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls';
import Swal from 'sweetalert2'
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import { getKeyValueMap, Alert, getTimeFormatFromSeconds } from 'Includes/functions';
import DragIndicatorIcon from '@material-ui/icons/DragIndicator';
import { getUrlParam } from 'Includes/functions';
import { Actions } from 'Constants/permissions';
import Snackbar from '@material-ui/core/Snackbar';
import commonMessages from 'Constants/messages'
import { FormattedMessage } from 'react-intl';
import BlankPagewithIcon from 'Components/BlankPageWithIcon'
import LoadingGif from 'Components/LoadingGif';
import { withRouter } from 'react-router-dom';

const user = localStorage.getItem("user")!='undefined'?JSON.parse(localStorage.getItem("user")):'';

function getIndex(value, arr, prop) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i][prop] === value) {
            return i;
        }
    }
    return -1; //to handle the case where the value doesn't exist
}

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


const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

class AttendVideoFeedBackForm extends Component {
    constructor(props) {
        super(props)

        this.state = {
            open: false,
            tabValue: 0,
            isPrompt: false,
            openSnackBar: false,
            acknowledged: false,
            showExitPrompt: false,
            isMobileScreen: false,
            questions: [],
            isAgreed: true,
            count: 0,
            radioAnswer: '',
            submitted_question: [],
            current_sequence: 1,
            getDetails: {},
            total_sequence: '',
            oneWordAnswer: '',
            error: {},
            answeredOptions: [],
            selectedIndices: [],
            loadingQuestion: true,
            openSnackBar: false,
            is_required: false,
            time: {},
            seconds: '',
            forceSubmit: false,
            total_time: '',
            form_id: '',
            show_answer_after_submit: false,
            is_already_submitted: false,
            correct_radio_answer: '',
            preview: {},
            playing: false,
            playedSeconds: 0.00001,
            question_list: [],
            is_question_exist: false,
            is_submitted: true,
            disableVideo: false,
            rePlaySecond: 0,
            stopPlay: false,
            currentSeek: 0,
            getSecondFormat: 'HH:mm:ss',
            all_question_attended: false,
            loadingVideo: true,
            apiCalled: false,
            isTotalTimeCompleted: false,
            is_questions_at_end:false
        }
        this.timer = 0;
        this.startTimer = this.startTimer.bind(this);
        this.countDown = this.countDown.bind(this);
        this.totalTimer = 0;
        this.startTotalTimer = this.startTotalTimer.bind(this);
        this.countDownTotal = this.countDownTotal.bind(this);

        this.player = React.createRef()
    }

    handleClose = () => {
        this.setState({
            open: false,
            acknowledged: false,
            showExitPrompt: false,
            questions: [],
            isAgreed: false,
            current_sequence: 1,
            submitted_question: [],
            total_time: ''
        })
        this.props.history.push(Actions.attend_feedbackform_list.view.url)
        clearInterval(this.totalTimer);
        this.handleCloseSnackBar()
    }

    handleSubmitTrigger = () => {
        Swal.fire({
            title: `<strong>Are you sure want to Submit</strong>`,
            text: "You won't be able to update quiz!",
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
                this.setState({
                    forceSubmit: true
                }, () => {
                    this.handleSubmit('submit')
                })
            }
        })
    }



    handleSubmit = (name, sequenceTemp) => {
        let { current_sequence, show_answer_after_submit, next_question_second, is_questions_at_end,
            total_seconds, is_already_submitted } = this.state;
        let validate_post_data = this.validate_post_method(name)
        if (validate_post_data && validate_post_data !== 'dontSubmit') {

            const url = POST_URL.feedbackformresponse.api
            postRequest(url, validate_post_data, this.props).then(response => {
                if (response && response.status === 200) {
                    let sequence = ''
                    if (name === 'button') {
                        sequence = sequenceTemp
                    }
                    else if (name === 'next') {
                        sequence = parseInt(current_sequence) + 1
                    }
                    else if (name === 'previous') {
                        sequence = parseInt(current_sequence) - 1
                    }
                    else if (name === 'submit') {
                        if (parseInt(next_question_second) === parseInt(total_seconds)) {
                            this.handleClose()
                        }
                        else {
                            this.setState({
                                all_question_attended: true,
                                next_question_second: parseInt(total_seconds)
                            })
                        }
                    }
                    if (name !== 'submit') {
                        if(is_questions_at_end){
                            next_question_second= parseInt(total_seconds)
                        }
                        this.setState({
                            openSnackBar: true,
                            severityStatus: 'success',
                            alertData: 'Data Submitted',
                            is_question_exist: is_questions_at_end,
                            rePlaySecond: next_question_second,
                            is_submitted: true,
                            playing: false
                        })
                        if (show_answer_after_submit && !is_already_submitted) {
                            this.getQuestions(current_sequence)
                        }
                        else {
                            this.getQuestions()
                        }
                    }
                }
                this.setState({ submitDisable: false })
            })
        }
        else if (validate_post_data === 'dontSubmit') {
            let  sequence = parseInt(current_sequence) + 1
            if (name === 'button') {
                sequence = sequenceTemp
            }
            else if (name === 'next') {
                sequence = parseInt(current_sequence) + 1
            }
            else if (name === 'previous') {
                sequence = parseInt(current_sequence) - 1
            }
            else if (name === 'submit') {
                if (parseInt(next_question_second) === parseInt(total_seconds)) {
                    this.handleClose()
                }
                else {
                    this.setState({
                        all_question_attended: true,
                        next_question_second: parseInt(total_seconds)
                    })
                }
            }
            if (name !== 'submit') {
                this.setState({
                    openSnackBar: true,
                    severityStatus: 'success',
                    alertData: 'Data Submitted',
                    is_question_exist: false,
                    rePlaySecond: next_question_second,
                    is_submitted: true,
                    playing: is_questions_at_end
                })
                this.getQuestions(sequence)
            }
        }
    }

    updateLastSequence = (sequenceTemp) => {
        this.setState({
            current_sequence: sequenceTemp
        }, () => {
            this.handleAgreed()
        })
    }

    validateSkipQuestion = (name, sequenceTemp) => {
        Swal.fire({
            title: `<strong>Are you sure want to change Question</strong>`,
            text: "You won't be able to come back again this question!",
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
                clearInterval(this.timer);
                this.setState({
                    seconds: 0
                }, () => {
                    if (name === 'button') {
                        this.handleSubmit('button', sequenceTemp)
                    }
                    else {
                        this.handleSubmit(name)
                    }
                })
            }
        })
    }

    validate_post_method = (name, sequenceTemp) => {
        const { questions, choice_id, is_required, getDetails, radioAnswer, oneWordAnswer, is_already_submitted,
            answeredOptions, seconds, error, forceSubmit, is_already_attended, form_id, show_answer_after_submit
        } = this.state;
        let validate = false
        let returnValue = ''
        if (seconds !== '' && seconds !== 0 && name !== 'submit' && !is_already_attended) {
            validate = this.validateSkipQuestion(name, sequenceTemp)
        }
        else {
            validate = true
        }
        if (validate) {
            let errorData = ''
            if (is_required && !is_already_attended && (seconds === '' || forceSubmit)) {
                if (questions['question_type'] === 1 && radioAnswer === '') {
                    validate = false
                    errorData = 'Choice is mandatory'
                }
                else if (questions['question_type'] === 2) {
                    let choices = this.getCheckBoxChoices()
                    if (choices.length === 0) {
                        validate = false
                        errorData = 'Choices are mandatory'
                    }
                }
                else if (questions['question_type'] === 3 && oneWordAnswer === '') {
                    validate = false
                    errorData = 'Answer is mandatory'
                    error['oneWordAnswer'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
                }
            }
            else if (name !== 'submit') {
                if (questions['question_type'] === 1 && radioAnswer === '') {
                    validate = true
                }
                else if (questions['question_type'] === 2) {
                    let choices = this.getCheckBoxChoices()
                    if (choices.length === 0) {
                        validate = true
                    }
                }
                else if (questions['question_type'] === 3 && oneWordAnswer === '') {
                    validate = true
                }
            }
            else if (name == 'submit') {
                if (questions['question_type'] === 1 && radioAnswer === '') {
                    validate = 'onlySubmit'
                }
                else if (questions['question_type'] === 2) {
                    let choices = this.getCheckBoxChoices()
                    if (choices.length === 0) {
                        validate = 'onlySubmit'
                    }
                }
                else if (questions['question_type'] === 3 && oneWordAnswer === '') {
                    validate = 'onlySubmit'
                }
            }
            if (is_already_submitted && show_answer_after_submit && name !== 'submit') {
                validate = 'dontSubmit'
            }
            if (validate && validate !== 'dontSubmit' && validate !== 'onlySubmit') {
                let post_data = {
                    "response_data": [
                        {
                            "document": "",
                            "question": questions['id'],
                            "choices": []
                        }
                    ],
                    'student': user.student && user.student['id'],
                    'form': form_id,
                    'responder_ip': ''
                }
                if (getDetails.response_data && getDetails.response_data.id) {
                    post_data['id'] = getDetails.response_data.id
                }
                if (getDetails['current_question']['response'] && getDetails['current_question']['response']['id']) {
                    post_data['response_data'][0]["id"] = getDetails['current_question']['response']['id']
                }
                if (name === 'submit') {
                    post_data['is_submitted'] = true
                }


                if (questions['question_type'] === 1) {
                    let choice_id_temp = choice_id ? [choice_id] : []
                    post_data['response_data'][0]["choices"] = choice_id_temp
                }
                else if (questions['question_type'] === 2) {
                    post_data['response_data'][0]["choices"] = this.getCheckBoxChoices()
                }
                else if (questions['question_type'] === 3) {
                    post_data['response_data'][0]["extra_data"] = {
                        "oneword": oneWordAnswer
                    }
                }
                else if (questions['question_type'] === 4) {
                    let shuffle_temp = {}
                    answeredOptions.map((data) => {
                        shuffle_temp[data['label']['id']] = data['value']['id']
                    })
                    post_data['response_data'][0]["extra_data"] = {
                        "match_the_following": shuffle_temp
                    }
                }
                returnValue = post_data
            }
            else if (validate === false) {
                this.setState({
                    openSnackBar: true,
                    severityStatus: 'error',
                    alertData: errorData,
                    forceSubmit: false,
                    error
                })
            }
            else if (validate === 'dontSubmit') {
                returnValue = validate
            }
            else if (validate === 'onlySubmit') {
                returnValue = {
                    "response_data": [
                        {
                            "document": "",
                            "question": questions['id'],
                            "choices": []
                        }
                    ],
                    'student': user.student && user.student['id'],
                    'form': form_id,
                    'responder_ip': '',
                    'only_submit_data': true,
                    'is_submitted': true
                }
            }
        }
        return returnValue
    }

    getCheckBoxChoices = () => {
        const { questions} = this.state;
        let returnValue=[]
        questions['choice_question'].map((data) => {
            if (data.is_answer) {
                returnValue.push(data.id)
            }
        })
        return returnValue
    }


    componentDidMount() {
        let { selectedQuiz, quizName } = getUrlParam()
        if (selectedQuiz && quizName) {
            this.setState({
                selectedQuiz,
                quizName,
            }, () => {
                this.getTermsAndCondition()
            })
        }
        else {
            this.props.history.push(Actions.attend_feedbackform_list.view.url)
        }
    }

    getTermsAndCondition = () => {
        let { selectedQuiz, isAgreed, loadingVideo } = this.state;
        const url = GET_URL.termsandcondition.api + selectedQuiz + '/'
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                if (response.data.data['show_terms_and_condition']) {
                    isAgreed = false
                    loadingVideo = false
                }
                else {
                    isAgreed = true
                    this.getQuestions()
                }
                this.setState({
                    isAgreed,
                    loadingVideo
                })
            }
        })
    }

    getQuestions = (sequence, name) => {
        let validate = false
        if (name === 'button') {
            validate = this.validate_post_method(name, sequence)
        }
        else {
            validate = true
        }
        if (validate) {
            let { selectedQuiz, oneWordAnswer, radioAnswer, choice_id, correct_radio_answer, is_already_attended,
                next_question_second, playedSeconds, is_already_submitted, is_question_exist } = this.state;
            is_already_attended = false
            const url = GET_URL.feedbackformforms.api + selectedQuiz + '/'
            let param = { is_active: true }
            if (sequence) {
                param['sequence'] = sequence
            }
            this.setState({
                current_sequence: sequence,
                loadingQuestion: true,
                show_answer_after_submit: false,
                is_already_submitted: false
            })
            is_already_submitted = false
            oneWordAnswer = ''
            radioAnswer = ''
            correct_radio_answer = ''
            getRequest(url, param, this.props).then(response => {
                if (response && response.status === 200) {
                    let question_list = []
                    let answeredOptions = []
                    let correctOptions = []
                    question_list = response.data.data.question_form
                    for (let index = 0; index < question_list.length; index++) {
                        if (!question_list[index]['response']['id']) {
                            next_question_second = question_list[index]['question_start_time']
                            sequence = question_list[index]['sequence']
                            break;
                        }
                    }
                    if (!response.data.data['is_already_attended']) {
                        if (response.data.data.current_question['question_type'] === 1 && response.data.data.current_question['response'].choices) {
                            response.data.data.current_question.choice_question.map((field) => {
                                if (field.id === response.data.data.current_question['response'].choices[0]) {
                                    radioAnswer = field.data
                                    choice_id = response.data.data.current_question['response'].choices[0]
                                }
                                if (field.is_answer) {
                                    correct_radio_answer = field.data
                                }
                            })
                            is_already_submitted = true
                        }
                        else if (response.data.data.current_question['question_type'] === 2 && response.data.data.current_question['response'].choices) {
                            response.data.data.current_question.choice_question.map((field) => {
                                if (response.data.data.current_question['response'].choices.includes(field.id)) {
                                    field['is_entered'] = true
                                }
                            })
                            is_already_submitted = true
                        }
                        else if (response.data.data.current_question['question_type'] === 3 && response.data.data.current_question['response'].choices) {
                            oneWordAnswer = response.data.data.current_question['response']['extra_data']['oneword']
                            is_already_submitted = true
                        }
                        else if (response.data.data.current_question['question_type'] === 4) {
                            let shuffled_temp = { label: {}, value: {} }
                            if (response.data.data.current_question.response && response.data.data.current_question.show_answer_after_submit && response.data.data.current_question.response['extra_data']) {
                                is_already_submitted = true
                                let matchValues = []
                                let matchAnsweredOptions = []
                                let temp = { label: {}, value: {} }
                                let answered_temp = { label: {}, value: {} }
                                let tempAnsweredOptions = {}
                                let answeredIndex = ''
                                let data = response.data.data.current_question
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
                                correctOptions = matchValues
                                answeredOptions = matchAnsweredOptions
                            }
                            else if (response.data.data.current_question.response && !response.data.data.current_question.show_answer_after_submit && response.data.data.current_question.response['extra_data']) {
                                Object.keys(response.data.data.current_question.response['extra_data']['match_the_following']).map((data) => {
                                    response.data.data.current_question.choice_question.map((field, index) => {
                                        if (parseInt(data) === parseInt(field.id)) {
                                            shuffled_temp['label'] = {}
                                            shuffled_temp['label']['id'] = field.id
                                            shuffled_temp['label']['label'] = field.data
                                            shuffled_temp['label']['uploadedId'] = field.document
                                            shuffled_temp['label']['imagePreview'] = field.document
                                            shuffled_temp['label']['imageName'] = field.document
                                            shuffled_temp['label']['key_value'] = index
                                        }
                                        if (parseInt(response.data.data.current_question.response['extra_data']['match_the_following'][data]) === parseInt(field.id)) {
                                            shuffled_temp['value'] = {}
                                            shuffled_temp['value']['id'] = field.id
                                            shuffled_temp['value']['value'] = field.data
                                            shuffled_temp['value']['uploadedId'] = field.document
                                            shuffled_temp['value']['imagePreview'] = field.document
                                            shuffled_temp['value']['imageName'] = field.document
                                            shuffled_temp['value']['key_value'] = index
                                        }
                                    })
                                    if (Object.keys(shuffled_temp['label']).length !== 0 && Object.keys(shuffled_temp['value']).length !== 0) {
                                        answeredOptions.push(shuffled_temp)
                                        shuffled_temp = { label: {}, value: {} }
                                    }
                                })
                            }
                            else {
                                response.data.data.current_question.choice_question.map((field, index) => {
                                    if (field.is_answer) {
                                        shuffled_temp['label'] = {}
                                        shuffled_temp['label']['id'] = field.id
                                        shuffled_temp['label']['label'] = field.data
                                        shuffled_temp['label']['uploadedId'] = field.document
                                        shuffled_temp['label']['imagePreview'] = field.document
                                        shuffled_temp['label']['imageName'] = field.document
                                        shuffled_temp['label']['key_value'] = index
                                        shuffled_temp['value'] = {}
                                        shuffled_temp['value']['id'] = response.data.data.current_question.choice_question[field['shuffled_match_index']].id
                                        shuffled_temp['value']['value'] = response.data.data.current_question.choice_question[field['shuffled_match_index']].data
                                        shuffled_temp['value']['uploadedId'] = response.data.data.current_question.choice_question[field['shuffled_match_index']].document
                                        shuffled_temp['value']['imagePreview'] = response.data.data.current_question.choice_question[field['shuffled_match_index']].document
                                        shuffled_temp['value']['imageName'] = response.data.data.current_question.choice_question[field['shuffled_match_index']].document
                                        shuffled_temp['value']['key_value'] = field['shuffled_match_index']
                                    }
                                    if (Object.keys(shuffled_temp['label']).length !== 0 && Object.keys(shuffled_temp['value']).length !== 0) {
                                        answeredOptions.push(shuffled_temp)
                                        shuffled_temp = { label: {}, value: {} }
                                    }
                                })
                            }
                        }
                    }
                    else {
                        is_already_attended = true
                        clearInterval(this.timer);
                    }
                    if (response.data.data.current_question.time_limit_to_answer) {
                        response.data.data.current_question.time_limit_to_answer = parseInt(response.data.data.current_question.time_limit_to_answer)
                    }
                    if (response.data.data.current_question.show_answer_after_submit && is_already_submitted) {
                        is_question_exist = true
                        next_question_second = playedSeconds
                    }
                    this.setState({
                        questions: response.data.data.current_question,
                        current_sequence: response.data.data.current_question['sequence'],
                        next_question_second,
                        is_question_exist,
                        getDetails: response.data.data,
                        total_sequence: response.data.data.last_question_sequence,
                        answeredOptions,
                        radioAnswer,
                        oneWordAnswer,
                        choice_id,
                        loadingQuestion: false,
                        seconds: response.data.data.current_question.time_limit_to_answer,
                        is_required: response.data.data.current_question['required'],
                        is_already_attended,
                        form_id: response.data.data.id,
                        show_answer_after_submit: response.data.data.current_question.show_answer_after_submit,
                        is_already_submitted,
                        correct_radio_answer,
                        correctOptions,
                        answeredOptions,
                        question_list,
                        loadingVideo: false,
                        preview: { url: response.data.data.document.file },
                        is_questions_at_end:response.data.data.is_questions_at_end
                    }, () => {
                        if (parseInt(response.data.data['total_time'])) {
                            this.checkTotalTime(response.data.data)
                        }
                    })

                }
            })
        }
    }

    checkTotalTime = (response) => {
        let total_time = parseInt(response['total_time'])
        if (!response['response_track'][0]) {
            this.setState({ total_time: total_time })
            this.startTotalTimer(total_time)
            return
        }
        const today = moment(new Date())
        total_time = parseInt(total_time) + 10
        let fromValue = moment(response['response_track'][0]['start_time']).add(total_time, 'seconds');
        if (fromValue.diff(today, 'seconds') > 0) {
            this.setState({ total_time: fromValue.diff(today, 'seconds') })
            this.startTotalTimer(fromValue.diff(today, 'seconds'))
        }
        else {
            this.setState({ isTotalTimeCompleted: true, blankData: 'Total time is completed', })
        }
    }

    handleAgreed = () => {
        this.setState({
            isAgreed: true,
            loadingVideo: true
        })
        window.addEventListener('beforeunload', (event) => {
            if (this.state.showExitPrompt) {
                event.returnValue = 'Quiz is not submited. Sure you want to leave?';
            }
        });
        this.getQuestions()
    }

    handleChange = (e) => {
        const { name, value } = e.target;
        this.setState({
            [name]: value
        })
    }

    handleRadioChange = (e, value, choices) => {
        let choice_id = getKeyValueMap(choices, 'data', 'id')
        choice_id = choice_id[value]
        this.setState({
            radioAnswer: value,
            choice_id
        })
    }

    handleCheckBoxChange = (index) => {
        let { questions } = this.state;
        questions['choice_question'][index]['is_answer'] = !questions['choice_question'][index]['is_answer']
        this.setState({
            questions
        })
    }

    handleDragStart = (event, index) => {
        event.stopPropagation();
        let fromBox = JSON.stringify({ index: index });
        event.dataTransfer.setData("dragContent", fromBox);
        this.setState({ isDragging: true })
    };

    handleDragOver = event => {
        event.stopPropagation();
        event.preventDefault(); // Necessary. Allows us to drop.
        return false;
    };

    handleDrop = (event, index) => {
        event.stopPropagation();
        event.preventDefault();
        let fromBox = JSON.parse(event.dataTransfer.getData("dragContent"));
        this.swapBColumns(fromBox.index, index);
        return false;
    };

    onselectSectionB = (index) => {
        let { isMobileScreen, selectedIndices } = this.state;
        if (isMobileScreen && selectedIndices.includes(index)) {
            const ind = selectedIndices.indexOf(index)
            selectedIndices.splice(ind, 1)

            this.setState({ selectedIndices });
        }
        else if (isMobileScreen && selectedIndices.length < 2) {
            selectedIndices.push(index);
            this.setState({ selectedIndices });
        }
        else if (isMobileScreen && selectedIndices.length === 2) {
            selectedIndices[1] = index;
            this.setState({ selectedIndices });
        }
    }

    swapBColumns = (from_index, to_index) => {
        let answeredOptions = [...this.state.answeredOptions];
        let temp = answeredOptions[from_index]['value'];
        answeredOptions[from_index]['value'] = answeredOptions[to_index]['value']
        answeredOptions[to_index]['value'] = temp
        this.setState({ answeredOptions, selectedIndices: [], isDragging: false });
    }

    handleCloseSnackBar = () => {
        this.setState({
            openSnackBar: false
        })
    }

    startTimer() {
        if (this.timer == 0 && this.state.seconds > 0) {
            this.timer = setInterval(this.countDown, 1000);
        }
    }

    countDown() {
        let { seconds, openSnackBar, alertData, severityStatus, total_sequence, current_sequence } = this.state;
        let secondsTemp = seconds - 1;
        if (parseInt(secondsTemp) === 10) {
            openSnackBar = true
            alertData = 'Running out of time !!!'
            severityStatus = 'error'
        }
        this.setState({
            seconds: secondsTemp,
            alertData,
            severityStatus,
            openSnackBar
        });
        if (secondsTemp == 0) {
            clearInterval(this.timer);
            this.timer = 0
            if (total_sequence === current_sequence) {
                this.handleSubmit('submit')
            }
            else {
                this.handleSubmit('next')
            }
        }
    }

    startTotalTimer(seconds) {
        if (this.totalTimer == 0 && seconds > 0) {
            this.totalTimer = setInterval(this.countDownTotal, 1000);
        }
    }

    countDownTotal() {
        let { total_time, openSnackBar, alertData, severityStatus } = this.state;
        let total_timeTemp = total_time - 1;
        if (parseInt(total_timeTemp) === 10) {
            openSnackBar = true
            alertData = 'Running out of time !!!'
            severityStatus = 'error'
        }
        this.setState({
            total_time: total_timeTemp,
            alertData,
            severityStatus,
            openSnackBar
        });
        // Check if we're at zero.
        if (total_timeTemp == 0) {
            clearInterval(this.totalTimer);
            this.totalTimer = 0
            this.handleSubmit('submit')
        }
    }

    handleImagePreview = (imagePreview) => {
        return (
            <Tooltip title='Preview Image' placement='top-start'>
                <Box className='set-question-image-preview-outer-box'>
                    <img src={imagePreview} alt='image' className='set-question-uploaded-image' />
                    <Box onClick={() => this.handleLargePreview(imagePreview)} className='set-question-image-preview-icon'><VisibilityOutlinedIcon /> </Box>
                </Box>
            </Tooltip>
        )
    }

    handleLargePreview = (image) => {
        this.setState({
            largeImagePreview: image
        })
    }

    handleCloseLargeImage = () => {
        this.setState({
            largeImagePreview: ''
        })
    }

    handleDuration = (duration) => {
        let { next_question_second, all_question_attended } = this.state;
        if (next_question_second === undefined) {
            all_question_attended = true
            next_question_second = parseInt(duration)
        }
        this.setState({
            total_seconds: duration,
            getSecondFormat: duration < 3600 ? 'mm:ss' : 'HH:mm:ss',
            next_question_second,
            all_question_attended
        })
    }

    handleProgress = state => {
        let { next_question_second, is_submitted, is_question_exist, playing, seconds } = this.state;
        let secondsTemp = state.playedSeconds ? state.playedSeconds : 0
        next_question_second = parseInt(next_question_second)
        secondsTemp = parseInt(secondsTemp)
        if ((is_submitted || is_question_exist) && next_question_second === secondsTemp) {
            if (parseInt(seconds)) {
                this.startTimer()
            }
            is_question_exist = next_question_second === secondsTemp
            playing = next_question_second !== secondsTemp
            is_submitted = false
        }
        this.setState({
            playedSeconds: secondsTemp,
            playing,
            is_question_exist,
            is_submitted,
            currentSeek: secondsTemp
        })
    }

    handleSeek = (seconds) => {
        let { next_question_second, playedSeconds } = this.state;
        next_question_second = parseInt(next_question_second)
        seconds = parseInt(seconds)
        if (seconds > next_question_second) {
            this.setState({
                playing: false
            })
            this.player.current.seekTo(playedSeconds)
        }
        this.setState({
            currentSeek: seconds
        })
    }

    handleArrowLeft = () => {
        const { playedSeconds } = this.state;
        this.player.current.seekTo(playedSeconds - 5)
    }

    handleArrowRight = () => {
        const { next_question_second, playedSeconds } = this.state;
        if (playedSeconds > next_question_second) {
            this.setState({
                playing: false
            })
        }
        this.player.current.seekTo(playedSeconds + 5)
    }

    handleChangeSeek = (e) => {
        this.player.current.seekTo(e.target.value)
    }

    handleReplayIcon = () => {
        const { rePlaySecond } = this.state;
        this.player.current.seekTo(rePlaySecond)
        this.setState({
            playing: true
        })
    }

    render() {
        let { isAgreed, acknowledged, questions, loadingVideo, severityStatus, radioAnswer, is_question_exist, submitDisable,
            current_sequence, total_sequence, oneWordAnswer, error, answeredOptions, disableVideo, next_question_second,
            openSnackBar, alertData, seconds, total_time, largeImagePreview, quizName, is_already_submitted, show_answer_after_submit,
            correct_radio_answer, correctOptions, preview, playing, playedSeconds, question_list, total_seconds,
            currentSeek, getSecondFormat, all_question_attended, isTotalTimeCompleted, blankData,is_questions_at_end
        } = this.state;
        return (
            <div>
                {largeImagePreview &&
                    <Box className='set-question-large-image-preview-box'>
                        <img src={largeImagePreview} alt='Image Preview' className='set-question-large-image-preview' />
                        <Tooltip title='Close Image' placement='top-start'>
                            <Box className='set-question-large-image-remove-icon-box'
                                onClick={this.handleCloseLargeImage}>
                                <HighlightOffIcon className='set-question-large-image-remove-icon' />
                            </Box>
                        </Tooltip>
                    </Box>
                }
                <Dialog
                    fullScreen open={true} onClose={this.handleClose} TransitionComponent={Transition}>
                    <AppBar>
                        <Toolbar>
                            {(!isAgreed || isTotalTimeCompleted) &&
                                <IconButton edge="start" color="inherit" onClick={() => this.handleClose()} aria-label="close">
                                    <CloseIcon />
                                </IconButton>
                            }
                            <Typography variant="h6">
                                Video Quiz Title - {quizName}
                            </Typography>
                        </Toolbar>
                    </AppBar>
                    {loadingVideo ?
                        <LoadingGif />
                        :
                        <Box className='exam-optional-grid-container p-20px'>
                            {isAgreed ?
                                isTotalTimeCompleted ?
                                    <Box className='margin-top-40'>
                                        <BlankPagewithIcon data={blankData} />
                                    </Box>
                                    :
                                    <Box>
                                        <Box display='flex'>
                                            <Box className='quiz-total-time-attend-label'>Total Time limits :</Box>
                                            <Box className={total_time && parseInt(total_time) < 10 ? 'breathing-button quiz-total-time-value red-text font-weight-bold fs-18' : 'quiz-total-time-value red-text  font-weight-bold fs-18'}>{!total_time ? '---' : total_time && getTimeFormatFromSeconds(total_time, getSecondFormat)}</Box>
                                        </Box>
                                        <Grid container>
                                            <Grid item md={6} xs={12}>
                                                <Box display='flex' className='flex-justify-space-between position-relative'>
                                                    <Box style={{ textAlign: '-webkit-center', marginLeft: '-13px' }}>
                                                        Start
                                                        <Divider orientation='horizontal' style={{ width: '4px', height: '15px', backgroundColor: '#84aaff' }} />
                                                    </Box>
                
                                                    {!is_questions_at_end && question_list.map((data, index) => {
                                                        return (<Box key={index} style={{ textAlign: '-webkit-center', position: 'absolute', left: `${(data.question_start_time / total_seconds) * 100}%`, marginLeft: '-27px' }}>
                                                            {getTimeFormatFromSeconds(data.question_start_time, getSecondFormat)}
                                                            <Divider orientation='horizontal' style={{ width: '4px', height: '15px', backgroundColor: '#84aaff' }} />
                                                            {data['response']['id'] &&
                                                                <CheckCircle className='text-green margin-top-5'/>
                                                            }
                                                        </Box>
                                                        )
                                                    })
                                                    }
                                                    <Box style={{ textAlign: '-webkit-center', marginRight: '-10px' }}>
                                                        End
                                                        <Divider orientation='horizontal' style={{ width: '4px', height: '15px', backgroundColor: '#84aaff' }} />
                                                    </Box>
                                                </Box>
                                                <LinearProgress variant="determinate" value={`${(playedSeconds / total_seconds) * 100}`} />
                                            </Grid>
                                        </Grid>
                                        <Box className='question-block-attend-quiz m-t-25px'>
                                            <Grid container>
                                                <Grid item md={6} xs={12} className={disableVideo ? 'pointer-event-none' : ''}>
                                                    <Box style={{ height: '375px' }}>
                                                        <ReactPlayer
                                                            ref={this.player}
                                                            url={preview.url}
                                                            width='100%'
                                                            height='100%'
                                                            controls={false}
                                                            playing={playing}
                                                            onDuration={this.handleDuration}
                                                            // onReady={()=>this.setState({playing:true})}
                                                            onProgress={this.handleProgress}
                                                            onSeek={this.handleSeek}
                                                            config={{
                                                                file: {
                                                                    attributes: {
                                                                        controlsList: 'nodownload',
                                                                        onContextMenu: e => e.preventDefault()
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                    </Box>
                                                    <Box className='custom-control-box'>
                                                        <Box className='display-flex'>
                                                            <Box className='time-playing-video'>
                                                                {getTimeFormatFromSeconds(playedSeconds, getSecondFormat)}
                                                            </Box>
                                                            <Box className='display-flex place-content-center align-items-center'>
                                                                {playing ?
                                                                    <PauseOutlineIcon
                                                                        onClick={() => this.setState({ playing: false })}
                                                                        className='play-icon-attend-video cursor-pointer' />
                                                                    :
                                                                    (parseInt(playedSeconds) === parseInt(next_question_second)) ?
                                                                        <ReplayIcon
                                                                            onClick={() => this.handleReplayIcon()}
                                                                            className='play-icon-attend-video cursor-pointer' />
                                                                        :
                                                                        <PlayCircleOutlineIcon
                                                                            onClick={() => this.setState({ playing: true })}
                                                                            className='play-icon-attend-video cursor-pointer' />
                                                                }
                                                            </Box>
                                                        </Box>
                                                        <Box className='flex-justify-space-between '>
                                                            <Box>Start Time</Box>
                                                            <Box>{is_questions_at_end?'Questions at the end':all_question_attended ? 'End Time' : 'Next Question In'}</Box>
                                                        </Box>
                                                        <Box className='w-100 display-flex align-items-center'>
                                                            <Box>{getTimeFormatFromSeconds(0, getSecondFormat)}</Box>
                                                            <input
                                                                type='range'
                                                                min={0}
                                                                className='w-100 cursor-pointer'
                                                                max={next_question_second}
                                                                onInput={(e) => this.handleChangeSeek(e)}
                                                                value={currentSeek}
                                                            />
                                                            <Box>{getTimeFormatFromSeconds(next_question_second, getSecondFormat)}</Box>
                                                        </Box>
                                                    </Box>
                                                </Grid>
                                                <Grid item md={4} xs={8} className='padding-left-20'>
                                                    {(!is_question_exist || all_question_attended) ?
                                                        <>
                                                            {all_question_attended ?
                                                                <Box className='create-expenses-info-outer-box'>
                                                                    <Box className='expense-add-fuel-review'>
                                                                        Quiz Overview
                                                                    </Box>
                                                                    <Box className='create-expenses-outer-box-label-value'>
                                                                        <Box className='create-expenses-label'>Total Questions</Box>
                                                                        <Box className='create-expenses-value font-weight-bold'>{total_sequence}</Box>
                                                                    </Box>
                                                                    <Box className='create-expenses-outer-box-label-value'>
                                                                        <Box className='create-expenses-label'>Total Attended</Box>
                                                                        <Box className='create-expenses-value font-weight-bold'>{total_sequence}</Box>
                                                                    </Box>
                                                                    <Box className='expense-add-fuel-review' style={{ textAlign: 'start', margin: '0px 25px' }}>
                                                                        <Button onClick={() => this.handleClose()} className='form-next-pre-button' ml={2}> Close</Button>
                                                                    </Box>
                                                                </Box>
                                                                :
                                                                <Box>
                                                                    Upcoming Wait For Question
                                                                </Box>
                                                            }
                                                        </>
                                                        :
                                                        <>
                                                            <Box className='fs-20'>
                                                                {`(${questions['sequence']}) ${questions['question']}`}
                                                            </Box>

                                                            {questions['question_type'] == 1 &&
                                                                <FormControl component="fieldset" className='m-t-10px'>
                                                                    <RadioGroup value={radioAnswer} onChange={(e, value) => this.handleRadioChange(e, value, questions['choice_question'])}
                                                                        name="selectedRadio" aria-label='selectedRadio'>
                                                                        {questions['choice_question'].map((temp, optionIndex) => {
                                                                            return (
                                                                                <Box key={optionIndex} className='radio-options-outer-box'>
                                                                                    {is_already_submitted && show_answer_after_submit ?
                                                                                        <Tooltip
                                                                                            title={radioAnswer === temp.data ? radioAnswer !== correct_radio_answer ? 'Wrong Answer' : 'Correct Answer' : correct_radio_answer === temp.data ? 'Correct Answer' : ''}
                                                                                            enterDelay={400}
                                                                                            enterNextDelay={400} placement='top-start'
                                                                                            classes={{ tooltip: 'tooltip-show-data' }}>
                                                                                            <Box display='flex' className='cursor-pointer'>
                                                                                                <Box className={radioAnswer === temp.data ? radioAnswer !== correct_radio_answer ? 'text-red radio-options-box' : 'text-green radio-options-box' : correct_radio_answer === temp.data ? 'text-green radio-options-box' : 'radio-options-box'}>
                                                                                                    <FormControlLabel className='pointer-event-none' value={temp.data} control={<StyledRadio />} label={temp.data} />
                                                                                                    {temp.document &&
                                                                                                        <Box>{this.handleImagePreview(temp.document.file)}</Box>
                                                                                                    }
                                                                                                </Box>
                                                                                            </Box>
                                                                                        </Tooltip>
                                                                                        : <Box className='radio-options-box'>
                                                                                            <FormControlLabel value={temp.data} control={<StyledRadio />} label={temp.data} />
                                                                                            {temp.document &&
                                                                                                <Box>{this.handleImagePreview(temp.document.file)}</Box>
                                                                                            }
                                                                                        </Box>
                                                                                    }
                                                                                </Box>
                                                                            )
                                                                        })
                                                                        }
                                                                    </RadioGroup>
                                                                </FormControl>
                                                            }
                                                            {questions['question_type'] == 2 &&
                                                                <FormControl component="fieldset" >
                                                                    <FormGroup>
                                                                        {questions['choice_question'].map((temp, index) => {
                                                                            return (
                                                                                <Box className='radio-options-outer-box'>
                                                                                    {(is_already_submitted && show_answer_after_submit) ?
                                                                                        <Tooltip
                                                                                            title={temp.is_answer ? 'Correct Answer' : temp.is_entered ? ' Wrong Answer' : ''}
                                                                                            enterDelay={400}
                                                                                            enterNextDelay={400} placement='top-start'
                                                                                            classes={{ tooltip: 'tooltip-show-data' }}>
                                                                                            <Box className={temp.is_answer ? 'text-green radio-options-box' : temp.is_entered ? 'text-red radio-options-box' : 'radio-options-box'}>
                                                                                                <FormControlLabel
                                                                                                    className='pointer-event-none'
                                                                                                    control={<Checkbox
                                                                                                        checked={temp.is_entered} name={temp.data} color='primary' className='padding-l-20-bt-0-r-10px' />}
                                                                                                    label={temp.data}
                                                                                                />
                                                                                                {temp.document &&
                                                                                                    <Box>{this.handleImagePreview(temp.document['file'])}</Box>
                                                                                                }
                                                                                            </Box>
                                                                                        </Tooltip>
                                                                                        :
                                                                                        <Box className='radio-options-box' onChange={() => this.handleCheckBoxChange(index)}>
                                                                                            <FormControlLabel
                                                                                                control={<Checkbox checked={temp.is_entered} name={temp.data} color='primary' />}
                                                                                                label={temp.data}
                                                                                            />
                                                                                            {temp.document &&
                                                                                                <Box>{this.handleImagePreview(temp.document.file)}</Box>
                                                                                            }
                                                                                        </Box>
                                                                                    }
                                                                                </Box>
                                                                            )
                                                                        })
                                                                        }
                                                                    </FormGroup>
                                                                </FormControl>
                                                            }
                                                            {questions['question_type'] == 3 &&
                                                                <Box>
                                                                    <TextField
                                                                        autoComplete='off'
                                                                        id='oneWordAnswer'
                                                                        autoFocus
                                                                        label='Answer'
                                                                        name='oneWordAnswer'
                                                                        value={oneWordAnswer}
                                                                        className='width-250-px'
                                                                        inputProps={{ maxLength: 25 }}
                                                                        disabled={is_already_submitted && show_answer_after_submit}
                                                                        fullWidth
                                                                        onChange={(e) => this.handleChange(e)}
                                                                        error={error['oneWordAnswer'] && (error['oneWordAnswer'])}
                                                                        helperText={error['oneWordAnswer'] && (error['oneWordAnswer'])}
                                                                    />
                                                                    {is_already_submitted && show_answer_after_submit &&
                                                                        <Box display='flex'>
                                                                            <Box className='fs-18 font-weight-bold p-10 p-l-0'>
                                                                                Correct Answer
                                                                            </Box>
                                                                            <Box className='fs-18 font-weight-bold text-green p-10'>
                                                                                {questions['choice_question'][0]['data']}
                                                                            </Box>
                                                                        </Box>
                                                                    }
                                                                </Box>
                                                            }
                                                            {questions['question_type'] == 4 &&
                                                                <Grid container>
                                                                    <Grid item md={4} xs={12}>
                                                                        {is_already_submitted ?
                                                                            <Box className='quiz-review-label'>Selected Options</Box>
                                                                            :
                                                                            <Box className='quiz-review-label'>Options</Box>
                                                                        }
                                                                        {answeredOptions.map((temp, index) => {
                                                                            return (
                                                                                <Box className='match-values-outer-box' key={index}>
                                                                                    <Box className='match-values-box-90'>
                                                                                        <Box className='match-value-index'>
                                                                                            {index + 1}.
                                                                                        </Box>
                                                                                        <Box className='match-values-box'>
                                                                                            <Box className='match-value-border' draggable="false">
                                                                                                {temp.label.label}
                                                                                                {temp.label.imagePreview &&
                                                                                                    <Box>{this.handleImagePreview(temp.label.imagePreview)}</Box>
                                                                                                }
                                                                                            </Box>
                                                                                            {is_already_submitted && show_answer_after_submit ?
                                                                                                <Box className={temp.value.id === temp.value.correctValue ? 'background-green match-value-border' : 'background-red match-value-border'}>
                                                                                                    {temp.value.value}
                                                                                                    {temp.value.secondImagePreview &&
                                                                                                        <Box>{this.handleImagePreview(temp.value.secondImagePreview)}</Box>
                                                                                                    }
                                                                                                </Box>
                                                                                                :
                                                                                                <Box className='match-value-border cursor-grabbing'
                                                                                                    draggable="true"
                                                                                                    onDragStart={(e) => this.handleDragStart(e, index)}
                                                                                                    onDragOver={(e) => this.handleDragOver(e)}
                                                                                                    onDrop={(e) => this.handleDrop(e, index)}
                                                                                                    onClick={() => this.onselectSectionB(index)}
                                                                                                >
                                                                                                    <Box><DragIndicatorIcon /></Box>
                                                                                                    {temp.value.value}
                                                                                                    {temp.value.secondImagePreview &&
                                                                                                        <Box>{this.handleImagePreview(temp.value.secondImagePreview)}</Box>
                                                                                                    }
                                                                                                </Box>
                                                                                            }
                                                                                        </Box>
                                                                                    </Box>
                                                                                </Box>
                                                                            )
                                                                        })
                                                                        }
                                                                    </Grid>
                                                                    {is_already_submitted && show_answer_after_submit &&
                                                                        <Grid item md={4} xs={12}>
                                                                            <Box className='quiz-review-label'>Correct Options :</Box>
                                                                            {correctOptions.map((temp, index) => {
                                                                                return (
                                                                                    <Box className='match-values-outer-box' key={index}>
                                                                                        <Box className='match-values-box-90'>
                                                                                            <Box className='match-value-index'>
                                                                                                {index + 1}.
                                                                                            </Box>
                                                                                            <Box className='match-values-box'>
                                                                                                <Box className='match-value-border' draggable="false">
                                                                                                    {temp.label.label}
                                                                                                    {temp.label.imagePreview &&
                                                                                                        <Box>{this.handleImagePreview(temp.label.imagePreview)}</Box>
                                                                                                    }
                                                                                                </Box>
                                                                                                <Box className='match-value-border'
                                                                                                >
                                                                                                    {temp.value.value}
                                                                                                    {temp.value.secondImagePreview &&
                                                                                                        <Box>{this.handleImagePreview(temp.value.secondImagePreview)}</Box>
                                                                                                    }
                                                                                                </Box>
                                                                                            </Box>
                                                                                        </Box>
                                                                                    </Box>
                                                                                )
                                                                            })
                                                                            }
                                                                        </Grid>
                                                                    }
                                                                </Grid>
                                                            }
                                                            {submitDisable ?
                                                                <Box className='margin-top-20' mr={3}>
                                                                    <CircularProgress />
                                                                </Box>
                                                                :
                                                                <Box className='margin-top-20' mr={3}>
                                                                    {total_sequence === current_sequence ?
                                                                        <Box onClick={() => this.handleSubmitTrigger()}>
                                                                            <Button className='form-next-pre-button' ml={2}> Submit</Button>
                                                                        </Box>
                                                                        :
                                                                        <Box onClick={() => this.handleSubmit('next')}>
                                                                            <Button className='form-next-pre-button' ml={2}>
                                                                                {(show_answer_after_submit && !is_already_submitted) ?
                                                                                    <>
                                                                                        Submit and Show anwer
                                                                                    </>
                                                                                    :
                                                                                    <>
                                                                                        Next
                                                                                    </>
                                                                                }
                                                                            </Button>
                                                                        </Box>
                                                                    }
                                                                </Box>
                                                            }
                                                        </>
                                                    }
                                                </Grid>
                                                {is_question_exist &&
                                                    <Grid item md={2} xs={4}>
                                                        <Box display='flex'>
                                                            <Box className='quiz-review-label'>Time limits :</Box>
                                                            <Box className={questions.time_limit_to_answer && parseInt(seconds) < 10 ? 'breathing-button quiz-review-value red-text font-weight-bold fs-18' : 'quiz-review-value red-text  font-weight-bold fs-18'}>{!questions.time_limit_to_answer ? '---' : questions.time_limit_to_answer && getTimeFormatFromSeconds(seconds, getSecondFormat)}</Box>
                                                        </Box>
                                                        <Box display='flex'>
                                                            <Box className='quiz-review-label'>Is Mandatory :</Box>
                                                            <Box className='quiz-review-value'>{questions.required ? 'Yes' : 'No'}</Box>
                                                        </Box>
                                                        <Box display='flex'>
                                                            <Box className='quiz-review-label'>Points :</Box>
                                                            <Box className='quiz-review-value'>{questions.score}</Box>
                                                        </Box>
                                                    </Grid>
                                                }
                                            </Grid>
                                        </Box>
                                    </Box>
                                :
                                <Box>
                                    <FormControlLabel
                                        className='margin-left-0'
                                        control={<Switch checked={acknowledged}
                                            name={'acknowledged'}
                                            value={acknowledged}
                                            color="primary"
                                            onChange={() => this.setState({ acknowledged: !acknowledged })} />}
                                        label='I Agreed to the terms and condition and above and ready for quiz'
                                    />
                                    <Box className='schedule-exam-approve-button-left'>
                                        <Button variant="outlined" color="primary"
                                            className={acknowledged ? 'submit' : 'submit disabled-request-button'}
                                            disabled={!acknowledged}
                                            onClick={() => this.handleAgreed()}>
                                            Submit &nbsp;{' '}
                                        </Button>
                                    </Box>
                                </Box>
                            }
                        </Box>
                    }
                </Dialog>
                <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={openSnackBar}
                    autoHideDuration={3000}
                    onClose={this.handleCloseSnackBar}
                >
                    <Alert onClose={this.handleCloseSnackBar} className='align-alert-message' severity={severityStatus} >
                        {alertData}
                    </Alert>
                </Snackbar>
            </div >
        )
    }
}


export default withRouter(AttendVideoFeedBackForm)