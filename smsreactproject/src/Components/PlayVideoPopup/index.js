import React, { useState, useEffect, useImperativeHandle } from 'react'
import {
    Box, Dialog, DialogActions, Button, IconButton, Typography, Slide,
} from '@material-ui/core';
import ReactPlayer from 'react-player'
import CloseIcon from '@material-ui/icons/Close';
import { withRouter } from 'react-router-dom';

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const PlayVideoPopup = React.forwardRef((props, ref) => {

    const { isOpen, videoUrl } = props

    const [openDialog, set_openDialog] = useState(false)
    const [playing, set_playing] = useState(false)
    const reactPlayer = React.useRef(null);


    React.useEffect(() => {
        if (isOpen) {
            set_openDialog(true)
        }
    }, [isOpen]);



    const handleDialogClose = () => {
        set_openDialog(() => false)
        props.handleCloseVideo()
    }

    return (
        <Dialog
            open={openDialog} onClose={handleDialogClose} TransitionComponent={Transition}>
            <Box className='exam-optional-grid-container p-20px'>
                <ReactPlayer
                    ref={reactPlayer}
                    url={videoUrl}
                    width='100%'
                    height='100%'
                    controls={true}
                    playing={playing}
                    onReady={() => set_playing(() => true)}
                    config={{
                        file: {
                            attributes: {
                                controlsList: 'nodownload',
                                onContextMenu: e => e.preventDefault()
                            }
                        }
                    }}
                />
            </Box>
            <DialogActions>
                <Button onClick={handleDialogClose} color='secondary'>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    )
}
)
export default withRouter(PlayVideoPopup)