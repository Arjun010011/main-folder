/* eslint-disable react/display-name */
import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Button, Box } from '@material-ui/core';
import Dialog from '@material-ui/core/Dialog';
import Slide from '@material-ui/core/Slide';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import CloseIcon from '@material-ui/icons/Close';
import Tooltip from "@material-ui/core/Tooltip";
import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import { dateFormat } from 'Includes/functions';

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

const AssignStaffItemIssue = forwardRef((props, ref) => {

    const classes = useStyles();
    useImperativeHandle(
        ref,
        () => ({
            openModal(index, areaName) {
                setOpen(true);
                setAreaName(areaName);
                setAreaIndex(index);
            }
        }),
    )

    const [open, setOpen] = React.useState(false);
    const [areaName, setAreaName] = React.useState('');
    const [areaIndex, setAreaIndex] = React.useState(0);
    const [options, setOptions] = React.useState();
    const [selectedStaffs, setselectedStaffs] = React.useState([]);

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
            name: 'full_name',
            label: 'Staff Name',
            options: {
                filter: true,
                sort: true,
            }
        },
        {
            name: "group_name",
            label: "groups",
            options: {
                filter: true,
                sort: true,
                display: true,
                customBodyRender: (value, tableMeta, updateValue) => {
                    return (
                        <Box>
                            {value && value[0]}
                        </Box>
                    )
                }
            }
        },
        {
            name: "email",
            label: "Email",
            options: {
                filter: false,
                sort: true,
                customBodyRender: (value, tableMeta, updateValue) => {
                    return (<div className='mui-table-custom-value-left-align text-transform-none'>
                        {value}
                    </div>)

                }
            }
        },
        {
            name: "mobile_num",
            label: "Mobile No",
            options: {
                filter: false,
                sort: true,
            }
        },
        {
            name: "dob",
            label: "DOB",
            options: {
                filter: true,
                sort: true,
                customBodyRender: (value, tableMeta, updateValue) => {
                    return dateFormat(value, 'DD-MM-YYYY')
                },
            }
        },
    ]);

    const handleClose = () => {
        setOpen(false);
    };

    const saveData = () => {
        props.addDataToList(selectedStaffs);
        handleClose();
    };


    const setOptionsForTable = () => {
        let newOptions = { ...options }
        newOptions['selectableRows'] = 'multiple'
        newOptions['customToolbarSelect'] = () => {
            return <div className={"custom-toolbar-select-feature"}>
                <Tooltip title={"icon 2"}>
                    <IconButton >
                    </IconButton>
                </Tooltip>
            </div>
        }
        newOptions['onRowsClick'] = (data) => {
        }
        newOptions['onTableChange'] = (action, tableState) => {
            let selectedStaffs = [];
            tableState.selectedRows.data.map((row) => {
                selectedStaffs.push(props.staffList[row['dataIndex']]);
            })
            setselectedStaffs(selectedStaffs);
        }
        newOptions['download'] = false;
        newOptions['print'] = false;
        newOptions['viewColumns'] = false;
        newOptions['filter'] = false;
        setOptions(newOptions);
    }

    const intialize = () => {
        setselectedStaffs([]);
    }

    const descriptionElementRef = React.useRef(null);
    React.useEffect(() => {
        if (open) {
            const { current: descriptionElement } = descriptionElementRef;
            if (descriptionElement !== null) {
                descriptionElement.focus();
            }
        }
        setOptionsForTable();
        intialize();
    }, [open]);

    return (
        <div>
            <Dialog fullScreen open={open} onClose={handleClose} >
                <AppBar className={classes.appBar} style={{ position: 'fixed' }}>
                    <Toolbar>
                        <IconButton edge="start" color="inherit" onClick={handleClose} aria-label="close">
                            <CloseIcon />
                        </IconButton>
                        <Typography variant="h6" className={classes.title}>
                            Select Staff
                        </Typography>
                        <Button autoFocus color="inherit" onClick={saveData}>
                            save
                        </Button>
                    </Toolbar>
                </AppBar>
                <Box className='student-route-table-popup'>
                    {props.staffList.length > 0 ?
                        <AllMUIDataTable
                            key={props.staffList}
                            data={props.staffList}
                            columns={columns}
                            options={options}
                        />
                        :
                        <BlankPagewithIcon data="No Staff found" />
                    }
                </Box>
            </Dialog>
        </div>
    );
});

export default AssignStaffItemIssue
