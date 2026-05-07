import React, { Component } from 'react'
import {
    Box, Tooltip, Dialog, Paper, Icon, Slide, Grid, Button, CircularProgress, AppBar, Toolbar,
    IconButton, Typography, Breadcrumbs
} from '@material-ui/core';
import { withRouter } from 'react-router-dom';
import PlayCircleOutlineIcon from '@material-ui/icons/PlayCircleOutline';
import CloseRoundedIcon from '@material-ui/icons/CloseRounded';
import ReactPlayer from 'react-player'
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import CloseIcon from '@material-ui/icons/Close';
import classNames from 'classnames'
import Snackbar from '@material-ui/core/Snackbar';
import HomeOutlinedIcon from '@material-ui/icons/HomeOutlined';

import { Alert } from 'Includes/functions';
import { SORTOPTIONS } from 'Constants';
import { file_default_image } from 'Containers/VideoTutorials/Constants';
import { dateFormat, formatBytes, handleTimeFormat } from 'Includes/functions';
import AllMUIDataTable from 'Components/AllMUIDataTable';


const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});


const options_global = [
    { value: 'Karnataka' },
    { value: 'Goa' },
    { value: 'Delhi' },
    { value: 'Tamilnaadu' }
]

const questionsListInSeconds_global = [
    { id: 5, time: 5, question: 'Question 1' },
    { id: 10, time: 10, question: 'Question 2' },
    { id: 15, time: 15, question: 'Question 3' },
]

