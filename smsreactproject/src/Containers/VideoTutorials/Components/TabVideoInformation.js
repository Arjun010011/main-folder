import React, { Component } from 'react';
import { createStructuredSelector } from 'reselect';
import { connect } from 'react-redux';

import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, Grid, CircularProgress, withStyles,
    ListItemIcon, MenuItem, Menu, ListItemText, Paper, Slide, AppBar, Tabs, Tab, Typography
} from '@material-ui/core';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ReactPlayer from 'react-player'
import HighlightOffIcon from '@material-ui/icons/HighlightOff';

import { getVideotorialPreviewUrl } from 'Containers/VideoTutorials/Selectors';
import { setLargeImagePreview, getLargeImagePreview, getPreviewVideo, formatBytes, handleTimeFormat } from 'Includes/functions';
import TabSetQuestions from 'Containers/VideoTutorials/Components/TabSetQuestions';
import './styles.scss';
class TabVideoInformation extends Component {
    constructor(props) {
        super(props)

        this.state = {
            playing: false,
            playedSeconds: '0.00001',
            videoUrl: '',
            questionList: [],
            expanded: false
        }
        this.player = React.createRef();
    }

    handleLoading = () => {
        this.setState({
            loadingVideo: false,
            // playing: true
        })
    }

    handleDuration = (duration) => {
        this.setState({
            duration: duration
        })
    }

    handleProgress = state => {
        let seconds = state.playedSeconds === 0 ? '0.00001' : state.playedSeconds
        this.setState({
            playedSeconds: seconds
        })
    }

    handleSeek = () => {
        // let { playedSeconds } = this.state;
        // var delta = this.player.current.getCurrentTime() - playedSeconds;
        // if (delta > 0.01) {
        //     this.player.current.seekTo(playedSeconds);
        // }
    }

    componentDidMount = () => {
        let preview = getPreviewVideo()
        this.setState({
            videoUrl: preview.url,
            videoName: preview.name,
            description: preview.description,
        })
    }



    handleCreateQuestion = (seconds) => {

        const { compare } = new Intl.Collator(undefined, {
            numeric: true,
            sensitivity: "base"
        });

        let { questionList, expanded } = this.state;
        if (questionList.length === 0) {
            questionList.push(seconds)
            expanded = 'panel+0'

        }
        else {
            let low = 0;
            let high = questionList.length;

            while (low < high) {
                const mid = (low + high) >> 1;
                compare(questionList[mid], seconds) > 0
                    ? (high = mid)
                    : (low = mid + 1);
            }

            questionList.splice(low, 0, seconds);
            expanded = `panel+${low}`
        }
        this.setState({
            questionList,
            expanded
        })
    }

    deleteQuestion = (index) => {
        let { questionList } = this.state;
        questionList.splice(index, 1)
        this.setState({
            questionList
        })
    }

    handlePanelChange = (panel) => (event, isExpanded) => {
        let temp = isExpanded ? panel : false
        this.setState({
            expanded: temp
        })
    };

    

    render() {
        const { playing, videoUrl, playedSeconds, questionList, expanded } = this.state;
        return (
            <div>
                <Grid container spacing={2}>
                    <Grid item md={5}>
                        <Box className='set-questions-preview-video'>
                            <ReactPlayer
                                ref={this.player}
                                url={videoUrl}
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
                        <Box className='margin-top-20'>
                            <Button
                                className='form-next-pre-button'
                                onClick={() => this.handleCreateQuestion(playedSeconds)}
                            > Create Question at {handleTimeFormat(playedSeconds)} </Button>
                        </Box>
                        <Box>
                            {questionList.map((temp, index) => {
                                return (
                                    <Box className='set-question-outer-box'>
                                        <Box className='set-question-box'>
                                            Question {index + 1} at - {handleTimeFormat(temp)}
                                        </Box>
                                        <Box className='delete-set-question'
                                            onClick={() => this.deleteQuestion(index)}>
                                            <HighlightOffIcon />
                                        </Box>
                                    </Box>
                                )
                            })}
                        </Box>
                    </Grid>

                    <Grid item md={7}>
                        <Box>
                            {questionList.map((temp, index) => {
                                return (
                                    <Accordion expanded={expanded === `panel+${index}`} onChange={this.handlePanelChange(`panel+${index}`)}>
                                        <AccordionSummary
                                            expandIcon={<ExpandMoreIcon />}
                                            aria-controls="panel1a-content"
                                            id="panel1a-header"
                                        >
                                            <Typography className=''>Question {index + 1} at - {handleTimeFormat(temp)}</Typography>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <TabSetQuestions />
                                        </AccordionDetails>
                                    </Accordion>
                                )
                            })}
                        </Box>

                    </Grid>
                </Grid>
                
            </div>
        )
    }
}


// const mapStateToProps = createStructuredSelector({
//     videoPreviewUrl: getVideotorialPreviewUrl()
// });
// export default connect(mapStateToProps)(TabVideoInformation);
export default TabVideoInformation;