import React, { useState, useRef, useEffect } from 'react'
import {
    FormGroup, Button, Tooltip, IconButton, Paper, Grid,
    FormControlLabel, FormControl, DialogTitle, Slide, RadioGroup, Box, Divider, Radio, Checkbox, TextField
} from '@material-ui/core';
import PlayCircleOutlineIcon from '@material-ui/icons/PlayCircleOutline';
import { makeStyles } from '@material-ui/core/styles';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import {
    PersonOutline,
} from "@material-ui/icons";
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import clsx from 'clsx';
import '../styles.scss'
import { dateFormat, getTimeFormatFromSeconds, getKeyValueMap } from 'Includes/functions';
import ViewStudentStaffTableFeedBackForm from 'Containers/FeedBackForm/components/ViewStudentStaffTableFeedBackForm';
import { questionTypeList } from 'Containers/FeedBackForm/constants';
import PlayVideoPopup from 'Components/PlayVideoPopup';

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

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

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="left" ref={ref} {...props} />;
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

const AfterFinalizedViewFeedBackForm = React.forwardRef((props, ref) => {

    const { quizDetails, standard_name } = props;

    const [largeImagePreview, set_largeImagePreview] = useState('')
    const [openDialog, set_openDialog] = useState(false)
    const [selectedUser, set_selectedUser] = useState('')
    const [updatedValue, set_updatedValue] = useState(false)
    const [quizDetailsUpdated, set_quizDetailsUpdated] = useState(false)
    const [is_video_quiz, set_is_video_quiz] = useState(false)
    const [videoPopup, set_videoPopup] = useState(false)
    const [videoUrl, set_videoUrl] = useState('')
    
    
    const dataListRef = useRef(null);

    React.useEffect(() => {
        if (!updatedValue) {
            let quizUpdated = { ...quizDetails }
            let radio_answer = ''
            let question_type = getKeyValueMap(questionTypeList, 'id', 'name')
            quizUpdated.question_form.map((data) => {
                data.question_type_name = `${data.question_type} ( ${question_type[data.question_type]} )`
                if (data.question_type === 1) {
                    radio_answer = ''
                    data.choice_question.map((choice) => {
                        if (choice.is_answer) {
                            radio_answer = choice.data
                        }
                    })
                    data.radio_answer = radio_answer
                }
                else if (data.question_type === 4) {
                    let matchValues = []
                    let matchShuffledValues = []
                    let temp = { label: {}, value: {} }
                    let shuffled_temp = { label: {}, value: {} }
                    data.choice_question.map((field, index) => {
                        if (field.is_answer) {
                            temp['label'] = {}
                            temp['value'] = {}
                            temp['label']['id'] = field.id
                            temp['label']['label'] = field.data
                            temp['label']['uploadedId'] = field.document
                            temp['label']['imagePreview'] = field.document
                            temp['label']['imageName'] = field.document
                            temp['label']['key_value'] = index
                            shuffled_temp['label'] = { ...temp['label'] }
                            shuffled_temp['value'] = {}
                            temp['value'] = {}
                            temp['value']['id'] = data.choice_question[field['correct_match_index']].id
                            temp['value']['value'] = data.choice_question[field['correct_match_index']].data
                            temp['value']['uploadedId'] = data.choice_question[field['correct_match_index']].document
                            temp['value']['imagePreview'] = data.choice_question[field['correct_match_index']].document
                            temp['value']['imageName'] = data.choice_question[field['correct_match_index']].document
                            temp['value']['key_value'] = field['correct_match_index']
                            shuffled_temp['value']['value'] = data.choice_question[field['shuffled_match_index']].data
                            shuffled_temp['value']['uploadedId'] = data.choice_question[field['shuffled_match_index']].document
                            shuffled_temp['value']['imagePreview'] = data.choice_question[field['shuffled_match_index']].document
                            shuffled_temp['value']['imageName'] = data.choice_question[field['shuffled_match_index']].document
                            shuffled_temp['value']['key_value'] = field['shuffled_match_index']
                        }
                        if (Object.keys(temp['label']).length !== 0 && Object.keys(temp['value']).length !== 0) {
                            matchValues.push(temp)
                            matchShuffledValues.push(shuffled_temp)
                            temp = { label: {}, value: {} }
                            shuffled_temp = { label: {}, value: {} }
                        }
                    })
                    data.correctOptions = matchValues
                    data.shuffledOptions = matchShuffledValues
                }
            })
            set_quizDetailsUpdated(() => quizUpdated)
            set_updatedValue(() => true);
            set_is_video_quiz(() => quizDetails['is_video_quiz'])
            if(quizDetails['is_video_quiz'] && quizDetails['document']){
                set_videoUrl(() => quizUpdated['document']['file'])
            }
        }
    }, [quizDetails]);

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


    const handleCloseLargeImage = () => {
        set_largeImagePreview(() => '')
    }

    const handleOpenDialog = (name) => {
        set_selectedUser(() => name)
        set_openDialog(() => true)
        dataListRef.current.updateDataList(name)
    }

    const handleViewDialogClose = () => {
        set_openDialog(() => false)
    }

    const handlePlayVideo=()=>{
        set_videoPopup(()=>true)
    }

    const handleCloseVideo=()=>{
        set_videoPopup(()=>false)
    }

    return (
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
            {updatedValue &&
                <Paper className='padding-20'>
                    <Grid container>
                        <Grid item md={3} xs={12} className='m-t-20px'>
                            <Box className='fs-18'>
                                FeedBackForm Title :
                            </Box>
                        </Grid>
                        <Grid item md={9} xs={12} className='m-t-20px'>
                            <Box className='fs-18 '>
                                {quizDetailsUpdated.title}
                            </Box>
                        </Grid>
                        {is_video_quiz &&
                            <>
                                <Grid item md={3} xs={12} className='m-t-20px'>
                                    <Box className='fs-18'>
                                        FeedBackForm Video  :
                                    </Box>
                                </Grid>
                                <Grid item md={9} xs={12} className='m-t-20px'>
                                    <Box className='fs-18 '>
                                        <Button onClick={handlePlayVideo}>
                                            <PlayCircleOutlineIcon className='quiz-list-mp4-icon margin-right-10' />
                                            Play Video
                                        </Button>
                                    </Box>
                                </Grid>
                                <PlayVideoPopup isOpen={videoPopup} videoUrl={videoUrl} handleCloseVideo={handleCloseVideo}/>
                            </>
                        }
                        <Grid item md={3} xs={12} className='m-t-20px'>
                            <Box className='fs-18 margin-top-5'>
                                Schedule Range :
                            </Box>
                        </Grid>
                        <Grid item md={9} xs={12} className='m-t-20px display-flex'>
                            <Box className='exam-mark-add-heading-bg fs-18 margin-left-0'>
                                {dateFormat(quizDetailsUpdated.start_date, 'DD-MM-YYYY hh:mm A')}
                            </Box>
                            <Box className='fs-18 margin-top-5'>
                                To
                            </Box>
                            <Box className='exam-mark-add-heading-bg fs-18'>
                                {dateFormat(quizDetailsUpdated.end_date, 'DD-MM-YYYY hh:mm A')}
                            </Box>
                        </Grid>
                        <Grid item md={3} xs={12} className='m-t-20px'>
                            <Box className='fs-18'>
                                Total Time :
                            </Box>
                        </Grid>
                        <Grid item md={9} xs={12} className='m-t-20px'>
                            <Box className='fs-18 '>
                                {quizDetailsUpdated.total_time ? getTimeFormatFromSeconds(quizDetailsUpdated.total_time) : 'No'}
                            </Box>
                        </Grid>
                        <Grid item md={3} xs={12} className='m-t-20px'>
                            <Box className='fs-18'>
                                Total Points :
                            </Box>
                        </Grid>
                        <Grid item md={9} xs={12} className='m-t-20px'>
                            <Box className='fs-18 '>
                                {quizDetailsUpdated.total_points}
                            </Box>
                        </Grid>
                        <Grid item md={3} xs={12} className='m-t-20px'>
                            <Box className='fs-18'>
                                {`${alias_names['standard']} (${alias_names['section']})`} :
                            </Box>
                        </Grid>
                        <Grid item md={9} xs={12} className='m-t-20px'>
                            <Box className='fs-18 display-flex'>
                                <Box >{`${standard_name} - ( `}</Box>
                                {quizDetailsUpdated.form_standard_section_mapping_form.map((data, index) => {
                                    return <Box key={index}>
                                        {quizDetailsUpdated.form_standard_section_mapping_form.length !== index + 1 ? ` ${data.standard_section_name} , ` : ` ${data.standard_section_name} `}
                                    </Box>
                                })
                                }
                                <Box >{` )`}</Box>
                            </Box>
                        </Grid>
                        <Grid item md={3} xs={12} className='m-t-20px'>
                            <Box className='fs-18'>
                                Subject :
                            </Box>
                        </Grid>
                        <Grid item md={9} xs={12} className='m-t-20px'>
                            <Box className='fs-18 '>
                                {quizDetailsUpdated.subject_name ? quizDetailsUpdated.subject_name : '----'}
                            </Box>
                        </Grid>
                        <Grid item md={3} xs={12} className='m-t-20px'>
                            <Box className='fs-18'>
                                Students :
                            </Box>
                        </Grid>
                        <Grid item md={9} xs={12} className='m-t-10px'>
                            <Box className='fs-18 display-flex'>
                                <Box className='m-t-10px'>
                                    {quizDetailsUpdated.student_form_mapping_form.length}
                                </Box>
                                <IconButton
                                    color="primary"
                                    aria-label="add to shopping cart"
                                    onClick={() => handleOpenDialog("student")}
                                >
                                    <PersonOutline className="float-right" />
                                </IconButton>
                            </Box>
                        </Grid>
                        <Grid item md={3} xs={12} className='m-t-10px'>
                            <Box className='fs-18'>
                                Staffs :
                            </Box>
                        </Grid>
                        <Grid item md={9} xs={12} className=''>
                            <Box className='fs-18 display-flex'>
                                <Box className='m-t-10px'>
                                    {quizDetailsUpdated.alternate_teacher_mapping_form.length}
                                </Box>
                                <IconButton
                                    color="primary"
                                    aria-label="add to shopping cart"
                                    onClick={() => handleOpenDialog("staff")}
                                >
                                    <PersonOutline className="float-right" />
                                </IconButton>
                            </Box>
                        </Grid>
                    </Grid>
                    <Box className='fs-18 form-left-heading m-t-20px'>
                        {'Question List'}
                    </Box>
                    <Box>


                        {quizDetailsUpdated.question_form.map((data, index) => {
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
                                                <FormControl component="fieldset" className='m-t-10px'>
                                                    <RadioGroup value={data.radio_answer}
                                                        name="selectedRadio" aria-label='selectedRadio'>
                                                        {data.choice_question.map((temp, optionIndex) => {
                                                            return (
                                                                <Box key={optionIndex} className='radio-options-outer-box'>
                                                                    <Box className='radio-options-box'>
                                                                        <FormControlLabel value={temp.data} control={<StyledRadio />} label={temp.data} />
                                                                        {temp.document &&
                                                                            <Box>{handleImagePreview(temp.document.file)}</Box>
                                                                        }
                                                                    </Box>
                                                                </Box>
                                                            )
                                                        })
                                                        }
                                                    </RadioGroup>
                                                </FormControl>
                                            </Box>
                                        }
                                        {data.question_type === 2 &&
                                            <Box display='flex'>
                                                <Box className='quiz-review-label'>Options :</Box>
                                                <FormControl component="fieldset" className='m-t-10px'>
                                                    <FormGroup>
                                                        {data.choice_question.map((temp, optionIndex) => {
                                                            return (
                                                                <Box key={optionIndex} className='radio-options-outer-box'>
                                                                    <Box className='radio-options-box'>
                                                                        <FormControlLabel
                                                                            control={<Checkbox checked={temp.is_answer} name={temp.data} color='primary' className='padding-l-20-bt-0-r-10px' />}
                                                                            label={temp.data}
                                                                        />
                                                                        {temp.document &&
                                                                            <Box>{handleImagePreview(temp.document['file'])}</Box>
                                                                        }
                                                                    </Box>
                                                                </Box>
                                                            )
                                                        })
                                                        }
                                                    </FormGroup>
                                                </FormControl>
                                            </Box>
                                        }
                                        {data.question_type === 3 &&
                                            <Box display='flex'>
                                                <Box className='quiz-review-label'>Correct Answer :</Box>
                                                <Box className='quiz-review-value text-bold text-underline'>{data.choice_question[0]['data']}</Box>
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
                                                    <Box className='quiz-review-label'>Shuffled Options :</Box>
                                                    <Box>
                                                        {data.shuffledOptions.map((temp, opIndex) => {
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
                                            </Box>
                                        }
                                    </Box>
                                    <Box className='quiz-review-right-set'>
                                        <Box display='flex'>
                                            <Box className='quiz-review-label'>Question at the time :</Box>
                                            <Box className='quiz-review-value'>{getTimeFormatFromSeconds(data.question_start_time)}</Box>
                                        </Box>
                                        <Box display='flex'>
                                            <Box className='quiz-review-label'>Points :</Box>
                                            <Box className='quiz-review-value'>{data.score}</Box>
                                        </Box>
                                        <Box display='flex'>
                                            <Box className='quiz-review-label'>Time limits :</Box>
                                            <Box className='quiz-review-value'>{quizDetailsUpdated.is_total_time ? '---' : data.time_limit_to_answer && getTimeFormatFromSeconds(data.time_limit_to_answer)}</Box>
                                        </Box>
                                        <Box display='flex'>
                                            <Box className='quiz-review-label'>Is mandatory :</Box>
                                            <Box className='quiz-review-value'>{data.required ? 'Yes' : 'No'}</Box>
                                        </Box>
                                        <Box display='flex'>
                                            <Box className='quiz-review-label'>Show Answer :</Box>
                                            <Box className='quiz-review-value'>{data.show_answer_after_submit ? 'Yes' : 'No'}</Box>
                                        </Box>
                                    </Box>
                                </Box>
                                <Box mt={1} mb={1}>
                                    <Divider />
                                </Box>
                            </Box>)
                        })}
                    </Box>
                </Paper>
            }
            <ViewStudentStaffTableFeedBackForm
                user={selectedUser}
                quizDetails={quizDetailsUpdated}
                openDialog={openDialog}
                handleViewDialogClose={handleViewDialogClose}
                ref={dataListRef}
                student_list={quizDetailsUpdated.student_form_mapping_form}
                staff_list={quizDetailsUpdated.alternate_teacher_mapping_form}
            />
        </>
    )
}
)

export default AfterFinalizedViewFeedBackForm