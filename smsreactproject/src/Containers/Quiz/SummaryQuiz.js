import React, { useState, useEffect, useImperativeHandle } from 'react'
import {
    Box, Grid, Paper
} from '@material-ui/core';
import LoadingGif from 'Components/LoadingGif';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls';
import './styles.scss'
import { withRouter } from 'react-router-dom';
import { Actions } from 'Constants/permissions';
import SummaryBasicChart from 'Components/SummaryBasicChart';


const SummaryQuiz = React.forwardRef((props, ref) => {

    const [loadingDetails, set_loadingDetails] = useState(false)
    const [quizDetails, set_quizDetails] = useState(false)
    const [chartDetails, set_chartDetails] = useState({})



    React.useEffect(() => {
        let { quizDetails } = props;
        if (quizDetails.id) {
            getQuestionDetails(quizDetails.id)
        }
        else {
            props.history.push(Actions.set_quiz.view.url)
        }
    }, []);

    const getQuestionDetails = (id) => {
        set_loadingDetails(() => true)
        const url = GET_URL.responsesummary.api + id + '/'
        getRequest(url, {}, props).then(response => {
            if (response && response.status === 200) {
                let points = getPoints(response.data.data.rank_wise_list, 'points')
                let column_series = getPoints(response.data.data.rank_wise_list, 'column_series')
                let chartDetailsTemp = {
                    "categories": points,
                    "series": column_series,
                    "heading": 'Points Chart',
                }
                set_quizDetails(() => response.data.data)
                set_loadingDetails(() => false)
                set_chartDetails(() => chartDetailsTemp)
            }
        })
    }

    const getPoints = (rankList, name) => {
        let pointList = []
        let pointObject = {}
        rankList.map((data) => {
            if (!pointList.includes(data.total_score)) {
                pointList.push(data.total_score)
            }
            if (!pointObject[data.total_score]) {
                pointObject[data.total_score] = []
            }
            pointObject[data.total_score].push(data.total_score)
        })
        let columns = []
        pointList.map((data) => {
            if (data == pointObject[data]) {
                columns.push(pointObject[data].length)
            }
        })
        if (name === 'column_series') {
            let columnTemp = {
                "name": "No. of students got points",
                "data": columns
            }
            pointList = [columnTemp]
        }
        return pointList
    }


    return (
        <Box>
            {loadingDetails ?
                <LoadingGif />
                :
                <Paper className='padding-20'>
                    <Box className='year-std-box'>
                        <Box className="academic-std-head"> Quiz Title</Box>
                        <Box className=" exam-mark-add-heading-bg">{quizDetails.quiz_title}</Box>
                    </Box>
                    {quizDetails.description &&
                        <Box className='year-std-box'>
                            <Box className="academic-std-head"> Description</Box>
                            <Box className=" exam-mark-add-heading-bg">{quizDetails.description}</Box>
                        </Box>
                    }

                    {chartDetails['series'] &&
                        <Grid container >
                            <Grid item md={7} xs={12}>
                                <SummaryBasicChart
                                    chartDetails={chartDetails}
                                />
                            </Grid>
                            <Grid item md={5} xs={5}>
                                <Box className='header-align create-expenses-right-part-paper'>
                                    <Box className='create-expenses-info-outer-box'>
                                        <Box className='expense-add-fuel-review'>
                                            Quiz Overview
                                        </Box>
                                        <Box className='create-expenses-outer-box-label-value'>
                                            <Box className='create-expenses-label'>Total Points</Box>
                                            <Box className='create-expenses-value font-weight-bold'>{quizDetails['total_points']}</Box>
                                        </Box>
                                        <Box className='create-expenses-outer-box-label-value'>
                                            <Box className='create-expenses-label'>Total Questions</Box>
                                            <Box className='create-expenses-value font-weight-bold'>{quizDetails['total_questions']}</Box>
                                        </Box>
                                        <Box className='create-expenses-outer-box-label-value'>
                                            <Box className='create-expenses-label'>Total Students</Box>
                                            <Box className='create-expenses-value font-weight-bold'>{quizDetails['total_students']}</Box>
                                        </Box>
                                        <Box className='create-expenses-outer-box-label-value text-green'>
                                            <Box className='create-expenses-label'>Total Evaluated</Box>
                                            <Box className='create-expenses-value font-weight-bold'>{quizDetails['total_evaluated']}</Box>
                                        </Box>
                                        <Box className='create-expenses-outer-box-label-value text-red'>
                                            <Box className='create-expenses-label'>Pending Evaluation</Box>
                                            <Box className='create-expenses-value font-weight-bold'>{quizDetails['pending_evaluation']}</Box>
                                        </Box>
                                    </Box>
                                </Box>
                            </Grid>
                        </Grid>
                    }
                </Paper>
            }
        </Box >
    )
}
)
export default withRouter(SummaryQuiz)