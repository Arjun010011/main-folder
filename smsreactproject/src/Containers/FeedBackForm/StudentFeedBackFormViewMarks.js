import React, { useState, useEffect, useImperativeHandle } from 'react'
import {
    Tooltip, Button, FormControlLabel, Box, Dialog, AppBar, Toolbar, IconButton, Typography, Slide,
    FormGroup, Paper,
    FormControl, DialogTitle, RadioGroup, Divider, Radio, Checkbox, TextField
} from '@material-ui/core';
import PlayCircleOutlineIcon from '@material-ui/icons/PlayCircleOutline';
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
import PlayVideoPopup from 'Components/PlayVideoPopup';
import { questionTypeList } from 'Containers/Quiz/constants';

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

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

const StudentFeedBackFormViewMarks = React.forwardRef((props, ref) => {

    const [openDialog, set_openDialog] = useState(false)
    const [loadingDetails, set_loadingDetails] = useState(false)
    const [quizDetails, set_quizDetails] = useState({ question_form: [], student_details: {} })
    const [largeImagePreview, set_largeImagePreview] = useState('')
    const [is_video_quiz, set_is_video_quiz] = useState(false)
    const [videoPopup, set_videoPopup] = useState(false)
    const [videoUrl, set_videoUrl] = useState('')

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
            getQuestionDetails()
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
                set_is_video_quiz(() => quizUpdated['is_video_quiz'])
                if(quizUpdated['is_video_quiz'] && quizUpdated['document']){
                    set_videoUrl(() => quizUpdated['document']['file'])
                }

            }
            set_loadingDetails(() => false)
        })
    }

    const goToReviewPage = () => {
        props.history.push({
            pathname: Actions.attend_feedbackform_list.view.url,
        });
    }

    const handleDialogClose = () => {
        goToReviewPage()
        set_openDialog(() => false)
    }


    const handleCloseLargeImage = () => {
        set_largeImagePreview(() => '')
    }

    const handlePlayVideo = () => {
        set_videoPopup(() => true)
    }

    const handleCloseVideo = () => {
        set_videoPopup(() => false)
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
                        {is_video_quiz &&
                            <Box className="year-std-box mr-40">
                                <Box className="academic-std-head align-self-center">
                                    Quiz Video
                                </Box>
                                <Box className='fs-18 '>
                                    <Button onClick={handlePlayVideo}>
                                        <PlayCircleOutlineIcon className='quiz-list-mp4-icon margin-right-10' />
                                        Play Video
                                    </Button>
                                </Box>
                                <PlayVideoPopup isOpen={videoPopup} videoUrl={videoUrl} handleCloseVideo={handleCloseVideo} />
                            </Box>
                        }
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
                                                                                        <FormControlLabel
                                                                                            className='pointer-event-none'
                                                                                            value={temp.data} control={<StyledRadio />} label={temp.data} />
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
                                                                                        <FormControlLabel value={temp.data}
                                                                                            className='pointer-event-none'

                                                                                            control={<StyledRadio />} label={temp.data} />
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
                                                                                        className='pointer-event-none'
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
                                                                                        control={<Checkbox checked={temp.is_entered} name={temp.data} color='primary' className=' pointer-event-none padding-l-20-bt-0-r-10px' />}
                                                                                        label={temp.data}
                                                                                        className='pointer-event-none'
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
                                            <Box className='quiz-review-value'>{data.response['points'] ? data.response['points'] : 0}</Box> :
                                        </Box>
                                    </Box>
                                </Box>
                                <Box mt={1} mb={1}>
                                    <Divider />
                                </Box>
                            </Box>)
                        })}
                    </>
                }
            </Box>
        </Dialog>
    )
}
)
export default withRouter(StudentFeedBackFormViewMarks)