class VideosList extends Component {
    constructor(props) {
        super(props)

        this.state = {
            videosList: [],
            selectedToggle: 'grid',
            playing: true,
            duration: 0,
            playedSeconds: 0,
            isQuestionOpen: false,
            questionsListInSeconds: [],
            stopVideo: false,
            questionNumber: 0,
            currentSecond: 0,
            submitAnswer: false,
            submitLabel: 'Continue Video',
            answer: '',
            videoInformation: {},
            subDuration: {},
            folderPath: [],
            columns: [
                {
                    name: "trr_id",
                    label: "Date Created",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        display: false
                    }
                },
                {
                    name: "document_url",
                    label: "document_url",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        display: false
                    }
                },
                {
                    name: "name",
                    label: "Name",
                    options: {
                        filter: true,
                        sort: true,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Tooltip title='Click to open it' enterDelay={400}
                                    enterNextDelay={400} placement='top-start'
                                    classes={{ tooltip: 'tooltip-show-data' }}>
                                    <Box onClick={() => this.handleTableOpen(tableMeta.rowData[0], tableMeta.rowData[1].file,
                                        tableMeta.rowData[2], tableMeta.rowData[5], tableMeta.rowData[6])} className='video-name-table'>
                                        {value}
                                    </Box>
                                </Tooltip>
                            )
                        },
                    }
                },

                {
                    name: "file_type",
                    label: "Format",
                    options: {
                        filter: true,
                        sort: true,
                        search: true,
                    }
                },
                {
                    name: "size",
                    label: "Size",
                    options: {
                        filter: true,
                        sort: true,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return formatBytes(value)
                        },
                    }
                },
                {
                    name: "created_by_name",
                    label: "Owner Name",
                    options: {
                        filter: true,
                        sort: true,
                        search: true,
                    }
                },
                {
                    name: "description",
                    label: "description",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                    }
                },
                {
                    name: "date_created",
                    label: "Uploaded Date",
                    options: {
                        filter: true,
                        sort: true,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return dateFormat(value, 'DD-MM-YYYY')
                        },
                    }
                },

            ]
        }
        this.player = React.createRef();
    }


    componentDidMount = () => {
        if (this.props.location.state && this.props.location.state.data) {
            let list = this.props.location.state.data.videoList;
            let folderId = this.props.location.state.data.id;
            let folderPath = this.props.location.state.data.folderPath;
            let options = { ...SORTOPTIONS }
            let questionsListInSeconds = []
            questionsListInSeconds_global.map((data) => {
                if (Object.keys(data).includes('time')) {
                    questionsListInSeconds.push(data.time)
                }
            })
            this.setState({
                videosList: list,
                folderId,
                options: options,
                questionsListInSeconds: questionsListInSeconds,
                folderPath: folderPath ? folderPath.split(',') : []
            })
        }
        else {
            this.props.history.push('/tutorial/view')
        }
    }

    handleViewButton = () => {
        let { folderId } = this.state;
        this.props.history.push({
            pathname: '/tutorial/view',
            state: { data: folderId }
        })
    }


    handleOpen = (temp) => {
        this.setState({
            open: true,
            selectedId: temp.id,
            loadingVideo: true,
            previewUrl: temp.document_url.file,
            isQuestionOpen: false,
            stopVideo: false,
            currentSecond: 0,
            videoInformation: temp
        })
    }

    handleTableOpen = (id, url, name, owner, description) => {
        let temp = { id: id, name: name, description: description, owner_name: owner }
        this.setState({
            open: true,
            selectedId: id,
            loadingVideo: true,
            previewUrl: url,
            isQuestionOpen: false,
            stopVideo: false,
            currentSecond: 0,
            videoInformation: temp
        })
    }

    handleClose = () => {
        this.setState({
            open: false,
            previewUrl: '',
        })
    }

    handleWatchVideo = (temp) => {
        this.setState({
            open: true,
            selectedId: temp.id,
            previewUrl: '',
            loadingVideo: true,
            playing: false,
            videoInformation: temp
        }, () => {
            this.handleURL(temp.document_url.file);
        })
    }

    handleURL = (url) => {
        this.setState({
            previewUrl: url
        })
    }

    changeToggle = (value) => {
        if (value !== null) {
            this.setState({
                selectedToggle: value
            })
        }
    }

    handleLoading = () => {
        this.setState({
            loadingVideo: false,
            playing: true
        })
    }

    handleDuration = (duration) => {
        this.setState({
            duration: duration
        })
    }


    subHandleDuration = (duration, id) => {
        let { subDuration } = this.state
        subDuration[id] = duration
        this.setState({
            subDuration
        })
    }


    handleProgress = state => {
        let { questionsListInSeconds, currentSecond, } = this.state;
        if (currentSecond !== parseInt(state.playedSeconds) && questionsListInSeconds.includes(parseInt(state.playedSeconds))) {
            this.setState({
                stopVideo: false,//Need to change true
                playing: true,//Need to change false
                isQuestionOpen: false,//Need to change true
                currentSecond: parseInt(state.playedSeconds)
            })
        }
        else {
            this.setState({
                playedSeconds: state.playedSeconds
            })
        }
    }

    handleSeek = () => {
        // let { playedSeconds } = this.state;
        // var delta = this.player.current.getCurrentTime() - playedSeconds;
        // if (delta > 0.01) {
        //     this.player.current.seekTo(playedSeconds);
        // }
    }

    changeAnswer = (e) => {
        let { name, value } = e.target;
        this.setState({
            [name]: value
        })
    }

    submitAnswer = () => {
        let { answer, questionNumber } = this.state;
        if (answer !== '') {
            questionNumber = parseInt(questionNumber) + 1;
            this.setState({
                stopVideo: false,
                playing: true,
                isQuestionOpen: false,
                questionNumber
            })
        }
        else {
            let alertData = 'Select option to continue video'
            this.setState({
                errorStatus: 'error',
                alertData,
                openSnackbar: true
            })
        }
    }

    handleCloseSnackBar = () => {
        this.setState({
            openSnackbar: false,
            alertData: ''
        })
    }

    subHandleProgress = state => {
        if (state.playedSeconds === 1) {
            this.setState({
                subPlaying: false,
                light: true
            })
        }
    }

    checkMoreLength = (name, description) => {
        let temp = name + description;
        if (temp.length > 60) {
            return true
        }
        else {
            return false
        }
    }

    render() {
        const { videosList, open, previewUrl, loadingVideo, selectedToggle, columns, options, playing, isQuestion, isQuestionOpen,
            folderPath, stopVideo, openSnackbar, errorStatus, alertData, videoInformation,
            light, subPlaying, subDuration } = this.state;
        return (
            <div>
                <Grid container>
                    <Grid item md={6} xs={12}>
                        <Box className='heading header-align'>
                            Videos
                        </Box>
                    </Grid>
                    <Grid item md={6} xs={12}>
                        <Box className='header-align end-flex-prop'>
                            <Button
                                variant="contained"
                                onClick={() => this.handleViewButton()}
                                className='editbutton-view'
                            ><VisibilityOutlinedIcon className='visibility-icon' /> Back to Folders</Button>
                        </Box>
                    </Grid>
                    <Grid item md={8} xs={8} className='margin-top-10 '>
                        <Breadcrumbs maxItems={5} aria-label="breadcrumb">
                            <Button className='breadcrumb pointer-event-none'>
                                <HomeOutlinedIcon />Home
                            </Button>
                            {folderPath.map((temp) => {
                                return (
                                    <Button className='breadcrumb pointer-event-none'>
                                        {temp}
                                    </Button>
                                )
                            })}
                        </Breadcrumbs>
                    </Grid>
                    <Grid item md={4} xs={4} className='end-flex-prop margin-top-10 '>
                        <Box className='list-grid-toggle-outer-div header-align'>
                            <Button className={selectedToggle === 'grid' ? 'list-selected-toggle' : 'grid-selected-toggle'}
                                onClick={() => this.changeToggle('grid')}
                                disabled={selectedToggle === 'grid'}>
                                <Box className={selectedToggle === 'grid' ? 'list-selected-toggle-text' : 'grid-selected-toggle-text'}>Grid View</Box>
                                <Icon className={classNames(selectedToggle === 'grid' ? 'list-selected-toggle-icon' : 'grid-selected-toggle-icon', "fa fa-bars")} />

                            </Button>
                            <Button className={selectedToggle === 'list' ? 'list-selected-toggle' : 'grid-selected-toggle'}
                                onClick={() => this.changeToggle('list')}
                                disabled={selectedToggle === 'list'}>
                                <Box className={selectedToggle === 'list' ? 'list-selected-toggle-text' : 'grid-selected-toggle-text'}>List View</Box>
                                <Icon className={classNames(selectedToggle === 'list' ? 'list-selected-toggle-icon' : 'grid-selected-toggle-icon', "fa fa-th-large")} />
                            </Button>
                        </Box>
                    </Grid>
                </Grid>
                {selectedToggle === 'grid' &&
                    <Box className='header-align'>
                        <Box className='file-outer-box'>
                            {videosList.map((temp, index) => {
                                return (
                                    <Box
                                        key={index}
                                        onClick={() => this.handleOpen(temp)}
                                        className={'file-inner-box'}
                                        ref={`file_${temp.tree_id}`}>
                                        <Box className={file_default_image[`${temp.file_type}`]['className']}>
                                            {file_default_image[`${temp.file_type}`]['tag']}
                                        </Box>
                                        <Tooltip title={temp.name.length > 35 ? temp.name : ''} enterDelay={500}
                                            enterNextDelay={400} placement='top-start'
                                            classes={{ tooltip: 'tooltip-show-data' }}>
                                            <Box className={temp.name.length > 35 ? 'handle-file-name-overflow' : 'file-name'}
                                            >
                                                {temp.name}</Box>
                                        </Tooltip>
                                    </Box>
                                )
                            })}
                        </Box>
                    </Box>
                }
                {selectedToggle === 'list' &&
                    <Box className='header-align'>
                        <AllMUIDataTable
                            title=''
                            data={videosList}
                            columns={columns}
                            options={options}

                        />
                    </Box>
                }
                <Dialog fullScreen open={open} onClose={this.handleClose} TransitionComponent={Transition}>
                    <AppBar>
                        <Toolbar>
                            <IconButton edge="start" color="inherit" onClick={() => this.handleClose()} aria-label="close">
                                <CloseIcon />
                            </IconButton>
                            <Typography variant="h6">
                                Video Name - {videoInformation.name}
                            </Typography>
                        </Toolbar>
                    </AppBar>
                    <Box className={loadingVideo ? 'videoLoading' : 'display-none'}>
                        <CircularProgress />
                    </Box>
                    <Paper className={loadingVideo ? 'display-none' : 'paper-video-list-background'}>
                        <Box className='video-list-close-icon-box'>
                            <CloseRoundedIcon onClick={this.handleClose} className='view-details-close-icon' />
                        </Box>
                        <Grid container spacing={2}>
                            <Grid item md={8} xs={12} style={{ height: '500px' }}>
                                <Box className={loadingVideo ? 'display-none' : stopVideo ? 'disabled-video react-player-box' : 'react-player-box'}>
                                    <ReactPlayer
                                        ref={this.player}
                                        url={previewUrl}
                                        width='100%'
                                        height='100%'
                                        controls={true}
                                        playing={playing}
                                        onDuration={this.handleDuration}
                                        onReady={() => this.handleLoading()}
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
                                {!loadingVideo &&
                                    <Box className='video-information-outer-box'>
                                        {videoInformation.name}{` | ${videoInformation.description}`}{` | ${videoInformation.created_by_name}`}
                                    </Box>
                                }
                            </Grid>
                            <Grid md={4} xs={12} className='video-list-grid'>
                                {videosList.map((temp, index) => {
                                    return (
                                        <Paper key={index} className='video-list-box' elevation={3} onClick={() => this.handleWatchVideo(temp)}>
                                            <Box className='video-list-name-details'>
                                                <Box className='align-self-center'>
                                                    <PlayCircleOutlineIcon className='video-play-icon' />
                                                </Box>
                                                <Box className='video-info-outer-box'>
                                                    <Box className={this.checkMoreLength(temp.name, temp.description)
                                                        ? 'video-list-name-outer-box-handle-overflow' : 'video-list-name-outer-box'}>
                                                        {temp.name}{` | ${temp.created_by_name}`}
                                                    </Box>
                                                    <Box className='video-information-time-duration'>{handleTimeFormat(subDuration[temp.id])}</Box>
                                                </Box>
                                            </Box>
                                        </Paper>
                                    )
                                })}
                            </Grid>
                        </Grid>
                    </Paper>
                </Dialog>
                <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={openSnackbar} autoHideDuration={2000} onClose={(e) => this.handleCloseSnackBar(e)}>
                    <Alert onClose={(e) => this.handleCloseSnackBar(e)} severity={errorStatus}>
                        {alertData}
                    </Alert>
                </Snackbar>
            </div>
        )
    }
}

export default withRouter(VideosList);