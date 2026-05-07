import React, { Component } from 'react'
import PropTypes from 'prop-types';
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, Grid, CircularProgress, withStyles,
    ListItemIcon, MenuItem, Menu, ListItemText, Paper, Slide, AppBar, Tabs, Tab, Typography
} from '@material-ui/core';
import CloseRoundedIcon from '@material-ui/icons/CloseRounded';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
import { Prompt } from 'react-router'

import { Alert } from 'Includes/functions';
import TabVideoInformation from 'Containers/VideoTutorials/Components/TabVideoInformation';
import TabSetQuestions from 'Containers/VideoTutorials/Components/TabSetQuestions';

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});



function TabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`nav-tabpanel-${index}`}
            aria-labelledby={`nav-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box p={3}>
                    <Typography>{children}</Typography>
                </Box>
            )}
        </div>
    );
}

TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.any.isRequired,
    value: PropTypes.any.isRequired,
};

function a11yProps(index) {
    return {
        id: `nav-tab-${index}`,
        'aria-controls': `nav-tabpanel-${index}`,
    };
}


export default class QuestionSetVideo extends Component {
    constructor(props) {
        super(props)

        this.state = {
            open: false,
            tabValue: 0,
            isPrompt: false,
            openSnackBar: false
        }
    }

    handleOpen = () => {
        this.setState({
            open: true
        })
    }

    handleClose = () => {
        this.setState({
            open: false
        })
    }

    handleChange = (event, newValue) => {
        this.setState({
            tabValue: newValue
        })
    };

    handleCloseSnackBar = () => {
        this.setState({
            openSnackBar: false
        })
    }

    render() {
        const { open, tabValue, alertData, isPrompt, openSnackBar } = this.state;
        return (
            <div>
                <Dialog fullScreen open={open} onClose={this.handleClose} TransitionComponent={Transition}>
                    <Paper className='paper-video-list-background'>
                        <Box className='video-list-close-icon-box'>
                            <CloseRoundedIcon onClick={this.handleClose} className='view-details-close-icon' />
                        </Box>
                        <AppBar position="static" className='app-bar-heading'>
                            <Tabs value={tabValue} variant='fullWidth' aria-selected='false' onChange={this.handleChange}
                                backgroundColor="#ffffff" indicatorColor="transparent"
                                className='md-up-justify-space-between'>
                                <Tab classes='' icon={
                                    <Box display="flex" width="100%">
                                        <Box className='form-number-heading'>1</Box>
                                        <Box className="tabs-heading" >
                                            <span>Set Questions</span>
                                        </Box>
                                    </Box>}
                                    style={this.state.studentError ? { color: 'red' } : {}} {...a11yProps(3)} >
                                </Tab>
                                <Tab classes={{ root: 'form-tab' }} icon={
                                    <Box display="flex" width="100%">
                                        <Box className='form-number-heading'>3</Box>
                                        <div className="tabs-heading">
                                            <span>Review and Submit</span>
                                        </div>
                                    </Box>}
                                    {...a11yProps(5)} />
                            </Tabs>
                        </AppBar>


                        <TabPanel value={tabValue} index={0}>
                            <TabVideoInformation

                            />
                        </TabPanel>

                        <TabPanel value={tabValue} index={1}>
                            <TabSetQuestions

                            />
                        </TabPanel>

                        <Box display='flex' justifyContent='flex-end' mr={3} onClick={this.scrollTop}>
                            <Box marginRight='10px' display={tabValue === 1 ? '' : 'none'} onClick={tabValue === 1 ? (e) => this.handleChange(e, 0) : ''}>
                                <Button className='form-next-pre-button'>Previous</Button>
                            </Box>
                            <Box display={tabValue === 2 ? 'none' : 'flex'} onClick={tabValue === 0 ? (e) => this.handleChange(e, 1) : (e) => this.handleChange(e, 2)}>
                                <Button className='form-next-pre-button' ml={2}> Next </Button>
                            </Box>
                        </Box>
                        <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={openSnackBar} autoHideDuration={2000} onClose={this.handleCloseSnackBar}>
                            <Alert onClose={this.handleCloseSnackBar} severity="error">
                                {alertData}
                            </Alert>
                        </Snackbar>
                        <Prompt
                            when={isPrompt}
                            message='Set Question is not submitted, Are you sure to exit ?'
                        />
                    </Paper>
                </Dialog>
            </div>
        )
    }
}
