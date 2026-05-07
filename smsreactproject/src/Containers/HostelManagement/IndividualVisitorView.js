import React, { Component } from 'react'
import { withRouter } from 'react-router-dom';
import { Paper, Grid, Button, Tooltip, withStyles } from '@material-ui/core'
import Box from '@material-ui/core/Box';
import classNames from "classnames";
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link } from 'react-router-dom';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import EditTwoToneIcon from '@material-ui/icons/EditTwoTone';

import loadingBar from 'images/loading.gif'
import { getRequest, } from 'Includes/api/apicall';
import { GET_URL, } from 'Includes/urls';
import { timeFormat, isUserHasPermission, dateFormat } from 'Includes/functions';
import { Actions } from 'Constants/permissions';
import { image_formats } from 'Containers/Expenses/Constants';



const Styles = theme => ({

    studentLabel: {
        color: '#00000',
        fontSize: '12px',
        lineHeight: '23px',
        padding: '5px',
        wordBreak: 'break-word',

    },
    studentValue: {
        color: '#00000',
        fontSize: '16px',
        lineHeight: '25px',
        padding: '5px',
        textTransform: 'capitalize',
        wordBreak: 'break-word',

    },
    studentValueEmpty: {
        padding: '5px',
        width: '40px'
    },
    header: {
        padding: '10px 25px',
    },
    innerBorder: {
        width: '2px',
        height: '80%',
        background: '#E4E7EB',
        // marginLeft: 'auto',
        marginRight: '5%',
    },
    displayFlex: {
        display: 'flex',
        padding: '5px 5px'
    },
})


class IndividualVisitorView extends Component {

    constructor(props) {
        super(props)

        this.state = {
            building_details: [],
            largeImagePreview: '',
            loading: true,
            buildingId: '',
            shift_schedules: []
        }
    }


    componentDidMount = () => {
        this.getVisitorDetails();
    }

    getVisitorDetails = () => {
        if (this.props.location.state) {
            const id = this.props.location.state.detail;
            const url = GET_URL.visitor.api + id + '/';
            getRequest(url, {}, this.props).then(response => {
                if (response && response.status === 200) {
                    this.setState({
                        visitorDetails: response.data.data,
                        pageLoading: false,
                        buildingId: id
                    }, () => {
                        this.updateExpenseView();
                    })
                }
            })
        }
        else {
            this.props.history.push(Actions.manage_shift_types.view.url)
        }
    }

    updateExpenseView = () => {
        let { visitorDetails } = this.state;
        let building_details = []
        let details = visitorDetails['allocation_details'] ? visitorDetails['allocation_details'] : { staff_details: {}, student_details: {}}
        let shift = {
            'sub_heading': '',
            'data': [{ label: 'Visitor Name', value: visitorDetails['name'] }, {
                label: 'Building Name',
                value: details['building_name']
            },
            { label: 'Floor (Room)', value: details['floor_name'] && `${details['floor_name']} (${details['room_name']})` },
            {
                label: 'Visiting To', value: details['staff'] ? details['staff_details']['full_name'] :
                    details['student_details']['name']
            }, { label: 'Check In', value: dateFormat(visitorDetails['checkin'], 'DD-MM-YYYY hh:mm A') },
            { label: 'Check Out', value: dateFormat(visitorDetails['checkout'], 'DD-MM-YYYY hh:mm A') },
            { label: 'Reason', value: visitorDetails['reason'], md: 12 }
            ]
        };
        building_details.push(shift);

        this.setState({
            building_details,
            loading: false
        })

    }

    handleViewImage = (image) => {
        let file_extension = `${image.slice((Math.max(0, image.lastIndexOf(".")) || Infinity) + 1)}`;
        if (image_formats.includes(file_extension)) {
            this.setState({
                largeImagePreview: image
            })
        }
        else {
            window.open(image);
        }
    }


    handleCloseLargeImage = () => {
        this.setState({
            largeImagePreview: ''
        })
    }

    handleEdit = () => {
        let { buildingId } = this.state;
        this.props.history.push({
            pathname: Actions.hostel_visitor.update.url,
            state: { detail: buildingId }
        })
    }

    render() {
        let { building_details, loading } = this.state;
        let { classes } = this.props;
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <Paper className='paper-background'>
                    <Grid container>
                        <Grid item md={8} xs={12} className='header-align'>
                            <Box className='heading'>
                                View Details Of Visitor
                            </Box>
                        </Grid>
                        <Grid item md={4} xs={12} >
                            <Box className='header-align end-flex-prop'>
                                {isUserHasPermission('hostel_visitor', 'view') &&
                                    <Button
                                        variant="contained"
                                        component={Link} to={Actions.hostel_visitor.view.url}
                                        className='editbutton-view'
                                    ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.hostel_visitor.view.label}</Button>
                                }
                            </Box>
                        </Grid>
                    </Grid>
                    <Paper className='header-align expense-individual-paper-background'>
                        <Grid container className='margin-top-30'>
                            {building_details.map((headingData, index) => {
                                return (
                                    <Grid item md={12} xs={12} sm={12} key={index} className={classes.displayFlex}>
                                        <Grid container>
                                            {headingData.sub_heading &&
                                                <Box className='form-left-heading'>{headingData.sub_heading}</Box>
                                            }
                                            {headingData.data.map((data, index) => {
                                                return (
                                                    <Grid item md={data.md ? data.md : 6} xs={12} sm={12} key={index} className={classes.header}>
                                                        <Box className='dataLabel break-word'>{data.label}</Box>
                                                        {(!data.value && data !== false) && <Box className={classes.studentValueEmpty}><hr /></Box>}
                                                        {(data.value !== "") &&
                                                            <Box className={data.className ? data.className : 'view-expenses-data-value break-word'}>{data.value}</Box>
                                                        }
                                                    </Grid>
                                                )
                                            })
                                            }
                                        </Grid>
                                    </Grid>
                                )
                            })
                            }
                        </Grid>
                        {isUserHasPermission('hostel_visitor', 'edit') &&
                            <Tooltip title='Edit' placement='top-start'>
                                <Box className='expense-individual-view-edit'>
                                    <EditTwoToneIcon onClick={this.handleEdit} className='expense-individual-edit-icon' />
                                </Box>
                            </Tooltip>
                        }
                    </Paper>
                </Paper>
            )
        }
    }
}

export default withRouter(withStyles(Styles)(IndividualVisitorView));