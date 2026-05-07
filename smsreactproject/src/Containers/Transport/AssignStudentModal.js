/* eslint-disable react/display-name */
import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {Button,Box} from '@material-ui/core';
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
import {getFullName} from 'Includes/functions';

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

const AssignStudentModal = forwardRef((props, ref) => {

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
    const [selectedStudents, setselectedStudents] = React.useState([]);
    
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
            name: 'Serial Number',
            label: 'Sl NO',
            options: {
                filter: false,
                sort: false,
                search: false,
                customBodyRender: (value, tableMeta) => {
                    return (
                        tableMeta.rowIndex + 1
                    )
                }
            }
        },
        {
            name: 'name',
            label: 'Student Name',
            options: {
                filter: true,
                sort: true,
                customBodyRender: (value, tableMeta) => {
                    return getFullName(tableMeta.rowData[7], tableMeta.rowData[8], tableMeta.rowData[9])
                }
            }
        },
        {
            name: 'email',
            label: 'Email',
            options: {
                filter: true,
                sort: true,
            }
        },
        {
            name: 'standard',
            label: 'Standard',
            options: {
                filter: true,
                sort: true,
            }
        },
        {
            name: 'mobile_num',
            label: 'Mobile Number',
            options: {
                filter: true,
                sort: true,
            }
        },
        {
            name: "address_details",
            label: "Address",
            options: {
                filter: true,
                sort: true,
                display: true,
                customBodyRender: (value) => {
                    if( value && value.address ){
                        return <Box> {value.address} </Box>
                    }else if( value && value.area_details ){
                        return <Box> {value.area_details.name}, {value.area_details.address} </Box>
                    }else{
                        return <Box> - </Box>
                    }
                }
            }        
        },
        {
            name: 'first_name',
            options: {
                display: false
            }
        },
        {
            name: 'middle_name',
            options: {
                display: false
            }
        },
        {
            name: 'last_name',
            options: {
                display: false
            }
        }
    ]);

    const handleClose = () => {
        setOpen(false);
    };

    const saveData = () => {
        props.addStudentDataToList(areaIndex, selectedStudents);
        handleClose();
    };


    const setOptionsForTable = () => {
        let newOptions = { ...options }
        newOptions['selectableRows'] = 'multiple'
        newOptions['customToolbarSelect'] = () => { 
            return<div className={"custom-toolbar-select-feature"}>
                <Tooltip title={"icon 2"}>
                    <IconButton >
                    </IconButton>
                </Tooltip>
            </div>
        }
        newOptions['onRowsClick'] = (data) => {
        }
        newOptions['onTableChange'] = (action, tableState) => {
            let selectedStudents = [];
            tableState.selectedRows.data.map((row)=> {
                selectedStudents.push(props.studentList[row['dataIndex']]);
            }) 
           setselectedStudents(selectedStudents);
        }
        newOptions['download'] = false;
        newOptions['print'] = false;
        newOptions['viewColumns'] = false;
        newOptions['filter'] = false;
        setOptions(newOptions);
    }

    const intialize = () => {
        setselectedStudents([]);
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
                <AppBar className={classes.appBar} style={{position: 'fixed'}}>
                    <Toolbar>
                        <IconButton edge="start" color="inherit" onClick={handleClose} aria-label="close">
                            <CloseIcon />
                        </IconButton>
                        <Typography variant="h6" className={classes.title}>
                            Assign Student To {areaName}
                    </Typography>
                        <Button autoFocus color="inherit" onClick={saveData}>
                            save
                        </Button>
                    </Toolbar>
                </AppBar>
                <Box className='student-route-table-popup'>
                    { props.studentList.length > 0  ? 
                        <AllMUIDataTable
                            key={props.studentList}
                            data={props.studentList}
                            columns={columns}
                            options={options}
                        />
                        :
                        <BlankPagewithIcon data="No Students found / All Students Mapped to Route" />
                    }
                </Box>
            </Dialog>
        </div>
    );
});

export default AssignStudentModal
