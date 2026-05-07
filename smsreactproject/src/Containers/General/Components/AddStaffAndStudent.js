import React, { Component } from 'react'
import { Grid, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Paper, Box, withStyles, CircularProgress } from '@material-ui/core/';
import bgImage from 'images/backgroundSchoolView.png'
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Link } from 'react-router-dom';
import AllMUIDataTable from 'Components/AllMUIDataTable';



const ITEM_HEIGHT = 100;

const Styles = theme => ({
    heading: {
        fontWeight: 'bold',
        fontSize: '35px',
        lineHeight: '40px',
        color: '#000000',
    },
    background: {
        backgroundImage: `url(${bgImage})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "106%",
        minHeight: '100vh',
        marginBottom: '20px',

    },
    subHeading: {
        fontFamily: 'Roboto',
        fontStyle: 'normal',
        fontWeight: 'normal',
        fontSize: '18px',
        lineHeight: '24px',
        color: '#37474F',
    },
    addDetails: {
        marginTop: '20px',
        marginBottom: '20px',
        fontWeight: '500',
        fontSize: '16px',
        height: '47px',
        lineHeight: '14px',
        color: '#FFFFFF',
        textTransform: 'none',
        borderRadius: '20px',
        backgroundColor: '#1665D8',
        '&:hover': {
            backgroundColor: '#0043a3'
        }
    },
    leaveBackGround: {
        width: '100%'
    },
    loading: {
        marginRight: 'auto',
        marginLeft: 'auto',
        marginTop: '35vh',
        width: '20vh'
    },
    add: {
        fontWeight: '500',
        fontSize: '16px',
        color: '#FFFFFF',
        borderRadius: '10px!important',
        backgroundColor: '#1665D8!important',
        textTransform: 'none',
        marginBottom: '20px'
    }


})

class AddStaffAndStudent extends Component {
    constructor(props) {
        super(props)
        this.state = {
            open: false,
            loading: false,
            title: '',
            errors: {},
            loadingData: false,
            staffIndexTemp: [],
            studentIndexTemp: [],
            columns: [],
            staffColumns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: true,
                        sort: true,
                        display: false
                    }
                },
                {
                    name: "Serial Number",
                    label: "SL No",
                    options: {
                        filter: true,
                        sort: true,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                tableMeta.rowIndex + 1

                            )
                        }
                    }
                },
                {
                    name: "first_name",
                    label: "Full Name",
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                {tableMeta.rowData[2]} {tableMeta.rowData[3]} {tableMeta.rowData[4]}
                            </div>)

                        },
                    }
                },
                {
                    name: "middle_name",
                    label: "Country Code",
                    options: {
                        filter: true,
                        sort: true,
                        display: false
                    }
                },

                {
                    name: "last_name",
                    label: "last_name",
                    options: {
                        filter: true,
                        sort: true,
                        display: false
                    }
                },
                {
                    name: "mobile_num",
                    label: "Mobile Number",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
            ],
            studentColumns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: true,
                        sort: true,
                        display: false
                    }
                },
                {
                    name: "Serial Number",
                    label: "SL No",
                    options: {
                        filter: true,
                        sort: true,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                tableMeta.rowIndex + 1

                            )
                        }
                    }
                },
                {
                    name: "first_name",
                    label: "Full Name",
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                {tableMeta.rowData[2]} {tableMeta.rowData[3]} {tableMeta.rowData[4]}
                            </div>)

                        },
                    }
                },
                {
                    name: "middle_name",
                    label: "middle_name",
                    options: {
                        filter: true,
                        sort: true,
                        display: false
                    }
                },

                {
                    name: "last_name",
                    label: "last_name",
                    options: {
                        filter: true,
                        sort: true,
                        display: false
                    }
                },
                {
                    name: "mobile_num",
                    label: "Mobile Number",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
            ]
        }
    }
    options = {
        filterType: "dropdown",
        responsive: "scroll",
        filter: true,
        download: false,
        print: false,
        viewColumns: false,
        rowsPerPageOptions: [5, 10, 15],
        rowsPerPage: 5,
        customToolbarSelect: () => { },
        isRowSelectable:  (data) => {
            let { title } = this.state
            let result=true
            if (title === 'Staff') {
                 this.props.staffIndex.map(async (temp) => {
                    if (data === temp.dataIndex) {
                        result=false
                    }
                })
            }
            else if (title === 'Student') {
                this.props.studentIndex.map(async (temp) => {
                    if (data === temp.dataIndex) {
                        result=false
                    }
                })
            }
            return result
        },
        onTableChange: (action, tableState) => {
            if (action === 'rowsSelect') {
                let { errors, title } = this.state
                delete errors['staffNotSelected']
                if (title === 'Staff') {
                    this.setState({
                        staffIndexTemp: tableState.selectedRows.data,
                        errors,
                    })
                }
                else if (title === 'Student') {
                    this.setState({
                        studentIndexTemp: tableState.selectedRows.data,
                        errors,
                    })
                }
            }
        },

    };


    getDetails = async (name) => {
        const { staffColumns, studentColumns } = this.state
        const { staffList, studentList } = this.props
        this.setState({ loadingData: true })
        if (name === 'staff') {
            this.setState({
                dataList: staffList,
                columns: staffColumns,
                title: 'Staff',
                loadingData: false
            })
        }
        else if (name === 'student') {
            this.setState({
                dataList: studentList,
                columns: studentColumns,
                title: 'Student',
                loadingData: false
            })
        }
        this.setState({
            open: true
        })
    }

    handleClose = () => {
        let { title, staffIndexTemp, studentIndexTemp } = this.state
        if (title === 'Staff') {
            this.props.updateSelectedOrganizer(title, staffIndexTemp)
            this.setState({
                staffIndexTemp:[]
            })
        }
        else if (title === 'Student') {
            this.props.updateSelectedOrganizer(title, studentIndexTemp)
            this.setState({
                studentIndexTemp:[]
            })
        }
        this.setState({ open: false })
    }

    handleCloseAndDelete = () => {
        this.setState({
            open: false
        })
    }
    render() {
        const { classes,addStaffAndStudent } = this.props
        const { loadingData, open, title, dataList } = this.state
        return (
            <div>
                <Box>
                    <Grid container>
                        <Grid item md={6} style={{display:'flex',justifyContent:'center'}}>
                            <Box display='flex'>
                                <Button
                                    variant="contained" p={1}
                                    className={classes.add}
                                    onClick={() => this.getDetails('staff')}
                                ><AddCircleOutlineOutlinedIcon style={{ marginRight: '10px', fontSize: '25px' }} /> Add Staff</Button>
                            </Box>
                        </Grid>
                        <Grid item md={6} style={{display:'flex',justifyContent:'center'}}>
                            <Box display='flex'>
                                <Button
                                    variant="contained" p={1}
                                    className={classes.add}
                                    onClick={() => this.getDetails('student')}
                                ><AddCircleOutlineOutlinedIcon style={{ marginRight: '10px', fontSize: '25px' }} /> Add Student</Button>
                            </Box>
                        </Grid>
                    </Grid>
                    <Paper  >
                        <Dialog open={open} 
                        className={addStaffAndStudent}
                        // onClose={this.handleCloseAndDelete} 
                        aria-labelledby="form-dialog-title">
                            <DialogTitle id="form-dialog-title"></DialogTitle>
                            <DialogContent>
                                <Grid container style={{ display: 'flex', justifyContent: 'center' }}>
                                    <Grid item md={12} xs={12}>
                                        <AllMUIDataTable
                                            key={dataList}
                                            title={loadingData ? <CircularProgress style={{ color: '#ffffff' }} /> : `${title} List`}
                                            data={dataList}
                                            columns={this.state.columns}
                                            options={this.options}
                                        />
                                    </Grid>
                                </Grid>
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={this.handleClose} color="primary">
                                    Apply
                                </Button>
                                <Button onClick={this.handleCloseAndDelete} color="primary">
                                    Close
                                </Button>
                            </DialogActions>
                        </Dialog>
                    </Paper>
                </Box>
            </div>
        )
    }
}


export default withStyles(Styles)(AddStaffAndStudent)