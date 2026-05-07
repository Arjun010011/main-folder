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
import { timeFormat, isUserHasPermission } from 'Includes/functions';
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


class ViewIndividualRoomStrength extends Component {

    constructor(props) {
        super(props)

        this.state = {
            building_details: [],
            largeImagePreview: '',
            loading: true,
            roomId: '',
            shift_schedules: []
        }
    }


    componentDidMount = () => {
        this.getRoomStrengthDetails();
    }

    getRoomStrengthDetails = () => {
        if (this.props.location.state) {
            const id = this.props.location.state.detail;
            const url = GET_URL.room.api + id + '/';
            getRequest(url, {}, this.props).then(response => {
                if (response && response.status === 200) {
                    this.setState({
                        roomDetails: response.data.data,
                        pageLoading: false,
                        roomId: id,
                        selectedFloor: this.props.location.state.selectedFloor,
                        selectedBuilding: this.props.location.state.selectedBuilding
                    }, () => {
                        this.updateRoomDetailsView();
                    })
                }
            })
        }
        else {
            this.props.history.push(
                Actions.room_strength.view.url)
        }
    }

    updateRoomDetailsView = () => {
        let { roomDetails } = this.state;
        let building_details = []
        let shift = {
            'sub_heading': '',
            'data': [{ label: 'Room Name', value: roomDetails['name'] }, { label: 'Room Strength', value: roomDetails['strength'] },
            { label: 'Building Name', value: roomDetails['building_name'] }, { label: 'Floor Name', value: roomDetails['floor_name'] },
            { label: 'Description', value: roomDetails['description'] },

            ]
        };
        building_details.push(shift);


        let schedule = {}

        schedule = {
            'sub_heading': `Images`,
            'data': []
        }
        roomDetails.roomdocument_room.map((data, index) => {
            schedule.data.push({ type: 'image', label: `${index + 1}.`, value: data['description'] })
        })
        building_details.push(schedule)

        roomDetails.roomassetmapping_room.map((data, index) => {
            schedule = {
                'sub_heading': index === 0 ? `Asset List` : '',
                'data': []
            }
            schedule.data.push({ label: 'Asset Name', value: data['asset_name'] }, { label: 'Number of Asset', value: data['number_of_assets'] },)
            building_details.push(schedule)
        })
        this.setState({
            building_details,
            loading: false
        })

    }



    handleCloseLargeImage = () => {
        this.setState({
            largeImagePreview: ''
        })
    }

    handleEdit = () => {
        let { roomId } = this.state;
        this.props.history.push({
            pathname: Actions.room_strength.update.url,
            state: { detail: roomId }
        })
    }

    handleLargePreview = (image) => {
        this.setState({
            largeImagePreview: image
        })
    }

    goToViewPage = () => {
        let { selectedBuilding, selectedFloor } = this.state;
        let roomInformation = {
            selectedBuilding: selectedBuilding,
            selectedFloor: selectedFloor,
        }
        let searchParam = "?" + new URLSearchParams(roomInformation).toString()
        this.props.history.push({
            pathname: Actions.room_strength.view.url,
            search: searchParam,
        });
    }


    render() {
        let { building_details, loading, largeImagePreview } = this.state;
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
                    {largeImagePreview &&
                        <Box className='set-question-large-image-preview-box'>
                            <img src={largeImagePreview} alt='Image Preview' className='set-question-large-image-preview' />
                            <Tooltip title='Close Image' placement='top-start'>
                                <Box className='set-question-large-image-remove-icon-box'
                                    onClick={this.handleCloseLargeImage}>
                                    <HighlightOffIcon className='set-question-large-image-remove-icon' />
                                </Box>
                            </Tooltip>
                        </Box>
                    }
                    <Grid container>
                        <Grid item md={8} xs={12} className='header-align'>
                            <Box className='heading'>
                                View Details Of Room Strength
                            </Box>
                        </Grid>
                        <Grid item md={4} xs={12} >
                            <Box className='header-align end-flex-prop'>
                                {isUserHasPermission('room_strength', 'view') &&
                                    <Button
                                        variant="contained"
                                        onClick={this.goToViewPage}
                                        className='editbutton-view'
                                    ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.room_strength.view.label}</Button>
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
                                                <Grid item md={12} xs={12}>
                                                    <Box className='form-left-heading'>{headingData.sub_heading}</Box>
                                                </Grid>
                                            }
                                            {headingData.data.map((data, index) => {
                                                return (
                                                    <>
                                                        {data.type !== 'image' &&
                                                            <Grid item md={6} xs={12} sm={12} key={index} className={classes.header}>
                                                                <Box className='dataLabel break-word'>{data.label}</Box>
                                                                {(!data.value && data !== false) && <Box className={classes.studentValueEmpty}><hr /></Box>}
                                                                {(data.value !== "") &&
                                                                    <Box className={data.className ? data.className : 'view-expenses-data-value break-word'}>{data.value}</Box>
                                                                }
                                                            </Grid>
                                                        }
                                                        {data.type == 'image' &&
                                                            <Box className='room-preview-outer-box'>
                                                                <Box>{data.label}</Box>
                                                                <Tooltip title='Preview Image' placement='top-start'>
                                                                    <img src={data.value} alt='image' className='room-view-uploaded-image' />
                                                                </Tooltip>
                                                                <Box onClick={() => this.handleLargePreview(data.value)} className='room-view-image-preview-icon'><VisibilityOutlinedIcon /> </Box>
                                                            </Box>
                                                        }
                                                    </>
                                                )
                                            })
                                            }
                                        </Grid>
                                    </Grid>
                                )
                            })
                            }
                        </Grid>
                        {isUserHasPermission('room_strength', 'edit') &&
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

export default withRouter(withStyles(Styles)(ViewIndividualRoomStrength));