import React from 'react'
import {
    Box, CircularProgress, Dialog, AppBar, Toolbar, Slide, IconButton, Typography, DialogContent, DialogContentText
} from '@material-ui/core';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls';
import loadingBar from 'images/loading.gif';
import { withRouter } from 'react-router-dom';
import CloseIcon from '@material-ui/icons/Close';

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}
const exam_config = JSON.parse(localStorage.getItem('exam_configurations')) ? JSON.parse(localStorage.getItem('exam_configurations')) : {}
const is_cumulative = exam_config['cumulative_type'] == 1 ? true : false;


function AddTermDialogMarksCard(props) {

    const [openPopup, setOpenPopup] = React.useState(false);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        setOpenPopup(() => true)
    }, [props]);

    const handleClosePopup = () => {
        setOpenPopup(() => false)
    }

    return (
        <>
            <Dialog open={openPopup}
                className='action-basic-detail-width'
                onClose={handleClosePopup} aria-labelledby='form-dialog-title'>
                {/*
                 <AppBar >
                    <Toolbar>
                        <IconButton edge="start" color="inherit" onClick={handleClosePopup} aria-label="close">
                            <CloseIcon />
                            </IconButton>
                        <Typography variant="h6" >
                        Merge the subjects for same date
                        </Typography>
                        </Toolbar>
                    </AppBar> 
                */}
                <DialogContent className=''>
                    <div className='sub-heading'>
                        Add Term To Marks Card
                    </div>
                    {loading &&
                        <Box className='loading'>
                            <CircularProgress />
                        </Box>
                    }
                    {!loading &&
                        <div>

                        </div>
                    }
                </DialogContent>
            </Dialog>
        </>
    )
}

export default withRouter(AddTermDialogMarksCard)
