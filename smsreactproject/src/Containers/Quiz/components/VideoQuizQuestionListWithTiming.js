
import React, { useState, useEffect, useImperativeHandle } from 'react'
import { Box } from '@material-ui/core';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import moment from 'moment';
import Snackbar from '@material-ui/core/Snackbar';

import { numberRegex } from 'Constants/regularExpression';
import { Alert, getTimeFormatFromSeconds } from 'Includes/functions';
import _ from 'lodash';

const VideoQuizQuestionList = React.forwardRef((props, ref) => {

    const { questionList, isQuestionEnd, total_seconds } = props;

    const [questionListLocal, set_questionListLocal] = useState([])
    const [fieldError, set_fieldError] = useState({})
    const [alertData, set_alertData] = useState('')
    const [openSnackbar, set_openSnackbar] = useState(false)
    const [focus, set_focus] = useState(false)

    useEffect(() => {
        set_questionListLocal(() => questionList)
    }, [questionList])

    const handleKeyFunction = (e, index, name) => {
        let question_details = _.cloneDeep(questionListLocal)
        let fieldErrorNew = { ...fieldError }
        if (e.key === 'ArrowUp') {
            question_details[index]['time'][name]++
            question_details[index]['time'][name] = question_details[index]['time'][name] + ''
            if (question_details[index]['time'][name].length === 1) {
                question_details[index]['time'][name] = ("0" + question_details[index]['time'][name])
            }
        }
        if (e.key === 'ArrowDown') {
            question_details[index]['time'][name]--
            if (question_details[index]['time']['seconds'] === -1 && parseInt(question_details[index]['time']['minute']) > 0) {
                question_details[index]['time']['minute']--
                question_details[index]['time']['minute'] = question_details[index]['time']['minute'] + ''
                if (question_details[index]['time']['minute'].length === 1) {
                    question_details[index]['time']['minute'] = ("0" + question_details[index]['time']['minute'])
                }
                question_details[index]['time']['seconds'] = '59'
            }
            if (question_details[index]['time']['minute'] === -1 && parseInt(question_details[index]['time']['hour']) > 0) {
                question_details[index]['time']['hour']--
                question_details[index]['time']['hour'] = question_details[index]['time']['hour'] + ''
                if (question_details[index]['time']['hour'].length === 1) {
                    question_details[index]['time']['hour'] = ("0" + question_details[index]['time']['hour'])
                }
                question_details[index]['time']['minute'] = '59'
            }
            else {
                question_details[index]['time'][name] = question_details[index]['time'][name] + ''
                if (question_details[index]['time'][name].length === 1) {
                    question_details[index]['time'][name] = ("0" + question_details[index]['time'][name])
                }
            }
        }
        if (question_details[index]['time']['seconds'] === '60') {
            question_details[index]['time']['minute']++
            question_details[index]['time']['minute'] = question_details[index]['time']['minute'] + ''
            if (question_details[index]['time']['minute'].length === 1) {
                question_details[index]['time']['minute'] = ("0" + question_details[index]['time']['minute'])
            }
            question_details[index]['time']['seconds'] = '00'
        }
        if (question_details[index]['time']['minute'] === '60') {
            question_details[index]['time']['hour']++
            question_details[index]['time']['hour'] = question_details[index]['time']['hour'] + ''
            if (question_details[index]['time']['hour'].length === 1) {
                question_details[index]['time']['hour'] = ("0" + question_details[index]['time']['hour'])
            }
            question_details[index]['time']['minute'] = '00'
        }
        let seconds = moment.duration(`${question_details[index]['time'].hour}:${question_details[index]['time'].minute}:${question_details[index]['time'].seconds}`).asSeconds();
        if ((total_seconds - seconds >= 0) && question_details[index]['time'][name] >= 0 && question_details[index]['time']['hour'] <= 59 && question_details[index]['time']['minute'] <= 59 && question_details[index]['time']['seconds'] <= 59) {
            delete fieldErrorNew['time']
            props.handleSeek(seconds)
            set_questionListLocal(() => question_details)
            set_fieldError(() => fieldErrorNew)
        }
        else if (total_seconds - seconds < 0) {
            set_alertData(() => `Maximum video duraction time is ${getTimeFormatFromSeconds(total_seconds, 'HH:mm:ss')}`)
            set_openSnackbar(() => true)
        }
    }

    const onChangeTime = (e, index) => {
        let { name, value } = e.target
        let fieldErrorNew = { ...fieldError }
        let question_details = _.cloneDeep(questionListLocal)
        question_details[index]['time'][name] = question_details[index]['time'][name] + ''
        if (name === 'hour' && value <= 59) {
            question_details[index]['time'][name] = value
        }
        if (name === 'minute' && value <= 59) {
            question_details[index]['time'][name] = value
        }
        if (name === 'seconds' && value <= 59) {
            question_details[index]['time'][name] = value
        }
        let seconds = moment.duration(`${question_details[index]['time'].hour}:${question_details[index]['time'].minute}:${question_details[index]['time'].seconds}`).asSeconds();
        if ((numberRegex.value.test(value) || value === '') && (total_seconds - seconds >= 0)) {
            delete fieldErrorNew['time']
            props.handleSeek(seconds)
            set_questionListLocal(() => question_details)
            set_fieldError(() => fieldErrorNew)
        }
        else if (total_seconds - seconds < 0) {
            set_alertData(() => `Maximum video duraction time is ${getTimeFormatFromSeconds(total_seconds, 'HH:mm:ss')}`)
            set_openSnackbar(() => true)
        }
    }

    const handleOnBlur = () => {
        let question_details = _.cloneDeep(questionListLocal)
        question_details.map((data) => {
            data['time'].hour = data['time'].hour ? data['time'].hour : '00'
            data['time'].minute = data['time'].minute ? data['time'].minute : '00'
            data['time'].seconds = data['time'].seconds ? data['time'].seconds : '00'
            data['playedSeconds'] = moment.duration(`${data['time'].hour}:${data['time'].minute}:${data['time'].seconds}`).asSeconds();
        })
        set_focus(() => '')
        props.updateTimeQuestionDetails(question_details)
    }

    const handleCloseSnackBar = () => {
        set_openSnackbar(() => false)
    }

    return (
        <div>
            {questionListLocal.map((temp, index) => {
                return (
                    <Box className='set-question-outer-box p-5px'>
                        <Box className='set-question-box fs-18 font-weight-bold'>
                            {isQuestionEnd ?
                                `Question ${index + 1}`
                                :
                                <Box display='flex' onClick={() => set_focus(() => index)}>
                                    <Box>
                                        {`Question ${index + 1}`}
                                    </Box>
                                    <Box className={focus === index ? 'display-flex ml-5 timing-hover-effect-quiz' : 'timing-hover-effect-quiz1 display-flex ml-5'}>
                                        <Box>
                                            <input
                                                className='creat-video-quiz-input-hour'
                                                autoComplete='off'
                                                maxLength='2'
                                                type="text"
                                                name='hour'
                                                value={temp.time.hour}
                                                onChange={(e) => onChangeTime(e, index)}
                                                onKeyDown={e => handleKeyFunction(e, index, 'hour')}
                                                onBlur={handleOnBlur}
                                            />
                                        </Box>
                                        <Box>
                                            :
                                        </Box>
                                        <Box>
                                            <input
                                                className='creat-video-quiz-input-hour'
                                                autoComplete='off'
                                                maxLength='2'
                                                type="text"
                                                name='minute'
                                                value={temp.time.minute}
                                                onChange={(e) => onChangeTime(e, index)}
                                                onKeyDown={e => handleKeyFunction(e, index, 'minute')}
                                                onBlur={handleOnBlur}
                                            />
                                        </Box>
                                        <Box>
                                            :
                                        </Box>
                                        <Box>
                                            <input
                                                className='creat-video-quiz-input-hour'
                                                autoComplete='off'
                                                maxLength='2'
                                                type="text"
                                                name='seconds'
                                                value={temp.time.seconds}
                                                onChange={(e) => onChangeTime(e, index)}
                                                onKeyDown={e => handleKeyFunction(e, index, 'seconds')}
                                                onBlur={handleOnBlur}
                                            />
                                        </Box>
                                    </Box>
                                </Box>

                            }
                        </Box>
                        <Box className='delete-set-question p-l-5px pr-5px'
                            onClick={() => props.deleteQuestion(index)}>
                            <HighlightOffIcon />
                        </Box>
                    </Box>
                )
            })}
            <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} open={openSnackbar} autoHideDuration={2000} onClose={(e) => handleCloseSnackBar(e)}>
                <Alert onClose={(e) => handleCloseSnackBar(e)} severity={'error'}>
                    {alertData}
                </Alert>
            </Snackbar>
        </div>
    )
}
)

export default VideoQuizQuestionList