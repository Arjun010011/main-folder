import React, { Component } from 'react'
import { Accordion, AccordionDetails, AccordionSummary, Box, Button } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import InfiniteScroll from 'react-infinite-scroller';
import GetAppRoundedIcon from '@material-ui/icons/GetAppRounded';

import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls';
import './styles.scss';

import { makeStyles } from '@material-ui/core/styles';
import StudentsSubjectList from 'Containers/Enrolement/Components/StudentsSubjectsList'
import { Actions } from 'Constants/permissions';
import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import LoadingGif from 'Components/LoadingGif';

const useStyles = makeStyles((theme) => ({
    studentlist: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: theme.palette.background.paper,
    },
}));

export default class AssignSubject extends Component {
    constructor(props) {
        super(props)

        this.state = {
            expanded: {},
            standardList: [],
            limitValue: {},
            innerExpanded: false,
            loading: true
        }
    }

    componentDidMount = () => {
        const { academicYear, getStandardList } = this.props;
        if (getStandardList) {
            this.setState({
                standardList: getStandardList,
                academicYear: academicYear,
            })
        }
        else {
            this.getStandardList(academicYear)
        }
    }


    getStandardList = (year) => {
        const url = GET_URL.getstandard.api
        const params = { academic_year: year, is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    standardList: response.data.data,
                    academicYear: year,
                    loading: false
                })
            }
        })
    }

    getSectionList = (stdIndex, id) => {
        let { standardList, academicYear } = this.state;
        const url = GET_URL.getsection.api
        const params = { academic_year: academicYear, is_active: true, standard: id }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                standardList[stdIndex]['sectionList'] = response.data.data;
                this.setState({
                    standardList,
                    loading: false
                })

            }
        })
    }

    handleChangeCollapse = (name, standardIndex, standardId, sectionIndex, sectionId) => {
        let { expanded } = this.state;
        let value = ''
        if (name === 'standard' && expanded[name] !== standardIndex) {
            value = standardIndex
            this.getSectionList(standardIndex, standardId)
        }
        else if (name === 'section' && expanded[name] !== `${standardIndex}${sectionIndex}`) {
            value = `${standardIndex}${sectionIndex}`
            this.getStudentList(standardIndex, standardId, sectionIndex, sectionId)
        }
        expanded[name] = value
        this.setState({
            expanded
        })
    }

    getStudentList = (standardIndex, standardId, sectionIndex, sectionId, limit) => {
        let { standardList, academicYear, limitValue } = this.state;
        const url = GET_URL.getenrolledstudents.api
        let params = { academic_year: academicYear, is_active: true, standard: standardId, section: sectionId }
        if (limit !== limitValue[`${standardIndex}${sectionIndex}`]) {
            let limit_param = { _limit: limit }
            params = { ...params, ...limit_param }
            limitValue[`${standardIndex}${sectionIndex}`] = limit
        }
        else if (limit) {
            return
        }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                standardList[standardIndex]['sectionList'][sectionIndex]['studentList'] = response.data.data;
                this.setState({
                    standardList,
                    limitValue,
                    loading: false
                })

            }
        })
    }

    classes = () => {
        useStyles()
    }

    handleChangeInnerAccordion = (innerpanel, standardId, sectionId) => (event, isInnerExpanded) => {
        let { innerExpanded, selectedSectionStudents, checked, isSectionStudents } = this.state
        innerExpanded = (isInnerExpanded ? innerpanel : false);
        this.setState({
            innerExpanded: innerExpanded,
        });
    };


    render() {
        let { standardList, expanded, academicYear, loading } = this.state;
        const { isHallTicket, isStudentsSubject } = this.props;
        if (loading) {
            return <LoadingGif />
        }
        else{
        return (
            <div>
                {standardList.map((standard, stdIndex) => {
                    return (
                        <Accordion expanded={expanded.standard === stdIndex} onChange={() => this.handleChangeCollapse('standard', stdIndex, standard.id)}>
                            <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                aria-controls="panel1bh-content"
                                id="panel1bh-header"
                            >
                                {standard.name}

                            </AccordionSummary>
                            <AccordionDetails className='section-paper'>
                                {isHallTicket &&
                                    <Box className='hall-ticket-print-button-outer-box'>
                                        <Button variant='contained' color="secondary"
                                            className='hall-ticket-print-button'
                                            onClick={() => this.props.handleHallTicketDownload('standard', standard.id)}
                                        >
                                            <GetAppRoundedIcon className='hall-ticket-download-icon' />Print for {standard.name}
                                        </Button>
                                    </Box>
                                }
                                {standard.sectionList && standard.sectionList.map((section, secIndex) => {
                                    return (
                                        <Accordion expanded={expanded.section === `${stdIndex}${secIndex}`} onChange={() => this.handleChangeCollapse('section', stdIndex, standard.id, secIndex, section.standard_section)}>
                                            <AccordionSummary
                                                expandIcon={<ExpandMoreIcon />}
                                                aria-controls="panel1bh-content"
                                                id="panel1bh-header"
                                            >
                                                {section.name}
                                            </AccordionSummary>
                                            <AccordionDetails className='student-paper'>
                                                {isHallTicket &&
                                                    <Box className='hall-ticket-print-button-outer-box'>
                                                        <Button variant='contained' color="secondary"
                                                            className='hall-ticket-print-button'
                                                            onClick={() => this.props.handleHallTicketDownload('section', section.standard_section)}
                                                        >
                                                            <GetAppRoundedIcon className='hall-ticket-download-icon' />Print for  {section.name}
                                                        </Button>
                                                    </Box>
                                                }
                                                {section.studentList && isStudentsSubject === false &&
                                                    <InfiniteScroll
                                                        pageStart={0}
                                                        loadMore={() => this.getStudentList(stdIndex, standard.id, secIndex, section.standard_section, section.studentList.length + 10)}
                                                        hasMore={false}
                                                        useWindow={false}
                                                        loader={<div className="loader-infinite-loop" key={0}>Loading ...</div>}
                                                        useWindow={false}
                                                    >
                                                        <table width="100%" className="selectable-row-table">
                                                            <thead>
                                                                <th className={`selectable-table-head`}> Student Name  </th>
                                                                <th className={`selectable-table-head`}> Registration Number </th>
                                                                {isHallTicket &&
                                                                    <th className={`selectable-table-head hall-ticket-print-button-student-outer-box`}> Print Hall Ticket </th>
                                                                }
                                                            </thead>
                                                            <tbody className="selectable-row-table-body">
                                                                {section.studentList.map((student, index) => {
                                                                    return (
                                                                        <tr key={index} className="selectable-row-table-row">
                                                                            <td key={index} className={'textAlign'}>
                                                                                {student.name}
                                                                            </td>
                                                                            <td>
                                                                                {student.current_reg_num}
                                                                            </td>
                                                                            {isHallTicket &&
                                                                                <td>
                                                                                    <Box className='hall-ticket-print-button-student-outer-box'>
                                                                                        <Button variant='contained'
                                                                                            className='hall-ticket-print-student'
                                                                                            onClick={() => this.props.handleHallTicketDownload('student', student.student)}
                                                                                        >
                                                                                            Print
                                                                                </Button>
                                                                                    </Box>
                                                                                </td>
                                                                            }
                                                                        </tr>
                                                                    )
                                                                })
                                                                }
                                                                {section.studentList.length === 0 && (
                                                                    <tr className="text-center font-weight-bold">
                                                                        No Data Found
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </InfiniteScroll>
                                                }
                                                {section.studentList && isStudentsSubject === true &&
                                                    <Box>
                                                        <StudentsSubjectList
                                                            standardList={section.studentList}
                                                            academicYear={academicYear}
                                                            subjectassignurl={Actions.assign_subjects_for_students.create.url}
                                                        />
                                                    </Box>
                                                }

                                            </AccordionDetails>
                                        </Accordion>
                                    )
                                })
                                }
                            </AccordionDetails>
                        </Accordion>
                    )
                            
                })
                }
                {
                    standardList.length === 0 &&
                    <BlankPagewithIcon data={"No data Found for selected Year"} />
                }
            </div>
        )
        }
    }
}