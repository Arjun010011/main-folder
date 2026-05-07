import React, { Component } from 'react'
import { withRouter } from 'react-router-dom';
import {
    Accordion, AccordionSummary, AccordionDetails, Typography, Button, Box, Tooltip, Dialog, Slide,
    AppBar, Toolbar, IconButton, DialogTitle, Grid, CircularProgress, FormControlLabel, Switch, TextField
} from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import Snackbar from '@material-ui/core/Snackbar';
import Swal from 'sweetalert2'
import _ from 'lodash';

import { Actions } from 'Constants/permissions';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls';
import ReviewQuizPage from './ReviewQuizPage';
import TabSetQuestions from 'Containers/VideoTutorials/Components/TabSetQuestions';
import './../styles.scss';
import LoadingGif from 'Components/LoadingGif';
import { support_videos_global } from 'Containers/VideoTutorials/Constants';
import { maxFileSize } from 'Constants';
import { makeStyles } from '@material-ui/core/styles';
import { withStyles } from '@material-ui/core/styles';
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import DragIndicatorIcon from '@material-ui/icons/DragIndicator';
import ReviewVideoQuiz from 'Containers/Quiz/components/ReviewVideoQuiz';
import ReviewSummaryCreateQuiz from 'Containers/Quiz/components/ReviewSummaryCreateQuiz';
import VideoQuizQuestionList from 'Containers/Quiz/components/VideoQuizQuestionListWithTiming';

import ReactPlayer from 'react-player'
import { setPreviewVideo, Alert, getTimeFormatFromSeconds } from 'Includes/functions';

const grid = 12;

const useStyles = makeStyles({
    option: {
        fontSize: 15,
        '& > span': {
            marginRight: 10,
            fontSize: 18,
        },
    },
});

const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    return result;
};

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="left" ref={ref} {...props} />;
});

const styles = theme => ({
    backdrop: {
        zIndex: theme.zIndex.drawer + 1,
        color: '#fff',
    },
});

const getItemStyle = (isDragging, draggableStyle) => ({
    // some basic styles to make the questionList look a bit nicer
    userSelect: "none",
    padding: `15px`,
    paddingBotton: `0px`,
    margin: `0 0 ${grid}px 0`,
    boxShadow: `rgba(149, 157, 165, 0.2) 0px 8px 24px`,
    // boxShadow: `0 1px 1px rgba(0,0,0,0.11), 
    // 0 2px 2px rgba(0,0,0,0.11), 
    // 0 4px 4px rgba(0,0,0,0.11), 
    // 0 8px 8px rgba(0,0,0,0.11), 
    // 0 16px 16px rgba(0,0,0,0.11), 
    // 0 32px 32px rgba(0,0,0,0.11`,

    // change background colour if dragging
    background: isDragging ? "#E1F0FF" : "white",

    // styles we need to apply on draggables
    ...draggableStyle
});

const getListStyle = isDraggingOver => ({
    background: isDraggingOver ? "lightblue" : "#F0F5FE",
    padding: grid,
});

class CreateQuestionVideoQuiz extends Component {
    constructor(props) {
        super(props);
        this.state = {
            questionList: [],
            expanded: 'panel+-1',
            openReviewPage: false,
            playing: true,
            playedSeconds: 0.00001,
            loading: true,
            section_list: [],
            subject_list: [],
            isDraggable: true,
            loadingReviewDetails: false,
            summaryExpanded: true,
            review_details: { is_questions_at_end: false },
            is_total_time: false,
            is_finalized: false,
            previewVideo: {},
            uploading: { uploadingStatus: 'false', uploadingName: '' },
            fieldError: {},
            time: { hour: '00', minute: '00', seconds: '00' },
            isVideoPage: true,
            retryVideo: false,
            eventFile: {}
        }
        this.onDragEnd = this.onDragEnd.bind(this);
        this.review = React.createRef()
        this.ReviewQuizPage = React.createRef()
        this.player = React.createRef()
    }

