import React, { Component } from 'react'
import Divider from '@material-ui/core/Divider';
import { Paper, Grid, Dialog, AppBar, Toolbar, IconButton, Typography, Button, Slide } from '@material-ui/core'
import Box from '@material-ui/core/Box';
import classNames from "classnames";
import CloseIcon from '@material-ui/icons/Close';
import LoadingGif from 'Components/LoadingGif';
import ReactToPrint from 'react-to-print';
import GetAppRoundedIcon from '@material-ui/icons/GetAppRounded';

import './styles.scss';

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

class PrintForm extends Component {

    handleClose = () => {
        this.props.handleClosePopup()
    }

    render() {
        const { loading } = this.props;

        const { formDetails, heading } = this.props
        return (
            <Dialog fullScreen open={true} onClose={() => this.handleClose('close')} TransitionComponent={Transition}>
                <AppBar >
                    <Toolbar>
                        <IconButton edge="start" color="inherit" onClick={() => this.handleClose('close')} aria-label="close">
                            <CloseIcon />
                        </IconButton>
                        <Typography variant="h6" >
                            {heading}
                        </Typography>
                    </Toolbar>
                </AppBar>
                <Box className='print-paper'>
                    <Box className='end-flex-prop'>
                        <ReactToPrint
                            trigger={() =>
                                <Button variant='contained' color="secondary"
                                    className='submit print '>
                                    <GetAppRoundedIcon />Print
                              </Button>
                            }
                            content={() => this.componentRef}
                        />
                    </Box>
                    {loading &&
                        <Box>
                            <LoadingGif />
                        </Box>
                    }
                    {!loading &&
                        <Box className='listContent' ref={(el) => (this.componentRef = el)}>
                            {formDetails.map((data, index) => {
                                return <div key={index}>
                                    <Box className='print-form-sub-paper'>
                                        <Box className='form-left-heading margin-top-10'>
                                            {data.sub_heading}<br />
                                        </Box>
                                        <Grid container className='print-form-outer-box'>
                                            {data.data.map((data, index) => {
                                                return data.label &&
                                                    <Grid key={index} item md={data.md ? data.md : 6} xs={6}>
                                                        <Grid container className='print-form-label-value-outer-box'>
                                                            <Grid item md={6} xs={6} className='print-form-label-box break-word'>
                                                                {data.label}
                                                            </Grid>
                                                            <Grid md={6} xs={6} className={classNames(data.className, 'dataValue break-word')}>
                                                                {(!data.value) && <Box style={{ width: '40px' }}><hr /></Box>}
                                                                {data.value !== "" && data.value}
                                                            </Grid>
                                                        </Grid>
                                                    </Grid>
                                            })}
                                        </Grid>
                                    </Box>
                                </div>
                            })}
                        </Box>
                    }
                </Box>
            </Dialog>

        )
    }
}

export default PrintForm;