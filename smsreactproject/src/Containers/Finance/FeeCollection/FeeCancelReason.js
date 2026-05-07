


/* eslint-disable react/display-name */
import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Button, Box, Dialog,  DialogTitle, FormControl, TextareaAutosize, DialogActions,
    DialogContentText, DialogContent, FormHelperText, } from '@material-ui/core';
import Slide from '@material-ui/core/Slide';

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

const FeeCancelReason = forwardRef((props, ref) => {

    const [reason, setReason] = React.useState('');
    const [errors, setErrors] = React.useState({});

    const onChange = (e) => {
        let { value } = e.target;
        delete errors.reason
        setReason(()=> value)
        setErrors(()=> errors)
    }

    return (
        <div>
            <Dialog className='schedule-reject-popup' open={true} 
            // onClose={props.handleReasonClose}
             aria-labelledby="form-dialog-title">
          <DialogTitle id="form-dialog-title"></DialogTitle>
          <DialogContent>
            <DialogContentText>
              Please Enter Cancel Receipt Reason
            </DialogContentText>
            <FormControl
              fullWidth
              error={errors.reason && (errors.reason ? true : false)}
            >
              <Box className='leave-pending-staff-label'>Reason</Box>
              <TextareaAutosize aria-label="minimum height"
                className='apply-leave-text-area-auto-size-reason'
                value={reason}
                name='reason'
                onChange={onChange}
                required
              />
              {errors.reason &&
                <FormHelperText>{errors.reason}</FormHelperText>
              }
            </FormControl>
            <div className='text-red mt-10'>
              {props.delError}
            </div>
          </DialogContent>
          <DialogActions>
            <Button color="secondary text-bold" disabled={reason?false:true} style={{ textTransform: 'capitalize' }} onClick={()=>props.deleteReciept(reason)}>
              Cancel Receipt
            </Button>
            <Button color='secondary' style={{ textTransform: "uppercase" }} onClick={props.handleReasonClose}>
              close
            </Button>
          </DialogActions>
        </Dialog>
        </div>
    );
});

export default FeeCancelReason