    handleCreateQuestion = (seconds) => {
        let { questionList, review_details, total_seconds, expanded } = this.state;
        let secondsTemp = review_details.is_questions_at_end ? total_seconds : seconds;
        const hourValue = getTimeFormatFromSeconds(secondsTemp, 'HH')
        const minuteValue = getTimeFormatFromSeconds(secondsTemp, 'mm')
        const secondsValue = getTimeFormatFromSeconds(secondsTemp, 'ss')

        questionList.push({ time: { hour: hourValue, minute: minuteValue, seconds: secondsValue }, playedSeconds: secondsTemp, question_details: { options: [] } })
        if (questionList.length === 1)
            expanded = 'panel+0'
        this.setState({
            questionList,
            expanded
        }, () => {
            this.updateTimeQuestionDetails(questionList);
        })
    }

    handlePanelChange = (panel) => (event, isExpanded) => {
        let temp = isExpanded ? panel : false
        this.setState({
            expanded: temp
        })
    };


    componentDidMount = () => {
        const { quizDetails, isEdit } = this.props;
        this.setState({
            quizDetails,
            is_finalized: quizDetails['access'] && (quizDetails.is_finalized || !quizDetails.access['update']),
            isEdit,
        }, () => {
            this.getRequestAll()
        })
    }

    updateDetails = () => {
        let { questionList } = this.state;
        let { quizDetails } = this.props;
        questionList = []
        quizDetails.question_form.map((data, index) => {
            data['questionName'] = data.question
            data['time'] = { hour: getTimeFormatFromSeconds(data.question_start_time, 'HH'), minute: getTimeFormatFromSeconds(data.question_start_time, 'mm'), seconds: getTimeFormatFromSeconds(data.question_start_time, 'ss') }
            data['playedSeconds'] = data.question_start_time
            questionList.push(data)
        })
        this.setState({
            loading: false,
            questionList,
            // expanded: false
        }, () => {
            questionList.map((data, index) => {
                this['question' + index].updateEditDetails(data) 
            })
            this.ReviewQuizPage.current.updateReviewDetails(quizDetails)
        })
    }

    handleReviewAndSubmit = () => {
        let { questionList, expanded, review_details, uploading } = this.state;
        let validate = true
        let review_details_temp = this.ReviewQuizPage.current.getDetails()
        if (review_details_temp && (uploading['uploadingStatus'] === 'false' || uploading['uploadingStatus'] === 'success') && questionList.length > 0) {
            for (let i = 0; i < questionList.length; i++) {
                questionList[i]['question_details'] = this['question' + i].getDetails()
                if (!questionList[i]['question_details']) {
                    validate = false
                    expanded = `panel+${i}`
                    this.setState({
                        questionList,
                        expanded
                    })
                    return
                }
            }
            if (validate) {
                this.setState({
                    isVideoPage: false,
                    playing: false,
                    review_details: { ...review_details_temp, ...review_details },
                    uploading: { uploadingStatus: 'false' }
                })
            }
        }
        else if (questionList.length === 0) {
            this.setState({
                openSnackBar: true,
                alertData: 'Atleast create one question'
            })
        }
        else if (uploading['uploadingStatus'] !== 'success') {
            this.setState({
                openSnackBar: true,
                alertData: uploading['uploadingStatus'] === 'error' ? 'Uploaded video is failed, retry' : 'Uploading video, wait for some time'
            })
        }
        else {
            this.setState({
                expanded: 'panel+-1',
            })
        }
    }


    getRequestAll = async () => {
        const { year, current_standard, isEdit ,quizDetails} = this.props;
        const params = { academic_year: year, standard: current_standard };
        const subject_params = { academic_year: year, standard: current_standard, for_admission: 1 };
        try {
            const res = await Promise.all([
                getRequest(GET_URL.getsection.api, params, this.props),
                getRequest(GET_URL.getAssignSubject.api, subject_params, this.props),
            ]);
            this.updateSectionList(res[0])
            this.updateSubjectList(res[1])
            this.setState({
                loadingReviewDetails: false
            }, () => {
                if (isEdit) {
                    this.setState({
                        previewVideo: { url: quizDetails['document']['file'] },
                        loading:false
                    }, () => {
                        this.updateDetails()
                    })
                }
                else {
                    this.setState({ loading: false })
                }
            })
        } catch {
            throw Error("Promise failed");
        }
    };

