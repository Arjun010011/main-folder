import React, { Component } from 'react'
import { Paper, Box, Grid, Button } from '@material-ui/core';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { withRouter, Link } from 'react-router-dom';

import CreateQuestionQuiz from 'Containers/Quiz/components/CreateQuestionQuiz'
import CreateQuestionVideoQuiz from 'Containers/Quiz/components/CreateQuestionVideoQuiz'
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';
import loadingBar from 'images/loading.gif';
import ResponsesList from 'Containers/Quiz/ResponsesList';
import { getUrlParam } from 'Includes/functions';
import LoadingGif from 'Components/LoadingGif';

import './styles.scss';
import SummaryQuiz from './SummaryQuiz';

class SetQuiz extends Component {
    constructor(props) {
        super(props);
        this.state = {
            currentTab: 'quizForm',
            loading: true,
            blank: false,
            errorContent: '',
            year_name: '',
            standard_name: '',
            isEdit: false,
            quizDetails: null,
            is_finalized: false,
            is_video: false
        }
    }


    componentDidMount() {
        let { year_name, year, start_date, end_date, standard_name, current_standard, currentTab, is_video } = getUrlParam()
        if (year_name && year && start_date && end_date ) {
            if (this.props.location.pathname === Actions.set_quiz.update.url) {
                if (this.props.location.state && this.props.location.state.detail) {
                    this.getQuizDetails(this.props.location.state.detail);
                }
                else {
                    this.props.history.push(Actions.set_quiz.view.url);
                }
            }
            else {
                this.setState({
                    loading: false,
                    quizDetails: {}
                })
            }
            this.setState({
                year_name,
                year,
                start_date,
                end_date,
                standard_name,
                current_standard: current_standard ? current_standard : this.state.current_standard,
                currentTab: currentTab ? currentTab : this.state.currentTab,
                is_video
            })
        }
        else {
            this.props.history.push(Actions.set_quiz.view.url);
        }
    }

    getQuizDetails = (id) => {
        const url = GET_URL.forms.api + id + '/'
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    quizDetails: response.data.data,
                    is_finalized: response.data.data.is_finalized,
                    currentTab: this.returnCurrentTab(response.data.data),
                    loading: false,
                    isEdit: true
                })
            }
        })
    }

    returnCurrentTab = (quizDetails) => {
        let returnValue = this.state.currentTab
        if (this.state.currentTab !== 'isResponse' && quizDetails['is_finalized']) {
            returnValue = 'summaryForm'
        }
        return returnValue
    }

    changeTab = (name) => {
        this.setState({
            currentTab: name
        })
    }

    goToViewPage = () => {
        const { current_standard, year } = this.state;
        let Information = {
            'current_standard': current_standard,
            'year': year,
        }
        let searchParam = "?" + new URLSearchParams(Information).toString()
        this.props.history.push({
            pathname: Actions.set_quiz.view.url,
            search: searchParam,
        });
    }

    render() {
        const {
            currentTab, year_name, loading, is_finalized, is_video, standard_name, current_standard, year,
            end_date, isEdit, quizDetails } = this.state;
        if (loading) {
            return <LoadingGif />
        }
        else {
            return (
                <>
                    <Box className={!loading ? 'display-none' : ''} display='flex'>
                        <img src={loadingBar} className='loading' alt='loading' />
                    </Box>
                    <Paper className={loading ? 'display-none' : 'min-height-100vh leave-management-paper-background-color'}>
                        <Grid container>
                            <Grid item md={5} xs={12} className='display-flex'>
                                {is_finalized &&
                                    <Box
                                        className={currentTab === 'summaryForm' ? 'leave-management-selected-heading' : 'leave-management-heading'}
                                        onClick={() => this.changeTab('summaryForm')}>
                                        Summary Quiz
                                        {currentTab === 'summaryForm' &&
                                            <Box className='leave-management-selected-heading-underline' />
                                        }
                                    </Box>
                                }

                                <Box
                                    className={currentTab === 'quizForm' ? 'leave-management-selected-heading' : 'leave-management-heading'}
                                    onClick={() => this.changeTab('quizForm')}>
                                    Quiz Form
                                    {currentTab === 'quizForm' &&
                                        <Box className='leave-management-selected-heading-underline' />
                                    }
                                </Box>
                                {quizDetails && is_finalized && quizDetails['access'] && quizDetails['access']['evaluate'] &&
                                    <Box
                                        className={currentTab === 'isResponse' ? 'leave-management-selected-heading' : 'leave-management-heading'}
                                        onClick={() => this.changeTab('isResponse')}
                                    >
                                        Responses
                                        {currentTab === 'isResponse' &&
                                            <Box className='leave-management-selected-heading-underline' />
                                        }
                                    </Box>
                                }
                            </Grid>
                            <Grid item md={5} xs={12}>
                                <Box className="year-std-box">
                                    <Box className="academic-std-head fs-18">Academic Year</Box>
                                    <Box className=" exam-mark-add-heading-bg fs-18">{year_name}</Box>
                                    <Box className="academic-std-head fs-18">Standard</Box>
                                    <Box className=" exam-mark-add-heading-bg fs-18">{standard_name}</Box>
                                </Box>
                            </Grid>
                            <Grid item lg={2} md={2} xs={12} >
                                <Box className={'end-flex-prop'}>
                                    <Button
                                        variant="contained"
                                        onClick={() => this.goToViewPage()}
                                        className='editbutton-view'
                                    ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.set_quiz.view.label}</Button>
                                </Box>
                            </Grid>
                        </Grid>
                        <hr style={{ marginTop: '-4px' }} />
                        <Paper>
                            <Grid container>
                                <Grid item md={3}>


                                </Grid>
                            </Grid>
                        </Paper>
                        <Box className=''>
                            <Box className='leave-height-100-percent'>
                                {
                                    currentTab === 'summaryForm' && quizDetails &&
                                    <SummaryQuiz
                                        quizDetails={quizDetails}
                                    />
                                }
                                {
                                    (currentTab === 'quizForm' && quizDetails) &&
                                    ((is_video === 'true' && !is_finalized)?
                                        <CreateQuestionVideoQuiz
                                            current_standard={current_standard}
                                            year={year}
                                            end_date={end_date}
                                            isEdit={isEdit}
                                            quizDetails={quizDetails}
                                            standard_name={standard_name}
                                            goToViewPage={this.goToViewPage}
                                        />
                                        :
                                        <CreateQuestionQuiz
                                            current_standard={current_standard}
                                            year={year}
                                            end_date={end_date}
                                            isEdit={isEdit}
                                            quizDetails={quizDetails}
                                            standard_name={standard_name}
                                        />
                                    )
                                }
                                {
                                    currentTab === 'isResponse' && quizDetails &&
                                    <ResponsesList
                                        current_standard={current_standard}
                                        year={year}
                                        end_date={end_date}
                                        isEdit={isEdit}
                                        quizDetails={quizDetails}
                                        standard_name={standard_name}
                                    />
                                }
                            </Box>
                        </Box>

                    </Paper>
                </>
            )
        }
    }
}


export default withRouter(SetQuiz)