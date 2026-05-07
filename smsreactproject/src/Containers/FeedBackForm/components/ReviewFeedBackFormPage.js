import React, { useState, useRef } from 'react'
import {
    FormGroup, Dialog, Tooltip, DialogContent, AppBar, Toolbar, IconButton, Typography, Paper, Grid, Button,
    FormControlLabel, FormControl, DialogTitle, Slide, RadioGroup, Box, Divider, Radio, Checkbox, TextField
} from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import { makeStyles } from '@material-ui/core/styles';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import {
    PersonOutline,
} from "@material-ui/icons";
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import clsx from 'clsx';
import '../styles.scss'
import { dateFormat, getTimeFormatFromSeconds } from 'Includes/functions';
import { postRequest, putRequest } from 'Includes/api/apicall';
import { POST_URL, PUT_URL } from 'Includes/urls'
import LoadingGif from 'Components/LoadingGif';
import Swal from 'sweetalert2'
import ViewStudentStaffTableFeedBackForm from 'Containers/FeedBackForm/components/ViewStudentStaffTableFeedBackForm';
import _ from 'lodash';

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

const ReviewFeedBackFormPage = React.forwardRef((props, ref) => {

    const { standard_name, openReviewPage, questionList, review_details, year, loadingReviewDetails, student_list,response_staff_list,department_list,section_list } = props;

    const [submitDisable, set_submitDisable] = useState(false)
    const [largeImagePreview, set_largeImagePreview] = useState('')
    const [openDialog, set_openDialog] = useState(false)
    const [selectedUser, set_selectedUser] = useState('')

    const dataListRef = useRef(null);

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

    const finalize = (id) => {
        Swal.fire({
            title: `<strong>Are you sure want to Finalize</strong>`,
            text: "You won't be able to update Feed Back Form!",
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
                let url = PUT_URL.feedbackformforms.api + id + '/';
                let postFormat = {
                    is_finalized: '1'
                }
                putRequest(url, postFormat, props)
                    .then((response) => {
                        if (response && response.status === 200) {
                            Swal.fire({
                                position: 'top-end',
                                type: 'success',
                                title: response.data.Reason,
                                showConfirmButton: false,
                                timer: 1500
                            })
                            props.callGetPage()
                        }
                        set_submitDisable(() => false)
                    });
            }
        })
    }

    const submit = (name) => {
        if (name === 'finalize') {
            set_submitDisable(() => true)
            let postFormat = getPostFormat()
            let url = POST_URL.feedbackforms.api;
            postRequest(url, postFormat, props)
                .then((response) => {
                    if (response && response.status === 200) {
                        if (name !== 'finalize') {
                            Swal.fire({
                                position: 'top-end',
                                type: 'success',
                                title: response.data.Reason,
                                showConfirmButton: false,
                                timer: 1500
                            })
                            props.callGetPage()
                        }
                        else {
                            finalize(response.data.formId)
                        }
                    }
                    set_submitDisable(() => false)
                });
        }
        else {
            Swal.fire({
                title: `<strong>Are you sure want to Submit</strong>`,
                text: "Quiz is only saving, only when it is finalized student can attend quiz!",
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
                    set_submitDisable(() => true)
                    let postFormat = getPostFormat()
                    let url = POST_URL.feedbackforms.api;
                    postRequest(url, postFormat, props)
                        .then((response) => {
                            if (response && response.status === 200) {
                                if (name !== 'finalize') {
                                    Swal.fire({
                                        position: 'top-end',
                                        type: 'success',
                                        title: response.data.Reason,
                                        showConfirmButton: false,
                                        timer: 1500
                                    })
                                    props.callGetPage()
                                }
                                else {
                                    finalize(response.data.formId)
                                }
                            }
                            set_submitDisable(() => false)
                        });
                }
            })
        }
    }

    const getSectionList = () => {
        let stamdard_section = []
        review_details.selected_sections.map((data) => {
            stamdard_section.push(data.standard_section)
        })
        return stamdard_section
    }

    const getStudentList = () => {
        let student_list = []
        review_details.student_list.map((data) => {
            student_list.push(data.student)
        })
        return student_list
    }

    const getImageIds = (imageDetails) => {
        let image_id = []
        imageDetails.map((data) => {
            image_id.push(data.uploadedId)
        })
        return image_id
    }

    const getChoiceFormat = (question_details) => {
        let choices = []
        let choice_temp = {}
        if (question_details.questionType === 1) {
            question_details.options.map((data) => {
                choice_temp = {}
                choice_temp['id'] = data.id
                choice_temp['data'] = data.name
                choice_temp['is_answer'] = question_details.selectedRadio === data.name ? true : false
                choice_temp['document'] = data.uploadedId
                choices.push(choice_temp)
            })
        }
        else if (question_details.questionType === 2) {
            question_details.options.map((data) => {
                choice_temp = {}
                choice_temp['id'] = data.id
                choice_temp['data'] = data.name
                choice_temp['is_answer'] = data.value
                choice_temp['document'] = data.uploadedId
                choices.push(choice_temp)
            })
        }
        else if (question_details.questionType === 3) {
            choice_temp = {}
            choice_temp['data'] = question_details.options
            choice_temp['is_answer'] = true
            choice_temp['document'] = null
            choices.push(choice_temp)
        }
        else if (question_details.questionType === 4) {
            let index = 0;
            let mapping = {};
            let leftindex = ''
            let rightIndex = ''
            let correct_map_key = {}
            let shuffled_map_key = {}
            question_details.correctOptions.map((correct) => {
                choice_temp = {}
                choice_temp['id'] = correct.label.id
                choice_temp['key_id'] = index
                choice_temp['data'] = correct.label.label
                choice_temp['is_answer'] = true
                choice_temp['correct_match_index'] = choices.length + 1
                choice_temp['shuffled_match_index'] = ''
                choice_temp['document'] = correct.label.uploadedId
                correct_map_key[index] = choices.length + 1
                choices.push(choice_temp)
                mapping[correct.label.key_value] = index
                index++;
                choice_temp = {}
                choice_temp['id'] = correct.value.id
                choice_temp['key_id'] = index
                choice_temp['data'] = correct.value.value
                choice_temp['is_answer'] = false
                choice_temp['document'] = correct.value.uploadedId
                choices.push(choice_temp)
                mapping[correct.value.key_value] = index
                index++;
            })
            question_details.shuffledOptions.map((shData) => {
                leftindex = mapping[shData['label']['key_value']]
                rightIndex = mapping[shData['value']['key_value']]
                choices[leftindex]['shuffled_match_index'] = rightIndex
                shuffled_map_key[leftindex] = rightIndex
            })
            let choices_new=_.cloneDeep(choices)
            let shuffledValue = _.shuffle(choices_new)
            shuffledValue.map((shuffled) => {
                Object.keys(correct_map_key).map((cor_key) => {
                    if (shuffled['key_id'] == cor_key) {
                        shuffledValue.map((shfData, shfIndex) => {
                            if (shfData['key_id'] == correct_map_key[cor_key]) {
                                shuffled['correct_match_index'] = shfIndex
                            }
                            if (shfData['key_id'] == shuffled_map_key[cor_key]) {
                                shuffled['shuffled_match_index'] = shfIndex
                            }
                        })
                    }
                })
            })
            choices=[...shuffledValue]
        }
        return choices
    }

    const getQuestions = () => {
        let question_list = []
        let question_temp = {}
        questionList.map((data, index) => {
            question_temp = {}
            question_temp['id'] = data.question_details.id
            question_temp['sequence'] = index + 1
            question_temp['question'] = data.question_details.question_name
            question_temp['description'] = data.question_details.description
            question_temp['question_type'] = data.question_details.questionType
            question_temp['required'] = data.question_details.isMandatory === 'yes' ? true : false
            question_temp['score'] = data.question_details.points
            question_temp['documents'] = getImageIds(data.question_details.imagesPreview)
            question_temp['choices'] = getChoiceFormat(data.question_details)
            question_temp['time_limit_to_answer'] = review_details.is_total_time === 'yes' ? 0 : data.question_details.withinTime ? data.question_details.withinTime : 0
            question_temp['show_answer_after_submit'] = data.question_details.showAnswer === 'yes' ? true : false
            question_list.push(question_temp)
        })
        return question_list
    }

    const getStaffList = () => {
        return (review_details?.staff_list || []).map((data) => ({
          staff: data.staff ? data.staff : data.id,
          view: data.view,
          update: data.update,
          evaluate: data.evaluate,
        }));
      };

    const getPostFormat = () => {
        let post_data = {
            "form": {
                "title": review_details.feedback_form_title,
                "form_type": "Feedbackform",
                "start_date": dateFormat(review_details.start_date, 'YYYY-MM-DD HH:mm:ss'),
                "end_date": dateFormat(review_details.end_date, 'YYYY-MM-DD HH:mm:ss'),
                "total_time": review_details.is_total_time === 'yes' ? review_details.total_time : 0,
                "academic_year": parseInt(year),
                "standard_section_ids": section_list,
                "students": student_list,
                "branch_id":department_list,
                "alternate_teachers": getStaffList(),
                "questions": getQuestions(),
                "is_for_staff":0,
                "staffs":response_staff_list
            }
        }
        if (review_details.id) {
            post_data['form']['id'] = review_details.id
        }
        return post_data
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

    return (
        <Dialog fullScreen open={openReviewPage} onClose={props.handleClose} TransitionComponent={Transition}>

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
            <AppBar>
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={() => props.handleClose()} aria-label="close">
                        <CloseIcon />
                    </IconButton>
                    <Typography variant="h6">
                        Review Feed Back Form
                    </Typography>

                </Toolbar>
            </AppBar>
            <DialogTitle id='form-dialog-title'></DialogTitle>
            {loadingReviewDetails ?
                <LoadingGif /> :
                <DialogContent className='m-t-20px display-flex'>
                    <Box className=' review-dailog-paper'>
                        {openReviewPage && questionList.map((data, index) => {
                            return (<Box className='m-t-20px' key={index}>
                                <Box className='m-b-10px m-t-10px fs-18'>{`${index + 1}. ${data.question_details.question_name}`}</Box>
                                <Box display='flex'>
                                    <Box className='quiz-review-left-set'>
                                        <Box display='flex'>
                                            <Box className='quiz-review-label'>Description :</Box>
                                            <Box className='quiz-review-value'> {data.question_details.description}</Box>
                                        </Box>
                                        <Box display='flex'>
                                            <Box className='quiz-review-label'>Question Type :</Box>
                                            <Box className='quiz-review-value'> {data.question_details.questionTypeName}</Box>
                                        </Box>
                                        {data.question_details.questionType === 1 &&
                                            <Box display='flex'>
                                                <Box className='quiz-review-label'>Options :</Box>
                                                <FormControl component="fieldset" className='m-t-10px'>
                                                    <RadioGroup value={data.question_details.selectedRadio}
                                                        name="selectedRadio" aria-label='selectedRadio'>
                                                        {data.question_details.options.map((temp, optionIndex) => {
                                                            return (
                                                                <Box key={optionIndex} className='radio-options-outer-box'>
                                                                    <Box className='radio-options-box'>
                                                                        <FormControlLabel value={temp.name} control={<StyledRadio />} label={temp.name} />
                                                                        {temp.imagePreview &&
                                                                            <Box>{handleImagePreview(temp.imagePreview)}</Box>
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
                                        {data.question_details.questionType === 2 &&
                                            <Box display='flex'>
                                                <Box className='quiz-review-label'>Options :</Box>
                                                <FormControl component="fieldset" className='m-t-10px'>
                                                    <FormGroup>
                                                        {data.question_details.options.map((temp, optionIndex) => {
                                                            return (
                                                                <Box key={optionIndex} className='radio-options-outer-box'>
                                                                    <Box className='radio-options-box'>
                                                                        <FormControlLabel
                                                                            control={<Checkbox checked={temp.value} name={temp.name} color='primary' className='padding-l-20-bt-0-r-10px' />}
                                                                            label={temp.name}
                                                                        />
                                                                        {temp.imagePreview &&
                                                                            <Box>{handleImagePreview(temp.imagePreview)}</Box>
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
                                        {data.question_details.questionType === 3 &&
                                            <Box display='flex'>
                                                <Box className='quiz-review-label'>Correct Answer :</Box>
                                                <Box className='quiz-review-value text-bold text-underline'>{data.question_details.options}</Box>
                                            </Box>
                                        }
                                        {data.question_details.questionType === 4 &&
                                            <Box display='flex'>
                                                <Box className='quiz-review-label'>Options :</Box>
                                                <Box className='w-40 quiz-review-value'>
                                                    <Box className='quiz-review-label'>Correct Options :</Box>
                                                    <Box>
                                                        {data.question_details.correctOptions.map((temp, opIndex) => {
                                                            return (<Box className='match-values-outer-box' key={opIndex}>
                                                                <Box className='match-values-box-90'>
                                                                    <Box className='match-value-index'>
                                                                        {opIndex + 1}.
                                                                    </Box>
                                                                    <Box className='match-values-box'>
                                                                        <Box className='match-value-border'>
                                                                            {temp.label.label}
                                                                            {temp.label.imagePreview &&
                                                                                <Box>{handleImagePreview(temp.label.imagePreview)}</Box>
                                                                            }
                                                                        </Box>
                                                                        <Box className='match-value-border'>
                                                                            {temp.value.secondImagePreview &&
                                                                                <Box>{handleImagePreview(temp.value.secondImagePreview)}</Box>
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
                                                        {data.question_details.shuffledOptions.map((temp, opIndex) => {
                                                            return (<Box className='match-values-outer-box' key={opIndex}>
                                                                <Box className='match-values-box-90'>
                                                                    <Box className='match-value-index'>
                                                                        {opIndex + 1}.
                                                                    </Box>
                                                                    <Box className='match-values-box'>
                                                                        <Box className='match-value-border'>
                                                                            {temp.label.label}
                                                                            {temp.label.imagePreview &&
                                                                                <Box>{handleImagePreview(temp.label.imagePreview)}</Box>
                                                                            }
                                                                        </Box>
                                                                        <Box className='match-value-border'>
                                                                            {temp.value.secondImagePreview &&
                                                                                <Box>{handleImagePreview(temp.value.secondImagePreview)}</Box>
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
                                        {/* <Box display='flex'>
                                            <Box className='quiz-review-label'>Points :</Box>
                                            <Box className='quiz-review-value'>{data.question_details.points}</Box>
                                        </Box>
                                        <Box display='flex'>
                                            <Box className='quiz-review-label'>Time limits :</Box>
                                            <Box className='quiz-review-value'>{review_details.is_total_time === 'yes' ? '---' : data.question_details.withinTime && getTimeFormatFromSeconds(data.question_details.withinTime)}</Box>
                                        </Box> */}
                                        <Box display='flex'>
                                            <Box className='quiz-review-label'>Is mandatory :</Box>
                                            <Box className='quiz-review-value'>{data.question_details.isMandatory}</Box>
                                        </Box>
                                        {/* <Box display='flex'>
                                            <Box className='quiz-review-label'>Show Answer :</Box>
                                            <Box className='quiz-review-value'>{data.question_details.showAnswer}</Box>
                                        </Box> */}
                                    </Box>
                                </Box>
                                <Box mt={1} mb={1}>
                                    <Divider />
                                </Box>
                            </Box>)
                        })}
                    </Box>
                    <Divider
                        className="dividerheight"
                        orientation="vertical"
                        flexItem
                    />
                    <Box className=' review-dailog-right-paper'>
                        <Paper className='padding-20'>
                            <Grid container>
                                <Grid item md={3} xs={12} className='m-t-20px'>
                                    <Box className='fs-18'>
                                        Feed Back Form Title :
                                    </Box>
                                </Grid>
                                <Grid item md={9} xs={12} className='m-t-20px'>
                                    <Box className='fs-18 '>
                                        {review_details.feedback_form_title}
                                    </Box>
                                </Grid>
                                <Grid item md={3} xs={12} className='m-t-20px'>
                                    <Box className='fs-18 margin-top-5'>
                                        Schedule Range :
                                    </Box>
                                </Grid>
                                <Grid item md={9} xs={12} className='m-t-20px display-flex'>
                                    <Box className='exam-mark-add-heading-bg fs-18'>
                                        {dateFormat(review_details.start_date, 'DD-MM-YYYY hh:mm A')}
                                    </Box>
                                    <Box className='fs-18 margin-top-5'>
                                        To
                                    </Box>
                                    <Box className='exam-mark-add-heading-bg fs-18'>
                                        {dateFormat(review_details.end_date, 'DD-MM-YYYY hh:mm A')}
                                    </Box>
                                </Grid>
                                <Grid item md={3} xs={12} className='m-t-20px'>
                                    <Box className='fs-18'>
                                        Total Time :
                                    </Box>
                                </Grid>
                                <Grid item md={9} xs={12} className='m-t-20px'>
                                    <Box className='fs-18 '>
                                        {review_details.is_total_time === 'yes' ? getTimeFormatFromSeconds(review_details.total_time) : 'No'}
                                    </Box>
                                </Grid>
                                {/* <Grid item md={3} xs={12} className='m-t-20px'>
                                    <Box className='fs-18'>
                                        Automatic Evaluation :
                                    </Box>
                                </Grid>
                                <Grid item md={9} xs={12} className='m-t-20px'>
                                    <Box className='fs-18 '>
                                        {review_details.is_automatic_evaluation === 'yes' ? 'Yes' : 'No'}
                                    </Box>
                                </Grid> */}

                                <Grid item md={3} xs={12} className='m-t-20px'>
                                    <Box className='fs-18'>
                                        {`${alias_names['standard']} (${alias_names['section']})`} :
                                    </Box>
                                </Grid>
                                <Grid item md={9} xs={12} className='m-t-20px'>
                                    <Box className='fs-18 display-flex'>
                                        <Box >{`${standard_name} - ( `}</Box>
                                        {review_details.selected_sections && review_details.selected_sections.map((data, index) => {
                                            return <Box>
                                                {review_details.selected_sections.length !== index + 1 ? ` ${data.name} , ` : ` ${data.name} `}
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
                                        {review_details.subject_name ? review_details.subject_name : '----'}
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
                                            {review_details.student_list && review_details.student_list.length}
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
                                            {review_details.staff_list && review_details.staff_list.length}
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
                        </Paper>
                    </Box>
                </DialogContent>
            }
            <Box className="submt-button-float-bottom ">
                <Box className='display-flex'>
                    <Button variant='contained'
                        color='primary' className='submit'
                        disabled={submitDisable}
                        onClick={() => submit()}>submit
                    </Button>
                    <Button variant='contained'
                        color='primary' className='submit ml-20'
                        disabled={submitDisable}
                        onClick={() => submit('finalize')}>Finalize
                    </Button>
                </Box>
            </Box>
            <ViewStudentStaffTableFeedBackForm
                user={selectedUser}
                review_details={review_details}
                openDialog={openDialog}
                handleViewDialogClose={handleViewDialogClose}
                ref={dataListRef}
            />
        </Dialog>
    )
}
)

export default ReviewFeedBackFormPage