    updateSectionList = (response) => {
        if (response && response.status === 200) {
            response.data.data.map((data) => {
                data.label = data.name
                data.value = data.id
            })
            this.setState({
                section_list: response.data.data,
            });
        }
    }

    updateSubjectList = (response) => {
        if (response && response.status === 200) {
            this.setState({
                subject_list: response.data.data,
            });
        }
    }

    handleCloseReview = () => {
        this.setState({
            openReviewPage: false
        })
    }

    callGetPage = () => {
        const { current_standard, year } = this.props;
        let sectionInformation = {
            'current_standard': current_standard,
            'year': year,
        }
        let searchParam = "?" + new URLSearchParams(sectionInformation).toString()
        this.props.history.push({
            pathname: Actions.set_quiz.view.url,
            search: searchParam,
        });
    }

    handleChangeProfile = (event) => {
        this.setState({ uploadingFile: true })
        let size = event.target.files[0]['size']
        let fileName = event.target.files[0]['name']
        let file_extension = `${fileName.slice((Math.max(0, fileName.lastIndexOf(".")) || Infinity) + 1)}`;
        let error
        let support_test = true
        support_test = support_videos_global.video_types.includes(file_extension)
        error = support_videos_global.error
        if (support_test) {
            let preview = {
                url: URL.createObjectURL(event.target.files[0]),
                name: fileName,
            }
            setPreviewVideo(preview)
            this.uploadingDetails(fileName, 'info')
            this.setState({
                previewVideo: preview,
                eventFile: event.target.files[0],

            })
        }
        if (event.target.files[0]) {
            if (support_test) {
                if (size < maxFileSize['video'].size) {
                    let dataValue = { file_extension: file_extension, size: size, fileName: fileName }
                    this.postRequestVideo(event.target.files[0], dataValue)
                }
                else {
                    this.setState({
                        errorContent: maxFileSize['video'].errorText,
                        uploadingFile: false,
                        submitDisable: false,

                    })
                }
            }
            else {
                this.setState({
                    openSnackBar: true,
                    alertData: support_videos_global.error,
                    errorContent: error,
                    uploadingFile: false,
                })
            }
        }
    }

    postRequestVideo = (event, dataValue) => {
        const { review_details } = this.state;
        this.setState({ uploadingFile: true, retryVideo: false })
        this.uploadingDetails(dataValue.fileName, 'info')
        let fieldValueTemp = {}
        let post = new FormData();
        post.append('file', event)
        const url = POST_URL.uploads.api
        fieldValueTemp['fileExtension'] = dataValue.file_extension
        fieldValueTemp['size'] = dataValue.size;
        fieldValueTemp['fileName'] = dataValue.fileName;
        postRequest(url, post, this.props).then(response => {
            if (response && response.status === 200) {
                fieldValueTemp['fileId'] = response.data.data.id;
                review_details['video_id'] = response.data.data.id
                this.setState({
                    fieldValue: fieldValueTemp,
                    review_details,
                    submitDisable: false,
                    infoContent: '',
                    errorContent: '',
                    error: '',
                    retryVideo: false
                }, () => {
                    this.uploadingDetails(dataValue.fileName, 'success')
                })
            }
            else {
                this.setState({
                    retryVideo: true,
                    fieldValue: fieldValueTemp
                })
                this.uploadingDetails(dataValue.fileName, 'error')
            }
        })
    }


