import React from 'react'
import {
    Paper, Box, Button, Grid, TableContainer, Table, TableHead, TableCell, CircularProgress, TableRow, TableBody, FormControl, NativeSelect,
    Tooltip, TextField,
} from '@material-ui/core';

function ResultTermWiseIndividual(props) {

    const { markDetails, is_mark_result, handleChange, searchStudent, selectedFilter,
        is_announced, currentTab, submitDisable } = props;

    const [part_type, set_part_type] = React.useState({});

    React.useEffect(() => {
        let part_type_temp = {}
        if(markDetails.part_type_list){
            markDetails.part_type_list.map((data) => {
                part_type_temp[data['id']] = { list: [], id: data['id'], name: data['name'] }
            })
        }
            markDetails.subject_list.map((subData) => {
            Object.keys(part_type_temp).map((part_key) => {
                if (subData.subject_part_type_id == part_key && !part_type_temp[part_key].list.includes(subData.subject)) {
                    part_type_temp[part_key].list.push(subData.subject)
                }
            })
        })
        Object.keys(part_type_temp).map((part_key) => {
            if (part_type_temp[part_key].list.length === 0) {
                delete part_type_temp[part_key]
            }
        })
        set_part_type(() => part_type_temp)
    }, [markDetails])

    const getSubjectNameFormat = (part) => {
        return (
            <>
                {markDetails.subject_list.map((data) => {
                    return (part_type[part].list.includes(data.subject) &&
                        <TableCell className='selectable-table-head p-5px text-align-center'>{data.subject__name}</TableCell>
                    )
                })
                }

            </>
        )
    }

    const getCumNameFormat = (part) => {
        return (
            <>
                {markDetails.subject_list.map((data) => {
                    return part_type[part].list.includes(data.subject) && <TableCell className='' style={{ padding: '0px' }}>
                        <TableHead style={{ lineHeight: '0.2rem' }}>
                            <TableRow className=''>
                                <TableCell className=''>{`Max-${data.max_marks} Min-${data.min_marks}`}</TableCell>
                            </TableRow>
                        </TableHead>
                    </TableCell>
                })
                }
            </>
        )
    }

    const getStudentMarks = (student, part) => {
        return (
            <>
                {markDetails.subject_list.map((subject, subIndex) => {
                    return (part_type[part].list.includes(subject.subject) &&
                        <TableCell className='mark-add-table-cell h-37px p-5px' component='th' scope='row'>
                            {Boolean(student.subject_list[subject.id]) &&
                                <Box className='result-view-entered'>
                                    {student.subject_list[subject.id].attendance_status == 'Absent' ?
                                        <Box className='text-red'>Ab</Box> :
                                        student.subject_list[subject.id].marks}
                                </Box>
                            }
                            {!Boolean(student.subject_list[subject.id]) &&
                                <Box className='result-view-entered'>
                                    {`N/A`}
                                </Box>
                            }
                        </TableCell>
                    )
                })}
            </>
        )
    }

    return (
        <>
            <Grid container className='header-align'>
                <Grid item md={2} xs={12}>
                    <TextField
                        id="outlined-name"
                        value={searchStudent}
                        placeholder=""
                        label="Search Student"
                        name='searchStudent'
                        onChange={(e) => { props.handleFilter(e) }}
                    />
                </Grid>
                <Grid item md={3} xs={12}>
                    <Box className='result-section-view-filter-outer-box'>
                        <label onChange={() => props.onChangeFilter('all')}>
                            <input type='radio' value='all' name='selectedFilter'
                                checked={selectedFilter == 'all'}
                                defaultChecked={selectedFilter == 'all'}
                            /> All
                        </label>
                        <label onChange={() => props.onChangeFilter('pass')}>
                            <input type='radio' value='pass' name='selectedFilter'
                                checked={selectedFilter == 'pass'}
                                defaultChecked={selectedFilter == 'pass'}
                            /> Passed
                        </label>

                        <label onChange={() => props.onChangeFilter('fail')}>
                            <input type='radio' value='fail' name='selectedFilter'
                                checked={selectedFilter == 'fail'}
                                defaultChecked={selectedFilter == 'fail'}
                            /> Failed
                        </label>
                    </Box>
                </Grid>
                {!is_mark_result && !is_announced && currentTab !== 'examConfig' &&
                    <Grid item md={2} xs={12} className='flex-justify-center margin-top-10'>
                        <Tooltip title={!is_mark_result ? 'Update Pass/Fail' : 'View Pass/Fail'} enterDelay={400}
                            enterNextDelay={400} placement='top-start'
                            classes={{ tooltip: 'tooltip-show-data' }}>
                            <Button
                                className={is_mark_result ? 'exam-mark-absent-button' : 'exam-enter-marks-button'}
                                onClick={() => props.handleMarkPassOrFail()}
                            >
                                <Box>Update Result</Box>
                            </Button>
                        </Tooltip>
                    </Grid>
                }
                {is_mark_result && !is_announced &&
                    <Grid item md={2} xs={12} className='flex-justify-center margin-top-10'>
                        <Button
                            className={is_mark_result ? 'exam-mark-absent-button' : 'exam-enter-marks-button'}
                            onClick={() => props.handleMarkPassOrFail()}
                        >
                            <Box>Cancel</Box>
                        </Button>
                    </Grid>
                }
                <Grid item md={3} xs={12}>
                    {!is_announced && !is_mark_result &&
                        <Button
                            className='submit margin-left-right-20'
                            variant="contained"
                            style={{ 'float': 'right' }}
                            disabled={submitDisable}
                            onClick={(e) => props.submitAndFinalize()}>
                            Announce Result
                        </Button>
                    }
                    {is_announced &&
                        <Button
                            className='cancel-request margin-left-right-20'
                            variant="contained"
                            style={{ 'float': 'right' }}
                            disabled={true}
                        >
                            Result Announced
                        </Button>
                    }
                </Grid>
            </Grid>
            <Box display='flex'>
                <TableContainer className='result-view-bg header-align '>
                    <Table size='small' aria-label='simple table' className='exam-mark-row-table'>
                        <TableHead>
                            {Object.keys(part_type).length>1 &&
                                Object.keys(part_type).map((part_key) => {
                                    return (<>
                                        {part_type[part_key].list.length > 0 &&
                                            <TableRow className=''>
                                                <TableCell className='part-type-table-head'></TableCell>
                                                <TableCell className='part-type-table-head text-align-center' >{part_type[part_key]['name']}</TableCell>
                                                <TableCell className='part-type-table-head' colSpan={part_type[part_key].list.length - 1}></TableCell>
                                                <TableCell className='part-type-table-head' ></TableCell>
                                            </TableRow>
                                        }
                                    </>
                                    )
                                })
                            }
                            <TableRow className=''>
                                <TableCell className='selectable-table-head'>Student</TableCell>
                                {
                                    Object.keys(part_type).map((part_key) => {
                                        return getSubjectNameFormat(part_key)
                                    })
                                }
                            </TableRow>
                        </TableHead>
                        <TableHead >
                            <TableRow className=''>
                                <TableCell className=''></TableCell>
                                {
                                    Object.keys(part_type).map((part_key) => {
                                        return getCumNameFormat(part_key)
                                    })
                                }
                            </TableRow>
                        </TableHead>
                        <TableBody className='selectable-row-table-body'>
                            {markDetails.student_list.map((student, stIndex) => {
                                return (
                                    <TableRow className='selectable-row-table-row'>
                                        <TableCell className='mark-add-table-cell h-37px p-5px result-view-student-name' component='th' scope='row'>
                                            {student.student_name}
                                        </TableCell>
                                        {
                                            Object.keys(part_type).map((part_key) => {
                                                return getStudentMarks(student,part_key)
                                            })
                                        }
                                    </TableRow>
                                )
                            })}
                            {
                                markDetails.student_list.length === 0 && (
                                    <tr className="text-center font-weight-bold">
                                        No Data Found
                                    </tr>
                                )
                            }
                        </TableBody>
                    </Table>
                </TableContainer>
                <TableContainer className='result-view-bg header-align '>
                    <Table size='small' aria-label='simple table' className='exam-mark-row-table'>
                        <TableHead>
                            {Object.keys(part_type).length>1 &&
                                <TableRow className=''>
                                    <TableCell className=''>{`--`}</TableCell>
                                    <TableCell className='part-type-table-head'></TableCell>
                                    <TableCell className='part-type-table-head'></TableCell>
                                    <TableCell className='part-type-table-head'></TableCell>
                                    <TableCell className='part-type-table-head'></TableCell>
                                </TableRow>
                            }
                            <TableRow className=''>
                                <TableCell></TableCell>
                                <TableCell className='selectable-table-head p-5px text-align-center'>Total Marks</TableCell>
                                <TableCell className='selectable-table-head p-5px text-align-center'>Obtained Marks</TableCell>
                                <TableCell className='selectable-table-head p-5px text-align-center'>Result</TableCell>
                                <TableCell className='selectable-table-head p-5px text-align-center'>Grade</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableHead >
                            <TableRow className=''>
                                <TableCell></TableCell>
                                <TableCell className='h-37px p-5px'></TableCell>
                                <TableCell className='h-37px p-5px'></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody className='selectable-row-table-body'>
                            {markDetails.student_list.map((student, stIndex) => {
                                return (
                                    <TableRow className='selectable-row-table-row'>
                                        <TableCell className='mark-add-table-cell h-37px p-5px'></TableCell>
                                        <TableCell className='mark-add-table-cell h-37px p-5px' component='th' scope='row'>
                                            <Box className='marks-view-entered'>
                                                {student.total_marks}
                                            </Box>
                                        </TableCell>
                                        <TableCell className='mark-add-table-cell h-37px p-5px' component='th' scope='row'>
                                            <Box className='marks-view-entered'>
                                                {student.obtained_marks}
                                            </Box>
                                        </TableCell>
                                        <TableCell className='mark-add-table-cell h-37px p-5px' component='th' scope='row'>
                                            {!is_mark_result &&
                                                <Box className={student.total_result == 'pass' ? 'marks-view-entered result-pass-text' : 'result-fail-text marks-view-entered'}>
                                                    {student.total_result}
                                                </Box>
                                            }
                                            {is_mark_result &&
                                                <Box>
                                                    <FormControl className=''>
                                                        <NativeSelect
                                                            value={student.total_result}
                                                            onChange={(e) => handleChange(e, stIndex)}
                                                            name="total_result"
                                                            className=''
                                                            inputProps={{ 'aria-label': 'age' }}
                                                        >
                                                            <option value='pass'>Pass</option>
                                                            <option value='fail'>Fail</option>
                                                        </NativeSelect>
                                                    </FormControl>
                                                </Box>
                                            }
                                        </TableCell>
                                        <TableCell className='mark-add-table-cell h-37px p-5px' component='th' scope='row'>
                                            <Box style={{ color: '#4680FF', fontWeight: 'bolder', fontSize: '15px', textAlign: 'center' }}>
                                                {student.grade}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </>
    )
}

export default ResultTermWiseIndividual
