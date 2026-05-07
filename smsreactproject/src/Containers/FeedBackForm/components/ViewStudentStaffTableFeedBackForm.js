import React, { useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {
    Button, Box, Dialog, Slide, Grid, DialogActions, TableContainer, Table, TableHead, TableCell,
    CircularProgress, TableRow, TableBody, DialogContent, TextField, DialogTitle,
} from '@material-ui/core';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import CloseIcon from '@material-ui/icons/Close';
import Swal from 'sweetalert2'
import _ from 'lodash';
import { getFullName } from 'Includes/functions';


const { forwardRef, useRef, useImperativeHandle } = React;


const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const useStyles = makeStyles((theme) => ({
    appBar: {
        position: 'relative',
        backgroundColor: '#4680FF'
    },
    title: {
        marginLeft: theme.spacing(2),
        flex: 1,
    },
}));


const AddItemStore = forwardRef((props, ref) => {

    const { openDialog, user, review_details, student_list, staff_list } = props;

    const [data_list, set_data_list] = React.useState([])
    const [all_data_list, set_all_data_list] = React.useState([])
    const [searchStudent, set_searchStudent] = React.useState('')

    useImperativeHandle(ref, () => ({
        updateDataList(selectedUser) {
            let data_list = []
            let temp = {}
            if (selectedUser === 'student') {
                let studentList = review_details && review_details.student_list ? review_details.student_list : student_list
                studentList.map((data) => {
                    temp = {}
                    temp['full_name'] = getFullName(data['student_first_name'], data['student_middle_name'], data['student_last_name'])
                    temp['student'] = data['student']
                    temp['section_name'] = data['section_details'] ? data['section_details']['standard_section__section__name'] : ''
                    data_list.push(temp)
                })
            }
            else {
                let staffList = review_details && review_details.staff_list ? review_details.staff_list : staff_list
                staffList.map((data) => {
                    temp = {}
                    temp['full_name'] = getFullName(data['staff_first_name'], data['staff_middle_name'], data['staff_last_name'])
                    temp['staff'] = data['staff']
                    temp['view'] = data['view']
                    temp['update'] = data['update']
                    temp['evaluate'] = data['evaluate']
                    data_list.push(temp)
                })
            }
            set_data_list(() => data_list)
            set_all_data_list(() => data_list)
        }
    }));

    const handleFilter = (e) => {
        let { value, filterList } = e.target;
        let data_list_temp = [...data_list]
        if (value !== '') {
            let lowerCasedFilter = value.toLowerCase().replace(/\s+/g, "");
            filterList = all_data_list.filter(item => {
                return Object.keys(item).some(key =>
                    typeof (item[key]) === "string" && item[key].toLowerCase().replace(/\s+/g, "").includes(lowerCasedFilter)
                );
            });
            data_list_temp = filterList
        }
        else {
            data_list_temp = [...all_data_list]
            filterList = []
        }
        set_data_list(() => data_list_temp)
        set_searchStudent(() => value)
    }

    return (
        < div >
            <Dialog open={openDialog}
                className='action-general-detail-width'
                onClose={props.handleViewDialogClose} aria-labelledby="form-dialog-title">
                <DialogTitle id="form-dialog-title"></DialogTitle>
                <DialogContent>
                    <Box className='end-flex-prop'>
                        <TextField
                            id="outlined-name"
                            value={searchStudent}
                            className='text-captilize'
                            placeholder=""
                            label={`Search ${user}`}
                            name='searchStudent'
                            onChange={(e) => { handleFilter(e) }}
                        />
                    </Box>
                    {user === 'student' ?
                        <TableContainer className='mark-enter-bg header-align '>
                            <Table size='small' aria-label='simple table' className='exam-mark-row-table'>
                                <TableHead>
                                    <TableRow className=''>
                                        <TableCell className='selectable-table-head text-align-center'>Student</TableCell>
                                        <TableCell className='selectable-table-head text-align-center'>Section</TableCell>
                                    </TableRow>
                                </TableHead>

                                <TableBody className='selectable-row-table-body'>
                                    {data_list.map((data) => {
                                        return (
                                            <TableRow className='selectable-row-table-row'>
                                                <TableCell className='mark-add-table-cell' component='th' scope='row'>
                                                    {data.full_name}
                                                </TableCell>
                                                <TableCell className='mark-add-table-cell' component='th' scope='row'>
                                                    {data.section_name}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                    {
                                        data_list.length === 0 && (
                                            <tr className="text-center font-weight-bold">
                                                No Data Found
                                            </tr>
                                        )
                                    }
                                </TableBody>
                            </Table>
                        </TableContainer>
                        :
                        <TableContainer className='mark-enter-bg height-set-table-quiz header-align '>
                            <Table size='small' aria-label='simple table' className='exam-mark-row-table'>
                                <TableHead>
                                    <TableRow className=''>
                                        <TableCell className='selectable-table-head text-align-center'>Staff</TableCell>
                                        <TableCell className='selectable-table-head text-align-center'>View</TableCell>
                                        <TableCell className='selectable-table-head text-align-center'>Update</TableCell>
                                        <TableCell className='selectable-table-head text-align-center'>Evaluate</TableCell>
                                    </TableRow>
                                </TableHead>

                                <TableBody className='selectable-row-table-body'>
                                    {data_list.map((data) => {
                                        return (
                                            <TableRow className='selectable-row-table-row'>
                                                <TableCell className='mark-add-table-cell' component='th' scope='row'>
                                                    {data.full_name}
                                                </TableCell>
                                                <TableCell className='mark-add-table-cell' component='th' scope='row'>
                                                    {data.view ?
                                                        <Box color='#18A453'>
                                                            Yes
                                                        </Box>
                                                        :
                                                        <Box color='#FF0000'>
                                                            No
                                                        </Box>
                                                    }
                                                </TableCell>
                                                <TableCell className='mark-add-table-cell' component='th' scope='row'>
                                                    {data.update ?
                                                        <Box color='#18A453'>
                                                            Yes
                                                        </Box>
                                                        :
                                                        <Box color='#FF0000'>
                                                            No
                                                        </Box>
                                                    }
                                                </TableCell>
                                                <TableCell className='mark-add-table-cell' component='th' scope='row'>
                                                    {data.evaluate ?
                                                        <Box color='#18A453'>
                                                            Yes
                                                        </Box>
                                                        :
                                                        <Box color='#FF0000'>
                                                            No
                                                        </Box>
                                                    }
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                    {
                                        data_list.length === 0 && (
                                            <tr className="text-center font-weight-bold">
                                                No Data Found
                                            </tr>
                                        )
                                    }
                                </TableBody>
                            </Table>
                        </TableContainer>
                    }
                </DialogContent>
                <DialogActions>
                    <Button
                        autoFocus
                        onClick={props.handleViewDialogClose}
                        color="primary"
                    >
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>
        </div >
    );
});


export default AddItemStore