    uploadingDetails = (name, status, reason) => {
        let { uploading } = this.state;
        if (status === 'info') {
            uploading = { uploadingStatus: status, uploadingName: `${name} is Uploading` }
        }
        else if (status === 'success') {
            uploading = { uploadingStatus: status, uploadingName: `${name} is uploaded` }
        }
        else if (status === 'error') {
            uploading = { uploadingStatus: status, uploadingName: `${reason}` }
        }
        this.setState({
            uploading
        })
    }


    onDragEnd(result) {
        let { questionList, validate, expanded } = this.state;
        if (!result.destination) {
            return;
        }
        questionList.map((data, index) => {
            data['question_details'] = this['question' + index].getStateValue()
            if (!data['question_details']) {
                validate = false
                expanded = `panel+${index}`
            }
        })
        let questionListTemp1 = [...questionList]
        this.setState({
            questionList: []
        }, () => {
            const questionListTemp = reorder(
                questionListTemp1,
                result.source.index,
                result.destination.index
            );
            this.setState({
                questionList: questionListTemp
            }, () => {
                questionListTemp.map((data, index) => {
                    this['question' + index].updateValuesBack(data.question_details)
                    this['question' + index].updateStateValues(data.question_details)
                })
            });
        })
    }

    deleteQuestion = (index) => {
        let { questionList } = this.state;
        questionList.map((data, index) => {
            data['question_details'] = this['question' + index].getStateValue()
        })
        let questionListTemp1 = [...questionList]
        this.setState({
            questionList: []
        }, () => {
            questionListTemp1.splice(index, 1)
            this.setState({
                questionList: questionListTemp1
            }, () => {
                questionListTemp1.map((data, index) => {
                    this['question' + index].updateValuesBack(data.question_details)
                    this['question' + index].updateStateValues(data.question_details)
                })
            });
        })
    }


    updateQuestionName = (value, index) => {
        let { questionList } = this.state;
        questionList[index]['questionName'] = value
        this.setState({
            questionList
        })
    }

    updateIsTotalTime = (value) => {
        this.setState({
            is_total_time: value === 'yes' ? true : false
        })
    }

    handleClose = () => {
        this.setState({
            openSnackBar: false,
            alertData: ''
        })
    }

    closeUploading = () => {
        let temp = { uploadingStatus: 'false', uploadingName: '' }
        this.setState({
            uploading: { ...temp }
        })
    }

    handleLoading = () => {
        this.setState({
            loadingVideo: false,
            // playing: true
        })
    }

    handleDuration = (duration) => {
        this.setState({
            total_seconds: duration
        })
    }

    handleProgress = state => {
        let seconds = state.playedSeconds === 0 ? '0.00001' : state.playedSeconds
        this.setState({
            playedSeconds: seconds,
        })
    }

    handleSeek = (seconds) => {
        if (seconds) {
            this.setState({
                playing: false
            })
            this.player.current.seekTo(seconds);
        }
    }


