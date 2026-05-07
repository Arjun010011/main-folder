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
import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import SummarySplineChart from './components/SummarySplineChartFeedBackForm';


const chartDetailsTemp = {
    monthList: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    pointList: [7.0, 6.9, 9.5, 14.5, 18.2, 21.5, 25.2, {
        y: 26.5,
        marker: {
            symbol: 'url(https://www.highcharts.com/samples/graphics/sun.png)'
        }
    }, 23.3, 18.3, 13.9, 9.6],
}

const SummaryFeedBackForm = React.forwardRef((props, ref) => {

    const { year } = props;

    const [loadingDetails, set_loadingDetails] = useState(false)
    const [quizDetails, set_quizDetails] = useState(false);
    const [isErrorFound, set_isErrorFound] = useState(false);
    const [errorMessage, set_errorMessage] = useState('');
    const [chartDetails, set_chartDetails] = useState(null)



    React.useEffect(() => {
        getSummaryDetails()
    }, []);

    const getSummaryDetails = () => {
        set_loadingDetails(() => true)
        const url = GET_URL.feedbackformresponsesummary.api
        const param = { academic_year: year }
        let prop_local = { ...props };
        prop_local['return_error_message'] = true
        getRequest(url, param, prop_local).then(response => {
            if (response && response.status === 200) {
                set_quizDetails(() => response.data.data)
                getChartDetails(response.data.data)
            }
            else {
                set_errorMessage(() => response)
                set_isErrorFound(() => true)
                set_loadingDetails(() => false)
            }
        })
    }

    const getChartDetails = (quizResponse) => {
        quizResponse['percentage_list'] = quizResponse['percentage_list'].map(ele => parseFloat(ele.toFixed(1)));
        let chartDetail = {
            monthList: quizResponse['month_list'],
            pointList: quizResponse['percentage_list'],
        }
        set_chartDetails(() => chartDetail)
        set_loadingDetails(() => false)
    }


    return (
        <Box>
            {loadingDetails ?
                <LoadingGif />
                :
                !isErrorFound ?
                    <Paper className='padding-15'>
                        {quizDetails.description &&
                            <Box className='year-std-box'>
                                <Box className="academic-std-head"> Description</Box>
                                <Box className=" exam-mark-add-heading-bg">{quizDetails.description}</Box>
                            </Box>
                        }
                        <Grid container>
                            <Grid item md={8} xs={12}>
                                {chartDetails &&
                                    <SummarySplineChart
                                        chartDetails={chartDetails}
                                    />
                                }
                            </Grid>
                            <Grid item md={4} xs={5}>
                                <Box className='header-align create-expenses-right-part-paper'>
                                    <Box className='create-expenses-info-outer-box'>
                                        <Box className='expense-add-fuel-review'>
                                            Student Overview
                                        </Box>
                                        <Box className='create-expenses-outer-box-label-value'>
                                            <Box className='create-expenses-label'>Standard Rank</Box>
                                            <Box className='create-expenses-value font-weight-bold text-green'>{quizDetails['student_standard_rank']}</Box>
                                        </Box>
                                        <Box className='create-expenses-outer-box-label-value'>
                                            <Box className='create-expenses-label'>Section Rank</Box>
                                            <Box className='create-expenses-value font-weight-bold text-green'>{quizDetails['student_section_rank']}</Box>
                                        </Box>
                                        <Box className='create-expenses-outer-box-label-value'>
                                            <Box className='create-expenses-label'>Total Quiz</Box>
                                            <Box className='create-expenses-value font-weight-bold'>{quizDetails['total_quiz']}</Box>
                                        </Box>
                                        <Box className='create-expenses-outer-box-label-value'>
                                            <Box className='create-expenses-label'>Total Points Scored</Box>
                                            <Box className='create-expenses-value font-weight-bold'>{`${quizDetails['total_points_earned']} / ${quizDetails['total_points_conducted_for']}`}</Box>
                                        </Box>
                                        <Box className='create-expenses-outer-box-label-value '>
                                            <Box className='create-expenses-label '>Total Attended</Box>
                                            <Box className='create-expenses-value font-weight-bold text-green'>{quizDetails['total_attended_quiz']}</Box>
                                        </Box>
                                        <Box className='create-expenses-outer-box-label-value '>
                                            <Box className='create-expenses-label'>Missed Quiz</Box>
                                            <Box className='create-expenses-value font-weight-bold text-red'>{quizDetails['missed_quizes']}</Box>
                                        </Box>
                                        <Box className='create-expenses-outer-box-label-value'>
                                            <Box className='create-expenses-label'>Need To Attend Quiz</Box>
                                            <Box className='create-expenses-value font-weight-bold text-red'>{quizDetails['need_to_attend_quiz']}</Box>
                                        </Box>
                                    </Box>
                                </Box>
                            </Grid>
                        </Grid>

                    </Paper>
                    :
                    <Box>
                        <BlankPagewithIcon data={errorMessage} />
                    </Box>
            }
        </Box >
    )
}
)
export default withRouter(SummaryFeedBackForm)