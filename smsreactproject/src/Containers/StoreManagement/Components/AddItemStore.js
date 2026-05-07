import React, { useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Button, Box, Dialog, Slide, Grid, AppBar, Toolbar, Typography, IconButton, CircularProgress, DialogContent, DialogContentText, DialogTitle, } from '@material-ui/core';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import CloseIcon from '@material-ui/icons/Close';
import Tooltip from "@material-ui/core/Tooltip";
import { MuiPickersUtilsProvider, KeyboardDateTimePicker, KeyboardTimePicker } from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import Snackbar from '@material-ui/core/Snackbar';
import Swal from 'sweetalert2'
import _ from 'lodash';

import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import loadingBar from 'images/loading.gif'
import { checkLocalAcademicYear, Alert, SetAcademicYear, getPaginationProps, validateDate, dateFormat } from 'Includes/functions';
import { GET_URL, POST_URL } from 'Includes/urls';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { TrendingUpTwoTone } from '@material-ui/icons';
import { DEFAULT_PAGINATION_PROPS, maxDate, minDate } from 'Constants';

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

    const [open, setOpen] = React.useState(false);
    const [itemList, setItemList] = React.useState(null);
    const [pagination, setPagination] = React.useState(DEFAULT_PAGINATION_PROPS);
    const [blankData, setBlankData] = React.useState('Select start date');
    const [tableUpdating, setTableUpdating] = React.useState(false);
    const [openSnackBar, setOpenSnackBar] = React.useState(false);
    const [errorContent, setErrorContent] = React.useState('');
    const [pageLoading, setPageLoading] = React.useState(true);

    const [columns, setColumn] = React.useState([
        {
            name: "id",
            label: "id",
            options: {
                filter: false,
                sort: false,
                display: false,
            },
        },
        {
            name: 'name',
            label: 'Name',
            options: {
                filter: true,
                sort: true,
            }
        },
        {
            name: "code",
            label: "Code",
            options: {
                filter: false,
                sort: true,
                display: true
            }
        },
        {
            name: 'id',
            label: 'Actions',
            options: {
                filter: true,
                sort: true,
                customBodyRender: (value, tableMeta, updateValue) => {
                    return (<div>
                        <Button
                            className='add-modify-button'
                            onClick={e => setID(tableMeta.rowData[0], tableMeta.rowData[1], tableMeta.rowData[2])}
                        > Add Item
                        </Button>
                    </div>
                    );
                }
            }
        }

    ]);


    const classes = useStyles();
    useImperativeHandle(
        ref,
        () => ({
            openModal() {
                getItemList()
                setOpen(true);
            }
        }),
    )

    const setID = (id, name, code) => {
        props.selectedItem(id, name, code)
        setOpen(false);
    }

    const handleClose = () => {
        setOpen(false);
    };


    const getItemList = (paginationProps) => {
        setTableUpdating(true)
        let currentPagination = pagination;
        if (paginationProps) {
            currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(currentPagination);
        let params = {
            ...pagination_params, is_active: true, pagination: true
        }
        const url = GET_URL.item.api
        getRequest(url, params, props).then(response => {
            if (response && response.status === 200) {
                setItemList(response.data.data)
                setPagination(currentPagination)
                setTableUpdating(false)
                setPageLoading(false)
                if (response.data.data.length === 0) {
                    setBlankData('There is no staffs')
                    setItemList(null)
                }
            }
        })
    }

    const options = {
        selectableRows: "none",
        filterType: "dropdown",
        responsive: "simple",
        filter: false,
        download: false,
        print: false,
        viewColumns: false,
        rowsPerPageOptions: [5, 10, 25, 50, 100],
    };

    const handleCloseSnackBar = () => {
        setOpenSnackBar(false)
    }

    return (
        <div>
            <Dialog fullScreen open={open} onClose={handleClose} >
                <AppBar className={classes.appBar} style={{ position: 'fixed' }}>
                    <Toolbar>
                        <IconButton edge="start" color="inherit" onClick={handleClose} aria-label="close">
                            <CloseIcon />
                        </IconButton>
                        <Typography variant="h6" className={classes.title}>
                            Add Item
                        </Typography>
                    </Toolbar>
                </AppBar>
                <Box className='student-route-table-popup margin-top'>
                    {pageLoading &&
                        <Box display='flex'>
                            <img src={loadingBar} className='loading' alt='loading' />
                        </Box>
                    }
                    {itemList !== null &&
                        <Grid container>
                            <Grid item md={6} xs={12}>
                                <Box className='header-align'>
                                    <AllMUIDataTable
                                        key={itemList.data_list}
                                        data={itemList.data_list}
                                        columns={columns}
                                        options={options}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                        onTableChange={getItemList}
                                        serverSide={true}
                                        pagination={pagination}
                                        count={itemList.count}
                                    />
                                </Box>
                            </Grid>
                        </Grid>
                    }
                    {!pageLoading && itemList === null &&
                        <BlankPagewithIcon data={blankData} />
                    }
                </Box>
                <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={openSnackBar} autoHideDuration={2000} onClose={handleCloseSnackBar}>
                    <Alert onClose={handleCloseSnackBar} severity="error">
                        {errorContent}
                    </Alert>
                </Snackbar>
            </Dialog>
        </div >
    );
});


export default AddItemStore