    handleIsQuestion = () => {
        let { review_details, questionList, total_seconds } = this.state;
        if (!review_details.is_questions_at_end) {
            Swal.fire({
                title: "<strong>Are you sure want Questions at the end of video</strong>",
                text: "You will loss seconds data for all question!!",
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
                    if (questionList.length > 0) {
                        const hourValue = getTimeFormatFromSeconds(total_seconds, 'HH')
                        const minuteValue = getTimeFormatFromSeconds(total_seconds, 'mm')
                        const secondsValue = getTimeFormatFromSeconds(total_seconds, 'ss')
                        questionList.map((data) => {
                            data['playedSeconds'] = total_seconds
                            data['time'] = { hour: hourValue, minute: minuteValue, seconds: secondsValue }
                        })
                    }
                    review_details['is_questions_at_end'] = !review_details['is_questions_at_end']
                    this.setState({
                        review_details
                    })
                }
            })
        }
        else {
            review_details['is_questions_at_end'] = !review_details['is_questions_at_end']
            this.setState({
                review_details
            })
        }
    }

    updateTimeQuestionDetails = (question_details) => {
        question_details.map((data, index) => {
            data['question_details'] = this['question' + index].getStateValue()
        })
        let questionListTemp1 = [...question_details]
        this.setState({
            questionList: []
        }, () => {
            questionListTemp1 = _.sortBy(questionListTemp1, 'playedSeconds')
            this.setState({
                questionList: questionListTemp1
            }, () => {
                questionListTemp1.map((data, index) => {
                    this['question' + index].updateValuesBack(data.question_details)
                    this['question' + index].updateStateValues(data.question_details)
                })
            });
        })
    }

    handleChangeVideo = () => {
        const { review_details } = this.state;
        Swal.fire({
            title: "<strong>Are you sure want to Change Video</strong>",
            text: "You will loss all the entered data!!",
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
                review_details['is_questions_at_end'] = false
                this.setState({
                    previewVideo: {},
                    uploading: { uploadingStatus: 'false', uploadingName: '' },
                    review_details,
                    fieldError: {},
                    time: { hour: '00', minute: '00', seconds: '00' },
                    questionList: [],
                    playedSeconds: '0.00001',
                })
                document.getElementById('upload-video-quiz').click()
            }
        })
    }

    handleReview = () => {
        this.setState({
            isVideoPage: true,
        })
    }

    render() {
        const { questionList, expanded,  retryVideo, loading, section_list, isVideoPage, subject_list, eventFile, total_seconds,
            previewVideo, loadingReviewDetails, review_details, is_total_time, uploading, openSnackBar, alertData, playing, playedSeconds, fieldValue } = this.state;
        const { current_standard, year, end_date, isEdit, quizDetails, standard_name } = this.props;
        if (loading) {
            return <LoadingGif />
        }
        else {
            return (
                <Dialog fullScreen open={true} onClose={this.props.goToViewPage} TransitionComponent={Transition}>
                    <AppBar>
                        <Toolbar className='justify-content-space-between'>
                            {isVideoPage &&
                                <Box display='flex' className='align-items-center'>
                                    <IconButton edge="start" color="inherit" onClick={() => this.props.goToViewPage()} aria-label="close">
                                        <CloseIcon />
                                    </IconButton>
                                    <Typography variant="h6">
                                        Video Quiz
                                    </Typography>
                                </Box>
                            }
                            <Box>
                                {previewVideo.url &&
                                    <Button
                                        className='submit'
                                        onClick={isVideoPage ? this.handleReviewAndSubmit : this.handleReview}
                                    > {isVideoPage ? 'Review' : 'Go Back'}</Button>
                                }
                            </Box>

                        </Toolbar>
                    </AppBar>
                    <DialogTitle id='form-dialog-title'></DialogTitle>
                    <Grid container className={isVideoPage ? '' : 'display-none'}>
                        <Grid item md={4} xs={12} className='m-t-20px p-l-5px'>
                            {!previewVideo.url &&
                                <Box className='p-t-20px'>
                                    <label htmlFor={'upload-video-quiz'}>
                                        <Button variant="raised" component='span' className='upload-document-logo-button'>
                                            Upload Video<Box className='upload-icon'><i class="fa fa-upload" aria-hidden="true"></i></Box>
                                        </Button>
                                    </label>
                                    <input type='file' accept='video/*' id='upload-video-quiz' className='display-none' onChange={(e) => this.handleChangeProfile(e)}
                                        onClick={e => (e.target.value = null)} />
                                </Box>
                            }
                            <>
                                <Box style={{ height: '270px' }}>
                                    <ReactPlayer
                                        ref={this.player}
                                        url={previewVideo.url}
                                        width='100%'
                                        height='100%'
                                        controls={true}
                                        playing={playing}
                                        onDuration={this.handleDuration}
                                        onReady={() => this.handleLoading()}
                                        onProgress={this.handleProgress}
                                        onSeek={() => this.handleSeek()}
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
                                {previewVideo.url &&
                                    <>
                                        <Box>
                                            <FormControlLabel
                                                control={<Switch checked={review_details.is_questions_at_end}
                                                    name="is_questions_at_end"
                                                    value={review_details.is_questions_at_end}
                                                    color="primary"
                                                    onChange={(e) => this.handleIsQuestion(e)} />}
                                                label={<div className='fs-18 font-weight-bold text-blue'>
                                                    Is Questions at the end of video
                                                </div>}
                                            />
                                        </Box>
                                        <Box className='display-flex margin-top-10'>
                                            <Box>
                                                <Button
                                                    className='form-next-pre-button'
                                                    onClick={() => this.handleCreateQuestion(playedSeconds)}
                                                >
                                                    {review_details.is_questions_at_end ?
                                                        `Create Question`
                                                        :
                                                        `Create Question at ${getTimeFormatFromSeconds(playedSeconds)}`
                                                    }
                                                </Button>
                                            </Box>
                                            <Box className='align-self-center m-b-10px pr-5'>
                                                <Button
                                                    className='apply-leave-reset-button '
                                                    onClick={this.handleChangeVideo}>Change Video
                                                </Button>
                                            </Box>
                                        </Box>
                                    </>
                                }
                            </>
                            <Box className='quiz-video-question-list'>
                                <VideoQuizQuestionList
                                    questionList={questionList}
                                    is_questions_at_end={review_details.is_questions_at_end}
                                    deleteQuestion={this.deleteQuestion}
                                    updateTimeQuestionDetails={this.updateTimeQuestionDetails}
                                    total_seconds={total_seconds}
                                    handleSeek={this.handleSeek}
                                />
                            </Box>
                        </Grid>
                        <Grid item md={8} xs={12}>
                            <Box className='m-t-20px p-t-20px pr-5'>
                                <Box display='flex' className='p-5px'>
                                <Accordion expanded={expanded === 'panel+-1'} onChange={this.handlePanelChange(`panel+-1`)} className={expanded === 'panel+-1' ? 'padding-15' : ''}>
                                        <AccordionSummary
                                            expandIcon={<ExpandMoreIcon />}
                                            aria-controls="panel1a-content"
                                            id="panel1a-header"
                                            className='accordin-summary'
                                        >
                                            <Box className='fs-18 form-left-heading'>
                                                {'Quiz Configuration'}
                                              
                                            </Box>
                                        </AccordionSummary>
                                        <ReviewSummaryCreateQuiz
                                            section_list={section_list}
                                            subject_list={subject_list}
                                            current_standard={current_standard}
                                            year={year}
                                            maxDate={end_date}
                                            isEdit={isEdit}
                                            quizDetails={quizDetails}
                                            ref={this.ReviewQuizPage}
                                            updateIsTotalTime={this.updateIsTotalTime}
                                        />
                                    </Accordion>
                                </Box>
                                {
                                    questionList.length > 0 &&
                                    <Box className="quiz-video-create-paper">
                                        <DragDropContext onDragEnd={this.onDragEnd} >
                                            <Droppable droppableId="droppable">
                                                {(provided, snapshot) => (
                                                    <div
                                                        {...provided.droppableProps}
                                                        ref={provided.innerRef}
                                                        style={getListStyle(snapshot.isDraggingOver)}
                                                        className='p-5px'
                                                    >
                                                        {questionList.map((item, index) => (
                                                            <Draggable key={'key_' + index} draggableId={'item' + index} index={index} isDragDisabled={!review_details.is_questions_at_end || expanded === `panel+${index}`}>
                                                                {(provided, snapshot) => (
                                                                    <div
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        {...provided.dragHandleProps}
                                                                        style={getItemStyle(
                                                                            snapshot.isDragging,
                                                                            provided.draggableProps.style,
                                                                        )}
                                                                        className='position-relative padding-0'
                                                                    >
                                                                        <Box display='flex' className='p-5px' key={index}>
                                                                            {questionList.length > 1 && expanded !== `panel+${index}` && review_details.is_questions_at_end &&
                                                                                <Box className='cursor-grabbing'>
                                                                                    <Button color="primary" className='min-max-w-0 padding-0'>
                                                                                        <DragIndicatorIcon />
                                                                                    </Button>
                                                                                </Box>
                                                                            }
                                                                            <Accordion expanded={expanded === `panel+${index}`} onChange={this.handlePanelChange(`panel+${index}`)}>
                                                                                <AccordionSummary
                                                                                    expandIcon={<ExpandMoreIcon />}
                                                                                    aria-controls="panel1a-content"
                                                                                    id="panel1a-header"
                                                                                >
                                                                                    <Typography className=''>{review_details.is_questions_at_end ? item.questionName ? item.questionName : 'Untitled Question' : item.questionName ? `${item.questionName} At ${getTimeFormatFromSeconds(item['playedSeconds'])}` : `Untitled Question At ${getTimeFormatFromSeconds(item['playedSeconds'])}`}</Typography>
                                                                                </AccordionSummary>
                                                                                <AccordionDetails>
                                                                                    <TabSetQuestions
                                                                                        ref={this.question}
                                                                                        updateQuestionName={this.updateQuestionName}
                                                                                        is_total_time={is_total_time}
                                                                                        ref={input => {
                                                                                            this['question' + index] = input;
                                                                                        }}
                                                                                        qindex={index}
                                                                                    />
                                                                                </AccordionDetails>
                                                                            </Accordion>
                                                                            {(index !== 0 || questionList.length > 1) &&
                                                                                <Box>
                                                                                    <Button color="secondary" className='min-max-w-0' onClick={() => this.deleteQuestion(index)}>
                                                                                        <DeleteOutlineIcon className='add-icon-stock-item' />
                                                                                    </Button>
                                                                                </Box>
                                                                            }
                                                                        </Box>
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                        ))}
                                                        {provided.placeholder}
                                                    </div>
                                                )}
                                            </Droppable>
                                        </DragDropContext>
                                    </Box>
                                }
                            </Box>
                        </Grid>
                    </Grid>
                    <Grid container className={isVideoPage ? 'display-none' : ''}>
                        <ReviewVideoQuiz
                            handleClose={this.handleCloseReview}
                            loadingReviewDetails={loadingReviewDetails}
                            questionList={questionList}
                            section_list={section_list}
                            subject_list={subject_list}
                            current_standard={current_standard}
                            year={year}
                            maxDate={end_date} 
                            callGetPage={this.callGetPage}
                            ref={this.review}
                            review_details={review_details}
                            standard_name={standard_name}
                            openReviewPage={!isVideoPage}
                        />
                    </Grid>
                    <Snackbar className='snackbar-custom-style' anchorOrigin={{ vertical: 'top', horizontal: 'center' }} open={uploading.uploadingStatus === 'false' ? false : true}>
                        <Alert className='align-alert-message' severity={uploading.uploadingStatus} >
                            {retryVideo ?
                                <Box className='text-underline cursor-pointer' onClick={() => this.postRequestVideo(eventFile, fieldValue)}>
                                    {`Uploading failed please retry video`}
                                </Box>
                                :
                                <Box className='uploading-outer-box'>
                                    {uploading.uploadingName}
                                    <Box className={uploading.uploadingStatus === 'info' ? 'uploading-loading-icon-box' : 'display-none'} >
                                        <CircularProgress className='uploadingLoadingIcon' />
                                    </Box>
                                    {uploading.uploadingStatus === 'success' &&
                                        <Box onClick={this.closeUploading}>
                                            <HighlightOffIcon className='close-icon-uploading' />
                                        </Box>
                                    }
                                </Box>
                            }
                        </Alert>
                    </Snackbar>
                    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={openSnackBar} autoHideDuration={5000} onClose={this.handleClose}>
                        <Alert onClose={this.handleClose} severity="error">
                            {alertData}
                        </Alert>
                    </Snackbar>
                </Dialog>
            )
        }
    }
}
export default withRouter(withStyles(styles)(CreateQuestionVideoQuiz))
